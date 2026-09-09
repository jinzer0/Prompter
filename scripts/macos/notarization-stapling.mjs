import { setTimeout as sleep } from "node:timers/promises"

import {
  exactNotarizationObject,
  failNotarization,
  staplingArtifact,
} from "./notarization-contract.mjs"

const retryDelaysMs = [0, 5_000, 15_000, 30_000, 60_000]
const xcrunCommand = "/usr/bin/xcrun"

function defaultWaitFor(delayMs, signal) {
  if (signal === undefined) return sleep(delayMs)
  return sleep(delayMs, undefined, { signal })
}

function commandError() {
  failNotarization("Notarization command failed")
}

export function createStaplingClient(options) {
  const value = exactNotarizationObject(
    options,
    ["runFile", "commandOptions", "waitFor"],
    "Invalid notarization options",
  )
  const waitFor = value.waitFor ?? defaultWaitFor
  const signal = value.commandOptions.signal

  return Object.freeze({
    async staple(optionsValue) {
      const stapleOptions = exactNotarizationObject(
        optionsValue,
        ["artifactPath", "artifactKind"],
        "Invalid notarization options",
      )
      staplingArtifact(stapleOptions.artifactPath, stapleOptions.artifactKind)
      for (const [attempt, delayMs] of retryDelaysMs.entries()) {
        if (delayMs > 0) {
          try {
            await waitFor(delayMs, signal)
          } catch {
            commandError()
          }
        }
        if (signal?.aborted) commandError()
        try {
          await value.runFile(
            xcrunCommand,
            ["stapler", "staple", stapleOptions.artifactPath],
            value.commandOptions,
          )
          await value.runFile(
            xcrunCommand,
            ["stapler", "validate", stapleOptions.artifactPath],
            value.commandOptions,
          )
          return { status: "stapled", attempts: attempt + 1 }
        } catch {
          if (signal?.aborted || attempt === retryDelaysMs.length - 1) commandError()
        }
      }
      commandError()
    },
  })
}
