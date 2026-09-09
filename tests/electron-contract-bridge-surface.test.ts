import { describe, expect, it } from "vitest"

import { createElectronBridge, PING_RESPONSE } from "../electron/bridge"

describe("Electron shell contract", () => {
  it("exposes only grouped typed ping and persistence bridge methods", async () => {
    const bridge = createElectronBridge(async (channel) => {
      if (channel === "prompter:ping") {
        return PING_RESPONSE
      }

      if (channel === "prompter:projects:list") {
        return []
      }

      if (channel === "prompter:settings:get") {
        return null
      }

      throw new Error(`Unexpected channel ${channel}`)
    })

    await expect(bridge.ping()).resolves.toBe(PING_RESPONSE)
    expect(Object.keys(bridge)).toEqual([
      "ping",
      "menu",
      "projects",
      "projectContextProfiles",
      "prompts",
      "promptTemplates",
      "search",
      "maintenance",
      "privacy",
      "insights",
      "tags",
      "harnessTemplates",
      "settings",
      "secrets",
      "promptCompiler",
      "promptQuality",
      "exports",
      "clipboard",
      "backup",
      "appLock",
    ])
    expect(Object.keys(bridge)).not.toContain("appEvents")
    expect(Object.keys(bridge)).not.toContain("shortcuts")
    expect(Object.keys(bridge.menu)).toEqual(["onAction"])
    expect(Object.keys(bridge.projects)).toEqual(["create", "list", "get", "update", "delete"])
    expect(Object.keys(bridge.projectContextProfiles)).toEqual([
      "create",
      "list",
      "get",
      "getDefault",
      "update",
      "delete",
      "duplicate",
      "setDefault",
      "buildCompilerContext",
    ])
    expect(Object.keys(bridge.prompts)).toEqual([
      "createAsset",
      "listAssets",
      "getAsset",
      "updateAsset",
      "deleteAsset",
      "createVersion",
      "createNextVersion",
      "listVersions",
      "getVersion",
      "getCurrentVersion",
      "setCurrentVersion",
      "compareVersions",
      "createWithInitialVersion",
      "duplicateAsset",
      "createDerivedAsset",
      "getLineage",
    ])
    expect(Object.keys(bridge.prompts)).not.toContain("listChildren")
    expect(Object.keys(bridge.promptTemplates)).toEqual([
      "create",
      "list",
      "get",
      "update",
      "duplicate",
      "delete",
      "createFromVersion",
    ])
    expect(Object.keys(bridge.promptTemplates)).not.toContain("preview")
    expect(Object.keys(bridge.promptTemplates)).not.toContain("extractVariables")
    expect(Object.keys(bridge.search)).toEqual(["searchPrompts", "rebuildIndex"])
    expect(Object.keys(bridge.maintenance)).toEqual([
      "scanLibrary",
      "prepareAction",
      "executeAction",
      "cancelActionSession",
    ])
    expect(Object.keys(bridge.maintenance)).not.toEqual(
      expect.arrayContaining(["mergeTags", "deleteTags", "repairVersions", "rebuildIndex"]),
    )
    expect(Object.keys(bridge.tags)).toEqual([
      "create",
      "list",
      "update",
      "delete",
      "attachToPrompt",
      "detachFromPrompt",
      "listForPrompt",
      "listWithCounts",
      "createAndAttachToPrompt",
    ])
    expect(Object.keys(bridge.harnessTemplates)).toEqual([
      "create",
      "list",
      "get",
      "update",
      "delete",
      "duplicate",
    ])
    expect(Object.keys(bridge.settings)).toEqual([
      "get",
      "set",
      "list",
      "getDefaults",
      "updateDefaults",
    ])
    expect(Object.keys(bridge.secrets)).toEqual([
      "saveOpenAIKey",
      "hasOpenAIKey",
      "getOpenAIKeyStatus",
      "deleteOpenAIKey",
    ])
    expect(Object.keys(bridge.promptCompiler)).toEqual(["analyze", "compile"])
    expect(Object.keys(bridge.promptQuality)).toEqual([
      "reviewDraft",
      "reviewVersion",
      "saveReview",
      "listReviewsForVersion",
      "getLatestReview",
      "getReview",
      "applyScoreToVersion",
      "reviewWithLLM",
    ])
    expect(Object.keys(bridge.exports)).toEqual(["formatPrompt", "savePromptToFile"])
    expect(Object.keys(bridge.clipboard)).toEqual(["copyText", "readText"])
    expect(Object.keys(bridge.backup)).toEqual([
      "exportFullBackup",
      "exportProjectBackup",
      "exportPromptAssetsBackup",
      "exportPromptTemplatesPack",
      "exportHarnessTemplatesPack",
      "validateBackupFile",
      "importBackup",
      "cancelImportSession",
      "prepareEncryptedBackup",
      "savePreparedPlaintextBackup",
      "savePreparedEncryptedBackup",
      "validateEncryptedBackupFile",
      "unlockEncryptedBackup",
    ])
    expect(Object.keys(bridge.appLock)).toEqual([
      "getState",
      "setup",
      "unlock",
      "lock",
      "disable",
      "changePassphrase",
      "getSettings",
      "updateSettings",
    ])
    await expect(bridge.projects.list()).resolves.toEqual([])
    await expect(bridge.settings.get("missing")).resolves.toBeNull()
  })
})
