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

test("retries stapling a bounded three times and uses Gatekeeper's app and disk-image kinds", async () => {
  let stapleAttempts = 0
  const calls = []
  const runFile = async (command, arguments_) => {
    calls.push({ command, arguments_ })
    if (arguments_[0] === "stapler" && arguments_[1] === "staple" && ++stapleAttempts < 3)
      throw new Error("synthetic retry")
    return { stdout: "", stderr: "" }
  }
  assert.deepEqual(
    await stapleAndValidate({ artifactPath: "Prompter.app", artifactKind: "app", runFile }),
    { status: "stapled", attempts: 3 },
  )
  await assessGatekeeper({ artifactPath: "Prompter.app", artifactKind: "app", runFile })
  await assessGatekeeper({ artifactPath: "Prompter.dmg", artifactKind: "dmg", runFile })
  assert.deepEqual(
    calls.slice(-2).map(({ arguments_ }) => arguments_.slice(0, 4)),
    [
      ["--assess", "--type", "execute", "--verbose=4"],
      ["--assess", "--type", "open", "--verbose=4"],
    ],
  )
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
