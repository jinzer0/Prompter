import { setTimeout as sleep } from "node:timers/promises"
import { createNotarizationClient } from "./notarization-command.mjs"
import {
  evidenceDirectory,
  exactNotarizationObject,
  failNotarization,
  notarizationSignal,
  notarizationSubmissionId,
  notaryProfile,
  staplingArtifact,
} from "./notarization-contract.mjs"
import {
  createNotarizationEvidence,
  identifyNotarizationArtifact,
} from "./notarization-evidence.mjs"
import { createSubmissionClaim } from "./notarization-storage.mjs"

const pollingDelaysMs = [0, 5_000, 15_000, 30_000, 60_000]

function defaultWaitFor(delayMs, signal) {
  if (signal === undefined) return sleep(delayMs)
  return sleep(delayMs, undefined, { signal })
}

async function pollNotarizationStatus(options) {
  const waitFor = options.waitFor ?? defaultWaitFor
  for (const delayMs of pollingDelaysMs) {
    if (delayMs > 0) {
      try {
        await waitFor(delayMs, options.signal)
      } catch {
        failNotarization("Notarization command failed")
      }
    }
    if (options.signal?.aborted) failNotarization("Notarization command failed")
    const status = await options.notary.info({
      submissionId: options.submissionId,
      profile: options.profile,
    })
    if (status === "Accepted") return status
    if (status !== "In Progress") failNotarization("Notarization submission was not accepted")
  }
  return "In Progress"
}

function input(value, fields, optionalFields = ["signal"]) {
  const allowedFields = [
    ...fields,
    ...optionalFields.filter((field) => Object.hasOwn(value ?? {}, field)),
  ]
  const options = exactNotarizationObject(value, allowedFields, "Invalid notarization options")
  if (typeof options.runFile !== "function") failNotarization("Invalid notarization options")
  return options
}

function client(runFile, signal, waitFor) {
  return createNotarizationClient({
    runFile,
    ...(signal === undefined ? {} : { signal }),
    ...(waitFor === undefined ? {} : { waitFor }),
  })
}

function sameArtifact(left, right) {
  return left.artifactKind === right.artifactKind && left.artifactSha256 === right.artifactSha256
}

async function resumeSubmission(options) {
  const status = await pollNotarizationStatus({
    notary: options.notary,
    submissionId: options.saved.submissionId,
    profile: options.profile,
    signal: options.signal,
    waitFor: options.waitFor,
  })
  if (status === "Accepted") {
    return fetchNotaryLog({
      submissionId: options.saved.submissionId,
      profile: options.profile,
      evidenceDir: options.evidenceDir,
      artifactPath: options.artifactPath,
      runFile: options.runFile,
      ...(options.signal === undefined ? {} : { signal: options.signal }),
    })
  }
  if (status === "In Progress") {
    return options.saved.status === "Accepted"
      ? options.evidence.saveAcceptedPending(options.saved.submissionId)
      : options.saved
  }
  failNotarization("Notarization submission was not accepted")
}

export async function preflightNotaryProfile(options) {
  const value = input(options, ["profile", "runFile"])
  const profile = notaryProfile(value.profile)
  const signal = notarizationSignal(value.signal)
  return client(value.runFile, signal).preflight(profile)
}

export async function fetchNotaryLog(options) {
  const value = input(options, [
    "submissionId",
    "profile",
    "evidenceDir",
    "artifactPath",
    "runFile",
  ])
  const submissionId = notarizationSubmissionId(value.submissionId)
  const profile = notaryProfile(value.profile)
  const evidenceDir = evidenceDirectory(value.evidenceDir)
  const artifactIdentity = await identifyNotarizationArtifact(value.artifactPath)
  const signal = notarizationSignal(value.signal)
  const evidence = createNotarizationEvidence({ evidenceDir, artifactIdentity })
  const receipt = await client(value.runFile, signal).fetchLog({ submissionId, profile })
  return evidence.saveAccepted(submissionId, receipt.issues)
}

export async function submitAndWait(options) {
  const value = input(
    options,
    ["artifactPath", "profile", "evidenceDir", "runFile"],
    ["signal", "waitFor"],
  )
  const artifactIdentity = await identifyNotarizationArtifact(value.artifactPath)
  const profile = notaryProfile(value.profile)
  const evidenceDir = evidenceDirectory(value.evidenceDir)
  const signal = notarizationSignal(value.signal)
  const evidence = createNotarizationEvidence({ evidenceDir, artifactIdentity })
  let saved = await evidence.readResume()
  if (saved !== undefined && !evidence.matchesArtifact(saved)) {
    failNotarization("Notarization resume does not match artifact")
  }
  const notary = client(value.runFile, signal, value.waitFor)
  await notary.preflight(profile)
  if (saved !== undefined) {
    return resumeSubmission({
      evidence,
      saved,
      notary,
      profile,
      evidenceDir,
      artifactPath: value.artifactPath,
      runFile: value.runFile,
      signal,
      waitFor: value.waitFor,
    })
  }
  const claim = createSubmissionClaim(evidenceDir)
  await claim.acquire()
  try {
    const beforeSubmit = await identifyNotarizationArtifact(value.artifactPath)
    if (!sameArtifact(artifactIdentity, beforeSubmit)) {
      failNotarization("Notarization artifact changed")
    }
    saved = await evidence.readResume()
    if (saved !== undefined) {
      await claim.release()
      if (!evidence.matchesArtifact(saved))
        failNotarization("Notarization resume does not match artifact")
      return resumeSubmission({
        evidence,
        saved,
        notary,
        profile,
        evidenceDir,
        artifactPath: value.artifactPath,
        runFile: value.runFile,
        signal,
        waitFor: value.waitFor,
      })
    }
  } catch (error) {
    await claim.release()
    throw error
  }
  const result = await notary.submit({ artifactPath: value.artifactPath, profile })
  const unknown = await evidence.saveUnknown(result.submissionId)
  await claim.release()
  if (!["Accepted", "In Progress", "unknown"].includes(result.status)) {
    failNotarization("Notarization submission was not accepted")
  }
  if (result.status === "unknown") return unknown
  const afterSubmit = await identifyNotarizationArtifact(value.artifactPath)
  if (!sameArtifact(artifactIdentity, afterSubmit))
    failNotarization("Notarization artifact changed")
  const status = await pollNotarizationStatus({
    notary,
    submissionId: result.submissionId,
    profile,
    signal,
    waitFor: value.waitFor,
  })
  if (status === "In Progress") return unknown
  if (status !== "Accepted") failNotarization("Notarization submission was not accepted")
  await evidence.saveAcceptedPending(result.submissionId)
  return fetchNotaryLog({
    submissionId: result.submissionId,
    profile,
    evidenceDir,
    artifactPath: value.artifactPath,
    runFile: value.runFile,
    ...(signal === undefined ? {} : { signal }),
  })
}

export async function stapleAndValidate(options) {
  const value = input(options, ["artifactPath", "artifactKind", "runFile"], ["signal", "waitFor"])
  staplingArtifact(value.artifactPath, value.artifactKind)
  const signal = notarizationSignal(value.signal)
  return client(value.runFile, signal, value.waitFor).staple({
    artifactPath: value.artifactPath,
    artifactKind: value.artifactKind,
  })
}

export async function assessGatekeeper(options) {
  const value = input(options, ["artifactPath", "artifactKind", "runFile"])
  staplingArtifact(value.artifactPath, value.artifactKind)
  const signal = notarizationSignal(value.signal)
  return client(value.runFile, signal).assess({
    artifactPath: value.artifactPath,
    artifactKind: value.artifactKind,
  })
}
