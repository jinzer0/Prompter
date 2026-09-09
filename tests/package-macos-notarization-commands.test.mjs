import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { promisify } from "node:util"

import { test } from "vitest"

import {
  assessGatekeeper,
  preflightNotaryProfile,
  stapleAndValidate,
} from "../scripts/macos/notarization.mjs"
import { runner } from "../scripts/macos/release-support.mjs"
import {
  createNotaryRunner,
  notarizationProfile as profile,
} from "./support/macos-notarization-fixtures.mjs"

const executeFile = promisify(execFile)

test("staples on the third attempt and uses Gatekeeper's app and disk-image kinds", async () => {
  let stapleAttempts = 0
  const calls = []
  const waitFor = async () => undefined
  const runFile = async (command, arguments_) => {
    calls.push({ command, arguments_ })
    if (arguments_[0] === "stapler" && arguments_[1] === "staple" && ++stapleAttempts < 3)
      throw new Error("synthetic retry")
    return { stdout: "", stderr: "" }
  }
  assert.deepEqual(
    await stapleAndValidate({
      artifactPath: "Prompter.app",
      artifactKind: "app",
      runFile,
      waitFor,
    }),
    { status: "stapled", attempts: 3 },
  )
  await assessGatekeeper({ artifactPath: "Prompter.app", artifactKind: "app", runFile })
  await assessGatekeeper({ artifactPath: "Prompter.dmg", artifactKind: "dmg", runFile })
  assert.deepEqual(
    calls.slice(-2).map(({ arguments_ }) => arguments_),
    [
      ["--assess", "--type", "execute", "--verbose=4", "Prompter.app"],
      [
        "--assess",
        "--type",
        "open",
        "--context",
        "context:primary-signature",
        "--verbose=4",
        "Prompter.dmg",
      ],
    ],
  )
})

test("retries ticket propagation with the production backoff schedule before stapling succeeds", async () => {
  const delays = []
  const calls = []
  let stapleAttempts = 0
  const waitFor = async (delayMs) => delays.push(delayMs)
  const runFile = async (_command, arguments_) => {
    calls.push(arguments_)
    if (arguments_[0] === "stapler" && arguments_[1] === "staple" && ++stapleAttempts < 3) {
      throw new Error("ticket is not yet available")
    }
    return { stdout: "", stderr: "" }
  }

  const result = await stapleAndValidate({
    artifactPath: "Prompter.app",
    artifactKind: "app",
    runFile,
    waitFor,
  })

  assert.deepEqual(result, { status: "stapled", attempts: 3 })
  assert.deepEqual(delays, [5_000, 15_000])
  assert.deepEqual(calls, [
    ["stapler", "staple", "Prompter.app"],
    ["stapler", "staple", "Prompter.app"],
    ["stapler", "staple", "Prompter.app"],
    ["stapler", "validate", "Prompter.app"],
  ])
})

test("exhausts bounded ticket-propagation retries using the exact backoff schedule", async () => {
  const delays = []
  const calls = []
  const waitFor = async (delayMs) => delays.push(delayMs)
  const runFile = async (_command, arguments_) => {
    calls.push(arguments_)
    throw new Error("ticket is not yet available")
  }

  await assert.rejects(
    stapleAndValidate({
      artifactPath: "Prompter.dmg",
      artifactKind: "dmg",
      runFile,
      waitFor,
    }),
    (error) => error instanceof Error && error.message === "Notarization command failed",
  )

  assert.deepEqual(delays, [5_000, 15_000, 30_000, 60_000])
  assert.deepEqual(calls, [
    ["stapler", "staple", "Prompter.dmg"],
    ["stapler", "staple", "Prompter.dmg"],
    ["stapler", "staple", "Prompter.dmg"],
    ["stapler", "staple", "Prompter.dmg"],
    ["stapler", "staple", "Prompter.dmg"],
  ])
})

test("uses absolute Apple trust command paths", async () => {
  const { calls, runFile } = createNotaryRunner()

  await preflightNotaryProfile({ profile, runFile })
  await assessGatekeeper({ artifactPath: "Prompter.app", artifactKind: "app", runFile })

  assert.equal(calls[0]?.command, "/usr/bin/xcrun")
  assert.equal(calls[1]?.command, "/usr/sbin/spctl")
})

test("maps a real child-process AbortSignal failure to a sanitized production-runner error", async () => {
  const controller = new AbortController()
  const startedAt = Date.now()
  const timer = setTimeout(() => controller.abort(), 50)
  const run = runner(executeFile)

  try {
    await assert.rejects(
      run(process.execPath, ["--eval", "setInterval(() => undefined, 1000)"], {
        timeoutMs: 2_000,
        signal: controller.signal,
      }),
      (error) => error instanceof Error && error.message === "macOS release command failed",
    )
  } finally {
    clearTimeout(timer)
  }

  assert.equal(Date.now() - startedAt < 1_000, true)
})
