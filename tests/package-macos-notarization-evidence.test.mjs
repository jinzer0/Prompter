import assert from "node:assert/strict"
import { writeFile } from "node:fs/promises"
import { join } from "node:path"

import { afterEach, test } from "vitest"

import { submitAndWait } from "../scripts/macos/notarization.mjs"
import { validateFinalNotarizationEvidence } from "../scripts/macos/notarization-evidence.mjs"
import {
  createNotarizationArtifact as artifact,
  createNotarizationDirectoryTracker,
  createNotaryRunner,
  notarizationProfile as profile,
  sha256,
  unsafeIssueSets,
  writeFinalNotarizationEvidence,
} from "./support/macos-notarization-fixtures.mjs"

const temporaryDirectories = createNotarizationDirectoryTracker()
afterEach(() => temporaryDirectories.cleanup())

function evidence() {
  return temporaryDirectories.create()
}

test("binds a multi-chunk archive to a lowercase streaming SHA-256 digest", async () => {
  const root = await evidence()
  const contents = Buffer.concat([Buffer.alloc(65_536, "a"), Buffer.alloc(65_536, "b")])
  const artifactPath = await artifact(root, "Prompter.zip", contents)
  const { runFile } = createNotaryRunner()

  const accepted = await submitAndWait({ artifactPath, profile, evidenceDir: root, runFile })

  assert.equal(accepted.artifactSha256, sha256(contents))
  assert.match(accepted.artifactSha256, /^[0-9a-f]{64}$/u)
})

test.each([
  ["empty", []],
  ["lowercase info", [{ severity: "info" }]],
])("accepts %s final notarization evidence", async (_label, issues) => {
  const root = await evidence()
  const { receipt, resume } = await writeFinalNotarizationEvidence(root, "app")
  receipt.issues = issues
  await writeFile(join(root, resume.logPath), JSON.stringify(receipt))

  assert.deepEqual(
    await validateFinalNotarizationEvidence({ evidenceDir: root, artifactKind: "app" }),
    resume,
  )
})

test("rejects final notarization evidence for the wrong requested artifact kind", async () => {
  const root = await evidence()
  await writeFinalNotarizationEvidence(root, "app")

  await assert.rejects(
    validateFinalNotarizationEvidence({ evidenceDir: root, artifactKind: "dmg" }),
    /Invalid final notarization evidence/,
  )
})

test.each([
  ["missing resume field", (resume, _receipt) => delete resume.artifactSha256],
  [
    "extra receipt field",
    (_resume, receipt) => {
      receipt.extra = "unexpected"
    },
  ],
  [
    "mismatched submission",
    (_resume, receipt) => {
      receipt.submissionId = "123e4567-e89b-42d3-a456-426614174001"
    },
  ],
  [
    "mismatched artifact kind",
    (_resume, receipt) => {
      receipt.artifactKind = "dmg"
    },
  ],
  [
    "mismatched artifact hash",
    (_resume, receipt) => {
      receipt.artifactSha256 = sha256("different artifact")
    },
  ],
  [
    "warning issue",
    (_resume, receipt) => {
      receipt.issues = [{ severity: "warning" }]
    },
  ],
  [
    "error issue",
    (_resume, receipt) => {
      receipt.issues = [{ severity: "error" }]
    },
  ],
  ...unsafeIssueSets.map(([label, issues]) => [
    label,
    (_resume, receipt) => (receipt.issues = issues),
  ]),
])("rejects final notarization evidence with %s", async (_label, mutate) => {
  const root = await evidence()
  const { receipt, resume } = await writeFinalNotarizationEvidence(root, "app")
  mutate(resume, receipt)
  await writeFile(join(root, "notarization-resume.json"), JSON.stringify(resume))
  await writeFile(join(root, resume.logPath), JSON.stringify(receipt))

  await assert.rejects(
    validateFinalNotarizationEvidence({ evidenceDir: root, artifactKind: "app" }),
    /Invalid final notarization evidence/,
  )
})
