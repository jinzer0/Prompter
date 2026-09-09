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

function input(value, fields) {
  const allowedFields = Object.hasOwn(value ?? {}, "signal") ? [...fields, "signal"] : fields
  const options = exactNotarizationObject(value, allowedFields, "Invalid notarization options")
  if (typeof options.runFile !== "function") failNotarization("Invalid notarization options")
  return options
}

function client(runFile, signal) {
  return createNotarizationClient({
    runFile,
    ...(signal === undefined ? {} : { signal }),
  })
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
  const value = input(options, ["artifactPath", "profile", "evidenceDir", "runFile"])
  const artifactIdentity = await identifyNotarizationArtifact(value.artifactPath)
  const profile = notaryProfile(value.profile)
  const evidenceDir = evidenceDirectory(value.evidenceDir)
  const signal = notarizationSignal(value.signal)
  const evidence = createNotarizationEvidence({ evidenceDir, artifactIdentity })
  const saved = await evidence.readResume()
  if (saved !== undefined && !evidence.matchesArtifact(saved)) {
    failNotarization("Notarization resume does not match artifact")
  }
  const notary = client(value.runFile, signal)
  await notary.preflight(profile)
  if (saved !== undefined) {
    const status = await notary.info({ submissionId: saved.submissionId, profile })
    if (status === "Accepted") {
      return fetchNotaryLog({
        submissionId: saved.submissionId,
        profile,
        evidenceDir,
        artifactPath: value.artifactPath,
        runFile: value.runFile,
        ...(signal === undefined ? {} : { signal }),
      })
    }
    if (status === "In Progress") {
      return saved.status === "Accepted" ? evidence.saveAcceptedPending(saved.submissionId) : saved
    }
    failNotarization("Notarization submission was not accepted")
  }
  const result = await notary.submit({ artifactPath: value.artifactPath, profile })
  if (result.status === "unknown") return evidence.saveUnknown(result.submissionId)
  if (result.status !== "Accepted") {
    failNotarization("Notarization submission was not accepted")
  }
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
  const value = input(options, ["artifactPath", "artifactKind", "runFile"])
  staplingArtifact(value.artifactPath, value.artifactKind)
  const signal = notarizationSignal(value.signal)
  return client(value.runFile, signal).staple({
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
