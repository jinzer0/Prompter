import {
  exactNotarizationObject,
  failNotarization,
  isNotarizationError,
  notarizationSignal,
  notarizationSubmissionId,
  notaryProfile,
  staplingArtifact,
  submissionArtifactKind,
} from "./notarization-contract.mjs"
import { hasSafeNotarizationIssues } from "./notarization-evidence.mjs"

const appleCommandTimeoutMs = 10 * 60 * 1000
const retryDelaysMs = [0, 100, 250]
const xcrunCommand = "/usr/bin/xcrun"
const spctlCommand = "/usr/sbin/spctl"

function json(output, label) {
  if (typeof output !== "string" || output.trim() === "") {
    failNotarization(`Invalid ${label}`)
  }
  let value
  try {
    value = JSON.parse(output)
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    failNotarization(`Invalid ${label}`)
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    failNotarization(`Invalid ${label}`)
  }
  return value
}

function api(payload) {
  if (typeof payload.statusCode === "number" && payload.statusCode >= 400) {
    failNotarization("Notarization service rejected the request")
  }
  if (Object.hasOwn(payload, "error")) {
    failNotarization("Notarization service rejected the request")
  }
}

function submission(payload) {
  api(payload)
  if (typeof payload.status !== "string") {
    failNotarization("Invalid notarization submission")
  }
  return {
    submissionId: notarizationSubmissionId(payload.id ?? payload.submissionId),
    status: payload.status,
  }
}

function commandError() {
  failNotarization("Notarization command failed")
}

function timeoutId(error) {
  for (const output of [error?.stdout, error?.result?.stdout]) {
    try {
      return submission(json(output, "notarization submission")).submissionId
    } catch (caught) {
      if (!isNotarizationError(caught)) throw caught
    }
  }
  return undefined
}

function reviewedLog(payload, submissionId) {
  api(payload)
  const issues = payload.issues === null ? [] : payload.issues
  if (
    Array.isArray(issues) &&
    issues.some((issue) => issue?.severity === "warning" || issue?.severity === "error")
  ) {
    failNotarization("Invalid notarization log", true)
  }
  if (!hasSafeNotarizationIssues(issues)) {
    failNotarization("Invalid notarization log")
  }
  return {
    submissionId,
    issues: issues.map((issue) => ({ severity: issue.severity })),
  }
}

export function createNotarizationClient(options) {
  const fields = Object.hasOwn(options ?? {}, "signal") ? ["runFile", "signal"] : ["runFile"]
  const value = exactNotarizationObject(options, fields, "Invalid notarization options")
  if (typeof value.runFile !== "function") failNotarization("Invalid notarization options")
  const abortSignal = notarizationSignal(value.signal)
  const commandOptions = {
    timeoutMs: appleCommandTimeoutMs,
    ...(abortSignal === undefined ? {} : { signal: abortSignal }),
  }

  async function command(args, label) {
    try {
      const result = await value.runFile(xcrunCommand, args, commandOptions)
      return json(result?.stdout, label)
    } catch (error) {
      if (isNotarizationError(error)) throw error
      commandError()
    }
  }

  return Object.freeze({
    async preflight(profileValue) {
      const profile = notaryProfile(profileValue)
      api(
        await command(
          ["notarytool", "history", "--keychain-profile", profile, "--output-format", "json"],
          "notarization profile response",
        ),
      )
      return { status: "ready" }
    },
    async fetchLog(optionsValue) {
      const logOptions = exactNotarizationObject(
        optionsValue,
        ["submissionId", "profile"],
        "Invalid notarization options",
      )
      const submissionId = notarizationSubmissionId(logOptions.submissionId)
      const profile = notaryProfile(logOptions.profile)
      return reviewedLog(
        await command(
          [
            "notarytool",
            "log",
            submissionId,
            "--keychain-profile",
            profile,
            "--output-format",
            "json",
          ],
          "notarization log",
        ),
        submissionId,
      )
    },
    async info(optionsValue) {
      const infoOptions = exactNotarizationObject(
        optionsValue,
        ["submissionId", "profile"],
        "Invalid notarization options",
      )
      const submissionId = notarizationSubmissionId(infoOptions.submissionId)
      const profile = notaryProfile(infoOptions.profile)
      const result = submission(
        await command(
          [
            "notarytool",
            "info",
            submissionId,
            "--keychain-profile",
            profile,
            "--output-format",
            "json",
          ],
          "notarization info",
        ),
      )
      if (result.submissionId !== submissionId) {
        failNotarization("Invalid notarization submission")
      }
      return result.status
    },
    async submit(optionsValue) {
      const submitOptions = exactNotarizationObject(
        optionsValue,
        ["artifactPath", "profile"],
        "Invalid notarization options",
      )
      submissionArtifactKind(submitOptions.artifactPath)
      const profile = notaryProfile(submitOptions.profile)
      try {
        const response = await value.runFile(
          xcrunCommand,
          [
            "notarytool",
            "submit",
            submitOptions.artifactPath,
            "--keychain-profile",
            profile,
            "--wait",
            "--output-format",
            "json",
          ],
          commandOptions,
        )
        return submission(json(response?.stdout, "notarization submission"))
      } catch (error) {
        if (isNotarizationError(error)) throw error
        const timedOut = error?.code === "ETIMEDOUT" || error?.name === "AbortError"
        const submissionId = timedOut ? timeoutId(error) : undefined
        if (submissionId !== undefined) return { submissionId, status: "unknown" }
        commandError()
      }
    },
    async staple(optionsValue) {
      const stapleOptions = exactNotarizationObject(
        optionsValue,
        ["artifactPath", "artifactKind"],
        "Invalid notarization options",
      )
      staplingArtifact(stapleOptions.artifactPath, stapleOptions.artifactKind)
      for (const [attempt, delay] of retryDelaysMs.entries()) {
        if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))
        try {
          await value.runFile(
            xcrunCommand,
            ["stapler", "staple", stapleOptions.artifactPath],
            commandOptions,
          )
          await value.runFile(
            xcrunCommand,
            ["stapler", "validate", stapleOptions.artifactPath],
            commandOptions,
          )
          return { status: "stapled", attempts: attempt + 1 }
        } catch {
          if (attempt === retryDelaysMs.length - 1) commandError()
        }
      }
    },
    async assess(optionsValue) {
      const assessment = exactNotarizationObject(
        optionsValue,
        ["artifactPath", "artifactKind"],
        "Invalid notarization options",
      )
      staplingArtifact(assessment.artifactPath, assessment.artifactKind)
      try {
        await value.runFile(
          spctlCommand,
          [
            "--assess",
            "--type",
            assessment.artifactKind === "app" ? "execute" : "open",
            ...(assessment.artifactKind === "dmg"
              ? ["--context", "context:primary-signature"]
              : []),
            "--verbose=4",
            assessment.artifactPath,
          ],
          commandOptions,
        )
      } catch {
        commandError()
      }
      return { status: "accepted" }
    },
  })
}
