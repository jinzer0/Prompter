import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"

import { createElectronBridge } from "../electron/bridge"
import { createPersistenceIpcHandlers } from "../electron/ipc-handlers"
import {
  createFailingServices,
  listFiles,
  promptCompilerAnalyzeFixture,
  promptCompilerCompileFixture,
} from "./electron-contract-helpers"

describe("Phase 5 prompt compiler contract", () => {
  it("routes prompt compiler requests through the typed bridge", async () => {
    const bridge = createElectronBridge(async (channel) => {
      if (channel === "prompter:prompt-compiler:analyze") {
        return promptCompilerAnalyzeFixture
      }

      if (channel === "prompter:prompt-compiler:compile") {
        return promptCompilerCompileFixture
      }

      throw new Error(`Unexpected channel ${channel}`)
    })

    await expect(
      bridge.promptCompiler.analyze({ originalInput: "Build a feature prompt." }),
    ).resolves.toEqual(promptCompilerAnalyzeFixture)
    await expect(
      bridge.promptCompiler.compile({
        originalInput: "Build a feature prompt.",
        scenario: "feature",
        targetAgent: "codex",
      }),
    ).resolves.toEqual(promptCompilerCompileFixture)
  })

  it("rejects malformed prompt compiler IPC payloads before service calls", () => {
    let called = false
    const handlers = createPersistenceIpcHandlers(
      createFailingServices(() => {
        called = true
      }),
    )

    expect(() => handlers.promptCompilerAnalyze({ originalInput: "" })).toThrow(/originalInput/)
    expect(() =>
      handlers.promptCompilerCompile({
        originalInput: "Original input",
        scenario: "unknown",
        targetAgent: "codex",
      }),
    ).toThrow(/scenario/)
    expect(called).toBe(false)
  })

  it("keeps renderer source free of direct OpenAI and secret access", async () => {
    const rendererFiles = await listFiles("renderer/src")
    const sourceFiles = rendererFiles.filter((filePath) => /\.(ts|tsx)$/.test(filePath))
    const contents = await Promise.all(sourceFiles.map((filePath) => readFile(filePath, "utf8")))
    const rendererSource = contents.join("\n")

    expect(rendererSource).not.toContain("safeStorage")
    expect(rendererSource).not.toContain('from "openai"')
    expect(rendererSource).not.toContain("from 'openai'")
    expect(rendererSource).not.toContain("new OpenAI(")
    expect(rendererSource).not.toContain("getOpenAIKeyForMainProcessOnly")
  })

  it("keeps Phase 5 scope free of prompt execution and run-result storage", async () => {
    const files = await listFiles("electron")
    const sourceFiles = files.filter((filePath) => /\.(ts|tsx)$/.test(filePath))
    const contents = await Promise.all(sourceFiles.map((filePath) => readFile(filePath, "utf8")))
    const mainSource = contents.join("\n")

    expect(mainSource).not.toContain("prompt_runs")
    expect(mainSource).not.toContain("agent_runs")
    expect(mainSource).not.toContain("execution_results")
    expect(mainSource).not.toContain("validation_results")
    expect(mainSource).not.toContain("run_logs")
    expect(mainSource).not.toContain("chat/completions")
    expect(mainSource).not.toContain("child_process")
    expect(mainSource).not.toContain("Codex CLI")
    expect(mainSource).not.toContain("Claude Code 실행")
    expect(mainSource).not.toContain("Cursor 실행")
  })
})
