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

async function assertCertificateCleanup(release) {
  const certificateDirectories = [...release.observedTempRoots].filter((directory) =>
    directory.includes("/prompter-signing-certificate-"),
  )
  assert.equal(certificateDirectories.length, 1)
  for (const directory of certificateDirectories) await assert.rejects(access(directory))
}

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
  await assertCertificateCleanup(second)
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
  await assertCertificateCleanup(second)
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
