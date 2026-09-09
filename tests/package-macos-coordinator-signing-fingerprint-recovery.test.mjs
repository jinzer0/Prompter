import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { access } from "node:fs/promises"

import { afterEach, test } from "vitest"

import { SigningInputError } from "../scripts/macos/signing-discovery.mjs"
import { createCoordinatorFixture } from "./support/macos-coordinator-fixtures.mjs"
import {
  submissionCount,
  syntheticCertificate,
  syntheticIdentityFingerprint,
} from "./support/macos-coordinator-support.mjs"
import { createTemporaryDirectoryTracker } from "./support/macos-package-fixtures.mjs"

const temporaryDirectories = createTemporaryDirectoryTracker()
const renewedFingerprint = createHash("sha1").update("renewed certificate").digest("hex")
const sha256SyntheticIdentityFingerprint = createHash("sha256")
  .update(syntheticCertificate)
  .digest("hex")
afterEach(() => temporaryDirectories.cleanup())

async function fixture(options) {
  return temporaryDirectories.track(await createCoordinatorFixture(options))
}

function invalidIdentity(artifactKind) {
  return (error) => {
    assert.ok(error instanceof SigningInputError)
    assert.equal(error.message, "Recovered artifact signing identity is invalid")
    assert.equal(error.artifactKind, artifactKind)
    assert.equal(error.discardEvidence, true)
    return true
  }
}

async function assertCertificateCleanup(release, expectedCount = 1) {
  const certificateDirectories = [...release.observedTempRoots].filter((directory) =>
    directory.includes("/prompter-signing-certificate-"),
  )
  assert.equal(certificateDirectories.length, expectedCount)
  for (const directory of certificateDirectories) await assert.rejects(access(directory))
}

function finalArtifactSignerDisplays(release) {
  return release.rawCalls.filter(
    ({ command, arguments_ }) =>
      command === "/usr/bin/codesign" &&
      arguments_[0] === "--display" &&
      arguments_.includes("--extract-certificates"),
  )
}

test("checks the selected leaf certificate at every final artifact gate", async () => {
  const release = await fixture()

  await release.run()

  const displays = finalArtifactSignerDisplays(release)
  assert.equal(displays.length, 3)
  assert.equal(displays[0].arguments_.at(-1).includes("prompter-release-extract-"), true)
  assert.equal(displays[1].arguments_.at(-1).endsWith("Prompter-0.1.1-mac-arm64.dmg"), true)
  assert.equal(displays[2].arguments_.at(-1).includes("prompter-release-mount-"), true)
  for (const display of displays) {
    const displayIndex = release.rawCalls.indexOf(display)
    const identity = release.rawCalls[displayIndex - 1]
    assert.equal(identity.command, "/usr/bin/security")
    assert.deepEqual(identity.arguments_, ["find-identity", "-v", "-p", "codesigning"])
  }
  const certificateDirectories = [...release.observedTempRoots].filter((directory) =>
    directory.includes("/prompter-signing-certificate-"),
  )
  assert.equal(certificateDirectories.length, 3)
  for (const directory of certificateDirectories) await assert.rejects(access(directory))
})

test("blocks checksum and candidate publication when final ZIP signer fingerprint mismatches", async () => {
  const release = await fixture({ certificateContents: Buffer.from("renewed certificate") })

  await assert.rejects(release.run(), invalidIdentity("app"))

  assert.equal(release.calls.includes("checksum"), false)
  assert.equal(release.calls.includes("dmg-create"), false)
  await assert.rejects(access(release.candidate))
})

test.each([
  ["app", "app-timeout", { pendingAppStatus: "Accepted" }],
  ["dmg", "dmg-timeout", { pendingAppStatus: "Accepted", pendingDmgStatus: "Accepted" }],
])("rejects a same-name renewed certificate for a resumed %s", async (artifactKind, failure, options) => {
  const first = await fixture({ failure })
  await assert.rejects(first.run())
  const second = await fixture({
    ...options,
    identityFingerprint: renewedFingerprint,
    shared: first.shared,
  })

  await assert.rejects(second.run(), invalidIdentity(artifactKind))

  await assertCertificateCleanup(second)
  assert.equal(submissionCount([first, second], artifactKind), 1)
})

test("resumes an app with a SHA-256 selected certificate fingerprint", async () => {
  const first = await fixture({
    failure: "app-timeout",
    identityFingerprint: sha256SyntheticIdentityFingerprint,
  })
  await assert.rejects(first.run())
  const second = await fixture({
    identityFingerprint: sha256SyntheticIdentityFingerprint,
    pendingAppStatus: "Accepted",
    shared: first.shared,
  })

  await second.run()

  assert.equal(sha256SyntheticIdentityFingerprint.length, 64)
  await assertCertificateCleanup(second, 4)
})

test.each([
  ["app", "app-timeout", { pendingAppStatus: "Accepted" }],
  ["dmg", "dmg-timeout", { pendingAppStatus: "Accepted", pendingDmgStatus: "Accepted" }],
])("resumes a %s with the exact selected certificate", async (artifactKind, failure, options) => {
  const first = await fixture({ failure })
  await assert.rejects(first.run())
  const second = await fixture({ ...options, shared: first.shared })

  await second.run()

  assert.equal(syntheticIdentityFingerprint.length, 40)
  assert.equal(
    createHash("sha1").update(syntheticCertificate).digest("hex"),
    syntheticIdentityFingerprint,
  )
  await assertCertificateCleanup(second, 4)
  assert.equal(submissionCount([first, second], artifactKind), 1)
})

test.each([
  "missing",
  "malformed",
])("rejects %s extracted leaf certificates and cleans temporary files", async (certificateExtraction) => {
  const first = await fixture({ failure: "app-timeout" })
  await assert.rejects(first.run())
  const second = await fixture({
    certificateExtraction,
    pendingAppStatus: "Accepted",
    shared: first.shared,
  })

  await assert.rejects(second.run(), invalidIdentity("app"))

  await assertCertificateCleanup(second)
})
