import { readFileSync } from "node:fs"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import type { BackupValidationPreview, Project, PromptAsset } from "../electron/ipc-types"
import { BackupSettingsPanel } from "../renderer/src/components/backup/backup-settings-panel"
import { selectedAssetId, selectedProjectId } from "../renderer/src/hooks/prompt-library-data"
import {
  canSubmitBackupImport,
  importBackupInputFromPreview,
} from "../renderer/src/hooks/use-backup"

const project = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Phase 16 Destination",
  description: null,
  techStack: null,
  defaultAgent: null,
  createdAt: 1,
  updatedAt: 1,
} satisfies Project

const importedProject = {
  ...project,
  id: "22222222-2222-4222-8222-222222222222",
  name: "Imported Project",
} satisfies Project

const promptAsset = {
  id: "33333333-3333-4333-8333-333333333333",
  projectId: project.id,
  title: "Selected prompt",
  scenario: "feature",
  targetAgent: "codex",
  currentVersionId: null,
  parentPromptId: null,
  parentPromptVersionId: null,
  derivationType: null,
  createdAt: 1,
  updatedAt: 1,
} satisfies PromptAsset

const importedPromptAsset = {
  ...promptAsset,
  id: "44444444-4444-4444-8444-444444444444",
  title: "Imported prompt",
} satisfies PromptAsset

const preview = {
  importSessionId: "55555555-5555-4555-8555-555555555555",
  previewFingerprint: "a".repeat(64),
  previewRevision: 1,
  backupType: "prompt_assets",
  schemaVersion: 1,
  exportedAt: 10,
  itemCounts: {
    projects: 0,
    projectContextProfiles: 0,
    promptAssets: 1,
    promptVersions: 1,
    tags: 0,
    promptTags: 0,
    harnessTemplates: 0,
    promptTemplates: 0,
    promptQualityReviews: 0,
  },
  conflicts: [],
  warnings: [{ code: "external_ref", message: "External references become empty copies." }],
  consequences: [{ code: "copies", message: "Import adds prompt copies.", count: 1 }],
  requiresDestinationProject: true,
  excludesSecrets: true,
  excludesSecretStatus: true,
  includesSettings: false,
  plaintext: true,
  expiresAt: 20,
} satisfies BackupValidationPreview

describe("phase16 backup settings UI contracts", () => {
  it("routes backup menu actions through stable renderer targets", () => {
    const menuActionSource = readFileSync("renderer/src/lib/menu-actions.ts", "utf8")

    expect(menuActionSource).toContain('case "exportFullBackup"')
    expect(menuActionSource).toContain('clickMenuTarget("backup-export-full")')
    expect(menuActionSource).toContain('case "importBackup"')
    expect(menuActionSource).toContain('clickMenuTarget("backup-import-open")')
  })

  it("renders stable backup menu targets and plaintext/safe-duplicate copy", () => {
    const markup = renderToStaticMarkup(
      createElement(BackupSettingsPanel, {
        projects: [project],
        selectedPromptAssetId: promptAsset.id,
        selectedProjectId: project.id,
        onImportComplete: async () => undefined,
        onViewImportedProject: () => undefined,
      }),
    )

    expect(markup).toContain('data-menu-action-target="backup-export-full"')
    expect(markup).toContain('data-menu-action-target="backup-export-project"')
    expect(markup).toContain('data-menu-action-target="backup-export-prompt-assets"')
    expect(markup).toContain('data-menu-action-target="backup-export-prompt-templates"')
    expect(markup).toContain('data-menu-action-target="backup-export-harness-templates"')
    expect(markup).toContain('data-menu-action-target="backup-import-open"')
    expect(markup.match(/backup-action-button/g)?.length ?? 0).toBe(6)
    expect(markup).toContain("Export selected prompt pack")
    expect(markup).toContain("Export prompt templates")
    expect(markup).toContain("Export harness templates")
    expect(markup).toContain("Backup files are plaintext JSON")
    expect(markup).toContain("Import adds copies and never overwrites")
  })

  it("routes all scoped export controls through approved backup bridge methods", () => {
    const hookSource = readFileSync("renderer/src/hooks/use-backup.ts", "utf8")

    expect(hookSource).toContain("window.prompter.backup.exportFullBackup({})")
    expect(hookSource).toContain("window.prompter.backup.exportProjectBackup({ projectId })")
    expect(hookSource).toContain("window.prompter.backup.exportPromptAssetsBackup({")
    expect(hookSource).toContain("promptAssetIds: [promptAssetId]")
    expect(hookSource).toContain(
      "window.prompter.backup.exportPromptTemplatesPack({ includeAll: true })",
    )
    expect(hookSource).toContain("window.prompter.backup.exportHarnessTemplatesPack({")
    expect(hookSource).toContain("includeAllUserTemplates: true")
    expect(hookSource).not.toContain("filePath")
  })

  it("requires explicit confirmation and destination before prompt asset import", () => {
    expect(
      canSubmitBackupImport({
        destinationProjectId: "",
        isWorking: false,
        isImportConfirmed: false,
        preview,
      }),
    ).toBe(false)

    expect(
      canSubmitBackupImport({
        destinationProjectId: "",
        isWorking: false,
        isImportConfirmed: true,
        preview,
      }),
    ).toBe(false)

    expect(
      canSubmitBackupImport({
        destinationProjectId: project.id,
        isWorking: false,
        isImportConfirmed: true,
        preview,
      }),
    ).toBe(true)
  })

  it("builds import payload from session proof fields without trusted confirmation", () => {
    const input = importBackupInputFromPreview(preview, project.id)

    expect(input).toEqual({
      importSessionId: preview.importSessionId,
      previewFingerprint: preview.previewFingerprint,
      previewRevision: preview.previewRevision,
      strategy: "safe_duplicate",
      destinationProjectId: project.id,
    })
    expect("confirmed" in input).toBe(false)
  })

  it("preserves empty selections during import refresh instead of auto-selecting imported rows", () => {
    expect(selectedProjectId(null, [importedProject], { preserveSelection: true })).toBeNull()
    expect(selectedAssetId(null, [importedPromptAsset], { preserveSelection: true })).toBeNull()
  })

  it("preserves existing selections during import refresh and does not switch to imported rows", () => {
    expect(
      selectedProjectId(project.id, [importedProject, project], { preserveSelection: true }),
    ).toBe(project.id)
    expect(
      selectedAssetId(promptAsset.id, [importedPromptAsset, promptAsset], {
        preserveSelection: true,
      }),
    ).toBe(promptAsset.id)
  })

  it("keeps backup import refresh isolated from compiler draft and review state", () => {
    const appSource = readFileSync("renderer/src/app.tsx", "utf8")
    const refreshStart = appSource.indexOf("async function refreshAfterBackupImport")
    const refreshEnd = appSource.indexOf("useEffect", refreshStart)
    const refreshBody = appSource.slice(refreshStart, refreshEnd)

    expect(refreshStart).toBeGreaterThan(-1)
    expect(refreshBody).toContain("reloadProjects({ preserveSelection: true })")
    expect(refreshBody).toContain("reloadAssets({ preserveSelection: true })")
    expect(refreshBody).not.toContain("setDraft")
    expect(refreshBody).not.toContain("clearStaleOutput")
    expect(refreshBody).not.toContain("setCompiled")
    expect(refreshBody).not.toContain("setReview")
  })
})
