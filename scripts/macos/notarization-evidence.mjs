import { createHash } from "node:crypto"
import { createReadStream } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

import {
  evidenceDirectory,
  exactNotarizationObject,
  failNotarization,
  isNotarizationError,
  notarizationLogPath,
  notarizationSubmissionId,
  submissionArtifactKind,
  validArtifactIdentity,
} from "./notarization-contract.mjs"

const resumeFileName = "notarization-resume.json"

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

function resume(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    failNotarization("Invalid resume state")
  }
  const fields =
    value.status === "unknown"
      ? ["submissionId", "status", "artifactKind", "artifactSha256"]
      : ["submissionId", "status", "logPath", "artifactKind", "artifactSha256"]
  if (
    !["unknown", "Accepted"].includes(value.status) ||
    Reflect.ownKeys(value).length !== fields.length ||
    fields.some((field) => !Object.hasOwn(value, field))
  ) {
    failNotarization("Invalid resume state")
  }
  const submissionId = notarizationSubmissionId(value.submissionId)
  const artifactIdentity = {
    artifactKind: value.artifactKind,
    artifactSha256: value.artifactSha256,
  }
  if (!validArtifactIdentity(artifactIdentity)) failNotarization("Invalid resume state")
  if (value.status === "Accepted" && value.logPath !== notarizationLogPath(submissionId)) {
    failNotarization("Invalid resume state")
  }
  return value.status === "Accepted"
    ? {
        submissionId,
        status: "Accepted",
        logPath: value.logPath,
        ...artifactIdentity,
      }
    : { submissionId, status: "unknown", ...artifactIdentity }
}

async function save(evidenceDir, fileName, value) {
  await mkdir(evidenceDir, { recursive: true })
  await writeFile(join(evidenceDir, fileName), `${JSON.stringify(value)}\n`)
}

export async function identifyNotarizationArtifact(value) {
  const artifactKind = submissionArtifactKind(value)
  try {
    const hash = createHash("sha256")
    for await (const chunk of createReadStream(value)) hash.update(chunk)
    return { artifactKind, artifactSha256: hash.digest("hex") }
  } catch {
    failNotarization("Unsupported notarization artifact")
  }
}

export function createNotarizationEvidence(options) {
  const value = exactNotarizationObject(
    options,
    ["evidenceDir", "artifactIdentity"],
    "Invalid notarization evidence",
  )
  const evidenceDir = evidenceDirectory(value.evidenceDir)
  if (!validArtifactIdentity(value.artifactIdentity)) {
    failNotarization("Invalid notarization evidence")
  }
  const artifactIdentity = { ...value.artifactIdentity }

  return Object.freeze({
    artifactIdentity,
    async readResume() {
      try {
        return resume(
          json(await readFile(join(evidenceDir, resumeFileName), "utf8"), "resume state"),
        )
      } catch (error) {
        if (error?.code === "ENOENT") return undefined
        if (isNotarizationError(error)) throw error
        failNotarization("Invalid resume state")
      }
    },
    matchesArtifact(saved) {
      return (
        saved.artifactKind === artifactIdentity.artifactKind &&
        saved.artifactSha256 === artifactIdentity.artifactSha256
      )
    },
    async hasSavedLog(saved) {
      try {
        const receipt = json(
          await readFile(join(evidenceDir, saved.logPath), "utf8"),
          "notarization log receipt",
        )
        return (
          Reflect.ownKeys(receipt).length === 4 &&
          notarizationSubmissionId(receipt.submissionId) === saved.submissionId &&
          receipt.artifactKind === saved.artifactKind &&
          receipt.artifactSha256 === saved.artifactSha256 &&
          Array.isArray(receipt.issues) &&
          receipt.issues.every(
            (issue) =>
              issue &&
              Object.hasOwn(issue, "severity") &&
              typeof issue.severity === "string" &&
              !["warning", "error"].includes(issue.severity) &&
              Reflect.ownKeys(issue).length === 1,
          )
        )
      } catch {
        return false
      }
    },
    async saveAccepted(submissionIdValue, issues) {
      const submissionId = notarizationSubmissionId(submissionIdValue)
      const reviewed = {
        submissionId,
        status: "Accepted",
        logPath: notarizationLogPath(submissionId),
        ...artifactIdentity,
      }
      await save(evidenceDir, reviewed.logPath, {
        submissionId,
        ...artifactIdentity,
        issues,
      })
      await save(evidenceDir, resumeFileName, reviewed)
      return reviewed
    },
    async saveUnknown(submissionIdValue) {
      const unknown = {
        submissionId: notarizationSubmissionId(submissionIdValue),
        status: "unknown",
        ...artifactIdentity,
      }
      await save(evidenceDir, resumeFileName, unknown)
      return unknown
    },
  })
}
