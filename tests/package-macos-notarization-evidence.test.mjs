import assert from "node:assert/strict"
import { access, mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { afterEach, test } from "vitest"

import { submitAndWait } from "../scripts/macos/notarization.mjs"
import { validateFinalNotarizationEvidence } from "../scripts/macos/notarization-evidence.mjs"
import {
  createNotarizationArtifact as artifact,
  createNotarizationDirectoryTracker,
  createNotaryRunner,
  notarizationSubmissionId as id,
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
  const receipt = await writeFinalNotarizationEvidence(root, "app")
  receipt.issues = issues
  await writeFile(join(root, "notarization-final.json"), JSON.stringify(receipt))

  assert.deepEqual(
    await validateFinalNotarizationEvidence({ evidenceDir: root, artifactKind: "app" }),
    receipt,
  )
})

test("validates a final receipt without active resume or log state", async () => {
  const root = await evidence()
  const receipt = await writeFinalNotarizationEvidence(root, "app")

  assert.deepEqual(
    await validateFinalNotarizationEvidence({ evidenceDir: root, artifactKind: "app" }),
    receipt,
  )
})

test("keeps active Accepted state resumable when writing the final receipt fails", async () => {
  const root = await evidence()
  const artifactPath = await artifact(root, "Prompter.zip")
  const { runFile } = createNotaryRunner()
  await mkdir(join(root, "notarization-final.json"))

  await assert.rejects(submitAndWait({ artifactPath, profile, evidenceDir: root, runFile }))

  await Promise.all([
    access(join(root, "notarization-resume.json")),
    access(join(root, `notary-${id}.json`)),
  ])
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
  ["missing receipt field", (_resume, receipt) => delete receipt.status],
  [
    "extra receipt field",
    (_resume, receipt) => {
      receipt.extra = "unexpected"
    },
  ],
  [
    "mismatched artifact kind",
    (_resume, receipt) => {
      receipt.artifactKind = "dmg"
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
  const receipt = await writeFinalNotarizationEvidence(root, "app")
  mutate({}, receipt)
  await writeFile(join(root, "notarization-final.json"), JSON.stringify(receipt))

  await assert.rejects(
    validateFinalNotarizationEvidence({ evidenceDir: root, artifactKind: "app" }),
    /Invalid final notarization evidence/,
  )
})
