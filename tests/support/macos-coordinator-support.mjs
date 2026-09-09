import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"

export const syntheticIdentity = "Developer ID Application: SYNTHETIC_IDENTITY"
export const syntheticSecret = "SYNTHETIC_PROFILE_PASSWORD_KEY_PATH"
export const appSubmissionId = "123e4567-e89b-42d3-a456-426614174000"
export const dmgSubmissionId = "123e4567-e89b-42d3-a456-426614174001"

export function commandStage(command, arguments_) {
  if (command === "/usr/bin/xcode-select") return "xcode"
  if (command === "/usr/bin/xcodebuild") return "xcode-version"
  if (command === "/usr/bin/git") return "worktree"
  if (command === "/usr/bin/security" && arguments_[0] === "show-keychain-info") return "keychain"
  if (command === "/usr/bin/security") return "identity"
  if (command === "/usr/bin/plutil") return "entitlements"
  if (command === "/usr/bin/file") return "inspect-binary"
  if (command === "/usr/bin/xcrun" && arguments_[1] === "history") return "profile"
  if (command === "/usr/bin/xcrun" && arguments_[1] === "submit")
    return arguments_[2].endsWith(".dmg") ? "dmg-submit" : "app-submit"
  if (command === "/usr/bin/xcrun" && arguments_[1] === "info")
    return arguments_[2] === dmgSubmissionId ? "dmg-info" : "app-info"
  if (command === "/usr/bin/xcrun" && arguments_[1] === "log")
    return arguments_[2] === dmgSubmissionId ? "dmg-log" : "app-log"
  if (command === "/usr/bin/xcrun" && arguments_[0] === "stapler")
    return arguments_[2].endsWith(".dmg") ? "dmg-staple" : "app-staple"
  if (command === "/usr/bin/ditto" && arguments_[0] === "-x") return "zip-extract"
  if (command === "/usr/bin/ditto" && arguments_[0] === "-c")
    return arguments_.at(-1).includes("notarization-attempt") ? "temporary-zip" : "final-zip"
  if (command === "/usr/bin/hdiutil" && arguments_[0] === "create") return "dmg-create"
  if (command === "/usr/bin/hdiutil" && arguments_[0] === "verify") return "dmg-verify"
  if (command === "/usr/bin/hdiutil" && arguments_[0] === "attach") return "attach"
  if (command === "/usr/bin/hdiutil" && arguments_[0] === "detach") return "detach"
  if (command === "/usr/bin/shasum") return "checksum"
  if (
    command === "/usr/bin/codesign" &&
    arguments_.at(-1).endsWith(".dmg") &&
    arguments_.includes("--verify")
  )
    return "dmg-signature"
  if (command === "/usr/bin/codesign" && arguments_.includes("--deep")) {
    const targetPath = arguments_.at(-1)
    if (targetPath.includes("prompter-release-extract-")) return "app-verify-2"
    if (targetPath.includes("prompter-release-mount-")) return "app-verify-3"
    return "app-verify-1"
  }
  if (command === "/usr/bin/codesign" && arguments_.at(-1).endsWith(".dmg")) return "dmg-sign"
  if (command === "spctl" || command.endsWith("/spctl")) {
    const artifactPath = arguments_.at(-1)
    if (artifactPath.endsWith(".dmg")) return "dmg-gatekeeper"
    if (artifactPath.includes("prompter-release-extract-")) return "final-zip-app-gatekeeper"
    if (artifactPath.includes("prompter-release-mount-")) return "mounted-app-gatekeeper"
    return "pre-notarization-gatekeeper"
  }
  return "app-sign"
}

export function notarizationAttempt(fixture, artifactKind) {
  const extension = artifactKind === "app" ? "zip" : "dmg"
  const evidenceDirectory = join(fixture.evidenceRoot, "v0.1.1", artifactKind)
  const directory = join(evidenceDirectory, "notarization-attempt")
  return {
    artifactPath: join(directory, `Prompter-0.1.1-mac-arm64.${extension}`),
    directory,
    evidenceDirectory,
  }
}

export function submissionCount(fixtures, artifactKind) {
  return fixtures
    .flatMap(({ rawCalls }) => rawCalls)
    .filter(
      ({ command, arguments_ }) =>
        command === "/usr/bin/xcrun" &&
        arguments_[1] === "submit" &&
        arguments_[2].endsWith(artifactKind === "app" ? ".zip" : ".dmg"),
    ).length
}

export async function writeRetainedResume(fixture, artifactKind, contents) {
  const attempt = notarizationAttempt(fixture, artifactKind)
  await mkdir(attempt.directory, { recursive: true })
  await writeFile(attempt.artifactPath, contents)
  await writeFile(
    join(attempt.evidenceDirectory, "notarization-resume.json"),
    JSON.stringify({
      submissionId: artifactKind === "app" ? appSubmissionId : dmgSubmissionId,
      status: "unknown",
      artifactKind,
      artifactSha256: createHash("sha256").update(contents).digest("hex"),
    }),
  )
  return attempt
}

export function assertSanitizedReleaseFailure(error) {
  assert.ok(error instanceof Error)
  assert.equal(error.message.includes(syntheticSecret), false)
  assert.equal(JSON.stringify(error).includes(syntheticSecret), false)
  return true
}

export const releaseStages = [
  "app-sign",
  "app-verify-1",
  "temporary-zip",
  "app-submit",
  "app-log",
  "app-staple",
  "final-zip",
  "zip-extract",
  "app-verify-2",
  "final-zip-app-gatekeeper",
  "dmg-create",
  "dmg-verify",
  "dmg-sign",
  "dmg-signature",
  "dmg-submit",
  "dmg-log",
  "dmg-staple",
  "dmg-gatekeeper",
  "attach",
  "app-verify-3",
  "mounted-app-gatekeeper",
  "detach",
  "checksum",
]

export function assertNoLaterReleaseStages(calls, failure) {
  if (failure === undefined) {
    for (const stage of releaseStages)
      assert.equal(calls.includes(stage), false, `unexpected ${stage} before release execution`)
    return
  }
  const failureCallIndex = calls.lastIndexOf(failure)
  assert.notEqual(failureCallIndex, -1, `missing injected ${failure} stage`)
  const tail = calls.slice(failureCallIndex + 1)
  const beforeFailure = calls.slice(0, failureCallIndex)
  const mountActive = beforeFailure.lastIndexOf("attach") > beforeFailure.lastIndexOf("detach")
  const permitted = mountActive ? new Set(["detach"]) : new Set()
  for (const stage of tail.filter((entry) => releaseStages.includes(entry)))
    if (!permitted.has(stage))
      assert.equal(tail.includes(stage), false, `unexpected ${stage} after ${failure}`)
}

export function reservationBarrier() {
  let arrivals = 0
  let release
  const ready = new Promise((resolveReady) => {
    release = resolveReady
  })
  return {
    async wait() {
      arrivals += 1
      if (arrivals === 2) release()
      await ready
    },
  }
}
