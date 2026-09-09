import { createHash } from "node:crypto"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

export const notarizationProfile = "SYNTHETIC_PROFILE"
export const notarizationSubmissionId = "123e4567-e89b-42d3-a456-426614174000"
export const notarizationSecretSentinel = "SYNTHETIC_SECRET_SENTINEL"
export const unsafeIssueSets = [
  ["empty severity", [{ severity: "" }]],
  ["uppercase info severity", [{ severity: "INFO" }]],
  ["warning severity", [{ severity: "Warning" }]],
  ["error severity", [{ severity: "ERROR" }]],
  ["critical severity", [{ severity: "critical" }]],
  ["arbitrary severity", [{ severity: "unexpected" }]],
  ["non-string severity", [{ severity: 1 }]],
  ["missing severity", [{}]],
  ["null issue", [null]],
  ["array issue", [[]]],
  ["extra issue field", [{ severity: "info", extra: "unexpected" }]],
]

export function createNotarizationDirectoryTracker() {
  const directories = []
  return {
    async create() {
      const directory = await mkdtemp(join(tmpdir(), "prompter-notary-test-"))
      directories.push(directory)
      return directory
    },
    cleanup: () =>
      Promise.all(
        directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
      ),
  }
}

export async function createNotarizationArtifact(root, name, contents = "artifact") {
  const path = join(root, name)
  await writeFile(path, contents)
  return path
}

export function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex")
}

export async function writeFinalNotarizationEvidence(root, artifactKind) {
  const artifactSha256 = sha256(`${artifactKind} evidence`)
  const resume = {
    submissionId: notarizationSubmissionId,
    status: "Accepted",
    logPath: `notary-${notarizationSubmissionId}.json`,
    artifactKind,
    artifactSha256,
  }
  const receipt = {
    submissionId: notarizationSubmissionId,
    artifactKind,
    artifactSha256,
    issues: [],
  }
  await writeFile(join(root, "notarization-resume.json"), JSON.stringify(resume))
  await writeFile(join(root, resume.logPath), JSON.stringify(receipt))
  return { receipt, resume }
}

export function createNotaryRunner({
  submit = { id: notarizationSubmissionId, status: "Accepted" },
  log = { issues: [] },
  info = { id: notarizationSubmissionId, status: "Accepted" },
  fail,
} = {}) {
  const calls = []
  const runFile = async (command, arguments_, options) => {
    calls.push({ command, arguments_, options })
    const failure = fail?.(command, arguments_, calls.length)
    if (failure !== undefined) throw failure
    if (command === "spctl") return { stdout: "", stderr: "" }
    if (arguments_[1] === "history") return { stdout: "{}" }
    if (arguments_[1] === "submit") return { stdout: JSON.stringify(submit) }
    if (arguments_[1] === "log") return { stdout: JSON.stringify(log) }
    if (arguments_[1] === "info") {
      return { stdout: JSON.stringify(typeof info === "function" ? info() : info) }
    }
    return { stdout: "", stderr: "" }
  }
  return { calls, runFile }
}
