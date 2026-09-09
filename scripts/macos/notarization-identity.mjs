import { failNotarization } from "./notarization-contract.mjs"
import { identifyNotarizationArtifact } from "./notarization-evidence.mjs"

function sameArtifact(left, right) {
  return left.artifactKind === right.artifactKind && left.artifactSha256 === right.artifactSha256
}

export async function verifyNotarizationArtifact(artifactPath, artifactIdentity) {
  if (sameArtifact(artifactIdentity, await identifyNotarizationArtifact(artifactPath))) return
  try {
    failNotarization("Notarization artifact changed")
  } catch (error) {
    error.artifactKind = artifactIdentity.artifactKind
    error.discardEvidence = true
    throw error
  }
}
