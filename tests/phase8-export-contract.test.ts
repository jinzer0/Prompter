import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { createElectronBridge } from "../electron/bridge"
import { PERSISTENCE_CHANNELS } from "../electron/ipc-contract"
import { createPersistenceIpcHandlers } from "../electron/ipc-handlers"
import type { ExportPromptInput, ExportPromptResult } from "../electron/ipc-types"
import { createPromptExportNativeService } from "../electron/prompt-export-native"
import { createFailingServices, listFiles, validPromptAssetId } from "./electron-contract-helpers"

const validPromptVersionId = "22222222-2222-4222-8222-222222222222"
const validExportInput: ExportPromptInput = {
  promptAssetId: validPromptAssetId,
  promptVersionId: validPromptVersionId,
  title: "Exported Prompt",
  scenario: "feature",
  targetAgent: "codex",
  originalInput: "Build export support.",
  compiledPrompt: "Use the typed IPC boundary.",
  format: "markdown",
}
const formattedExport: ExportPromptResult = {
  format: "markdown",
  filename: "exported-prompt.md",
  content: "# Exported Prompt\n\nUse the typed IPC boundary.",
  mimeType: "text/markdown",
}

describe("Phase 8 export native boundary contract", () => {
  it("exposes typed export and clipboard bridge groups", async () => {
    const calls: { readonly channel: string; readonly payload: unknown }[] = []
    const bridge = createElectronBridge(async (channel, payload) => {
      calls.push({ channel, payload })

      if (channel === PERSISTENCE_CHANNELS.formatPromptForExport) {
        return formattedExport
      }
      if (channel === PERSISTENCE_CHANNELS.savePromptToFile) {
        return { cancelled: false, filePath: "/tmp/exported-prompt.md" }
      }
      if (channel === PERSISTENCE_CHANNELS.copyText) {
        return { copied: true }
      }

      throw new Error(`Unexpected channel ${channel}`)
    })

    await expect(bridge.exports.formatPrompt(validExportInput)).resolves.toEqual(formattedExport)
    await expect(
      bridge.exports.savePromptToFile({ content: "Prompt body", format: "markdown" }),
    ).resolves.toEqual({ cancelled: false, filePath: "/tmp/exported-prompt.md" })
    await expect(bridge.clipboard.copyText({ text: "Prompt body" })).resolves.toEqual({
      copied: true,
    })
    expect(Object.keys(bridge.exports)).toEqual(["formatPrompt", "savePromptToFile"])
    expect(Object.keys(bridge.clipboard)).toEqual(["copyText"])
    expect(calls).toEqual([
      { channel: PERSISTENCE_CHANNELS.formatPromptForExport, payload: validExportInput },
      {
        channel: PERSISTENCE_CHANNELS.savePromptToFile,
        payload: { content: "Prompt body", format: "markdown" },
      },
      { channel: PERSISTENCE_CHANNELS.copyText, payload: { text: "Prompt body" } },
    ])
  })

  it("validates export and clipboard payloads before native service calls", async () => {
    let called = false
    const handlers = createPersistenceIpcHandlers({
      ...createFailingServices(() => {
        called = true
      }),
      formatPromptForExport: () => {
        called = true
        return formattedExport
      },
      savePromptToFile: async () => {
        called = true
        return { cancelled: false, filePath: "/tmp/exported-prompt.md" }
      },
      copyText: async () => {
        called = true
        return { copied: true }
      },
    })

    expect(() =>
      handlers.formatPromptForExport({ ...validExportInput, compiledPrompt: "   " }),
    ).toThrow(/compiledPrompt/)
    expect(() => handlers.savePromptToFile({ content: "   ", format: "markdown" })).toThrow(
      /content/,
    )
    expect(() =>
      handlers.savePromptToFile({
        content: "Prompt body",
        format: "markdown",
        filename: "../bad.md",
      }),
    ).toThrow(/filename/)
    expect(() => handlers.copyText({ text: "   " })).toThrow(/text/)
    expect(called).toBe(false)
  })

  it("returns save cancellation without throwing", async () => {
    const handlers = createPersistenceIpcHandlers({
      ...createFailingServices(() => undefined),
      formatPromptForExport: () => formattedExport,
      savePromptToFile: async () => ({ cancelled: true }),
      copyText: async () => ({ copied: true }),
    })

    await expect(handlers.savePromptToFile(validExportInput)).resolves.toEqual({ cancelled: true })
  })

  it("writes formatted export content through the native save service", async () => {
    const directory = await mkdtemp(join(tmpdir(), "prompter-phase8-export-"))
    const filePath = join(directory, "exported-prompt.codex.md")

    try {
      const service = createPromptExportNativeService({
        showSaveDialog: async () => ({ canceled: false, filePath }),
        writeFile,
        copyText: () => undefined,
      })

      await expect(
        service.savePromptToFile({
          ...validExportInput,
          format: "codex",
        }),
      ).resolves.toEqual({ cancelled: false, filePath })

      const content = await readFile(filePath, "utf8")
      expect(content).toContain("## Agent Instructions")
      expect(content).toContain("Do not store prompt execution results.")
      expect(content).toContain("Use the typed IPC boundary.")
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("keeps renderer free of Electron, Node, filesystem, and shell access", async () => {
    const rendererFiles = await listFiles("renderer/src")
    const sourceFiles = rendererFiles.filter((filePath) => /\.(ts|tsx)$/.test(filePath))
    const contents = await Promise.all(sourceFiles.map((filePath) => readFile(filePath, "utf8")))
    const rendererSource = contents.join("\n")

    expect(rendererSource).not.toContain("ipcRenderer")
    expect(rendererSource).not.toContain("node:fs")
    expect(rendererSource).not.toContain("node:path")
    expect(rendererSource).not.toContain("node:process")
    expect(rendererSource).not.toContain('from "electron"')
    expect(rendererSource).not.toContain("from 'electron'")
    expect(rendererSource).not.toContain("navigator.clipboard")
    expect(rendererSource).not.toContain("shell.openPath")
  })
})
