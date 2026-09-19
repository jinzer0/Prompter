import {
  exactNotarizationObject,
  failNotarization,
  notarizationSubmissionId,
  validArtifactIdentity,
} from "./notarization-contract.mjs"

export const finalNotarizationReceiptFileName = "notarization-final.json"

export function hasSafeNotarizationIssues(value) {
  return (
    Array.isArray(value) &&
    value.every(
      (issue) =>
        issue !== null &&
        typeof issue === "object" &&
        !Array.isArray(issue) &&
        Reflect.ownKeys(issue).length === 1 &&
        Object.hasOwn(issue, "severity") &&
        issue.severity === "info",
    )
  )
}

export function createFinalNotarizationReceipt({ submissionId, artifactIdentity, issues }) {
  if (!validArtifactIdentity(artifactIdentity) || !hasSafeNotarizationIssues(issues)) {
    failNotarization("Invalid final notarization evidence")
  }
  return {
    submissionId: notarizationSubmissionId(submissionId),
    status: "Accepted",
    ...artifactIdentity,
    issues,
  }
}

export function parseFinalNotarizationReceipt(value) {
  const receipt = exactNotarizationObject(
    value,
    ["submissionId", "status", "artifactKind", "artifactSha256", "issues"],
    "Invalid final notarization evidence",
  )
  const submissionId = notarizationSubmissionId(receipt.submissionId)
  if (
    receipt.submissionId !== submissionId ||
    receipt.status !== "Accepted" ||
    !validArtifactIdentity({
      artifactKind: receipt.artifactKind,
      artifactSha256: receipt.artifactSha256,
    }) ||
    !hasSafeNotarizationIssues(receipt.issues)
  ) {
    failNotarization("Invalid final notarization evidence")
  }
  return receipt
}
