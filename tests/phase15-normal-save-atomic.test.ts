import { readFile } from "node:fs/promises"
import { afterEach, describe, expect, it, vi } from "vitest"

import type {
  CreatePromptWithInitialVersionInput,
  CreatePromptWithInitialVersionResult,
  Project,
  PromptAsset,
  PromptVersion,
} from "../electron/ipc-types"
import { createPromptWithVersion } from "../renderer/src/hooks/prompt-library-data"
import {
  type ExecuteCompiledPromptSaveActions,
  executeCompiledPromptSave,
  promptSaveDisabledReasons,
} from "../renderer/src/hooks/use-compiler-persistence-actions"
import type { CompiledPromptResult } from "../renderer/src/lib/prompt-compiler/types"

const projectId = "11111111-1111-4111-8111-111111111111"
const assetId = "22222222-2222-4222-8222-222222222222"
const versionId = "33333333-3333-4333-8333-333333333333"

const project = {
  id: projectId,
  name: "Atomic saves",
  description: null,
  techStack: null,
  defaultAgent: "codex",
  createdAt: 1,
  updatedAt: 1,
} satisfies Project

const asset = {
  id: assetId,
  projectId,
  title: "Atomic prompt",
  scenario: "feature",
  targetAgent: "codex",
  currentVersionId: versionId,
  parentPromptId: null,
  parentPromptVersionId: null,
  derivationType: null,
  createdAt: 1,
  updatedAt: 1,
} satisfies PromptAsset

const version = {
  id: versionId,
  promptAssetId: assetId,
  versionNumber: 1,
  originalInput: "Create atomically",
  compiledPrompt: "# Objective\nCreate atomically",
  assumptions: null,
  questions: null,
  answers: null,
  acceptanceCriteria: null,
  validationCommands: null,
  qualityScore: null,
  createdAt: 1,
} satisfies PromptVersion

const createInput = {
  projectId,
  title: asset.title,
  scenario: asset.scenario,
  targetAgent: asset.targetAgent,
  originalInput: version.originalInput,
  compiledPrompt: version.compiledPrompt,
} satisfies CreatePromptWithInitialVersionInput

const compiled = {
  title: asset.title,
  originalInput: version.originalInput,
  compiledPrompt: version.compiledPrompt,
  scenario: asset.scenario,
  targetAgent: asset.targetAgent,
  assumptions: ["Keep writes atomic"],
  acceptanceCriteria: ["The prompt is saved"],
  validationCommands: ["npm run typecheck"],
  qualityScore: 91,
} satisfies CompiledPromptResult

afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(globalThis, "window")
})

describe("Phase 15 normal prompt saves", () => {
  it("creates a library prompt with one atomic bridge command", async () => {
    const createWithInitialVersion = vi.fn(
      async (
        _input: CreatePromptWithInitialVersionInput,
      ): Promise<CreatePromptWithInitialVersionResult> => ({
        asset,
        version,
      }),
    )
    const createAsset = vi.fn(async () => asset)
    const createVersion = vi.fn(async () => version)
    const setCurrentVersion = vi.fn(async () => asset)
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        prompter: {
          prompts: {
            createAsset,
            createVersion,
            createWithInitialVersion,
            getCurrentVersion: vi.fn(async () => version),
            listAssets: vi.fn(async () => [asset]),
            setCurrentVersion,
          },
        },
      },
    })

    const snapshot = await createPromptWithVersion(projectId, createInput)

    expect(createWithInitialVersion).toHaveBeenCalledOnce()
    expect(createWithInitialVersion).toHaveBeenCalledWith(createInput)
    expect(createAsset).not.toHaveBeenCalled()
    expect(createVersion).not.toHaveBeenCalled()
    expect(setCurrentVersion).not.toHaveBeenCalled()
    expect(snapshot).toEqual({ asset, assets: [asset], summaries: [{ assetId, version }], version })
  })

  it("includes selected suggested tags in a compiled prompt atomic create", async () => {
    const createPrompt = vi.fn(
      async (
        _input: CreatePromptWithInitialVersionInput,
      ): Promise<CreatePromptWithInitialVersionResult> => ({
        asset,
        version,
      }),
    )
    const onTagsChanged = vi.fn()
    const setIsSaving = vi.fn()
    const setMessage = vi.fn()
    const actions: ExecuteCompiledPromptSaveActions = {
      createPrompt,
      onTagsChanged,
      setIsSaving,
      setMessage,
    }

    await executeCompiledPromptSave(
      {
        compiled,
        editablePrompt: "  # Objective\nCreate atomically  ",
        selectedProject: project,
        tagNames: ["atomic", "compiler"],
      },
      actions,
    )

    expect(createPrompt).toHaveBeenCalledOnce()
    expect(createPrompt.mock.calls[0]?.[0]).not.toHaveProperty("qualityScore")
    expect(createPrompt).toHaveBeenCalledWith({
      projectId,
      title: asset.title,
      scenario: asset.scenario,
      targetAgent: asset.targetAgent,
      originalInput: version.originalInput,
      compiledPrompt: version.compiledPrompt,
      assumptions: JSON.stringify(compiled.assumptions),
      questions: JSON.stringify([]),
      answers: JSON.stringify([]),
      acceptanceCriteria: compiled.acceptanceCriteria.join("\n"),
      validationCommands: compiled.validationCommands.join("\n"),
      tagNames: ["atomic", "compiler"],
    })
    expect(onTagsChanged).toHaveBeenCalledOnce()
    expect(setIsSaving).toHaveBeenNthCalledWith(1, true)
    expect(setIsSaving).toHaveBeenLastCalledWith(false)
    expect(setMessage).toHaveBeenLastCalledWith("Compiled prompt saved.")
  })

  it("reports missing title and original input as explicit save-disabled reasons", () => {
    expect(
      promptSaveDisabledReasons({
        compiled: { ...compiled, title: " ", originalInput: "" },
        editablePrompt: "Rendered output",
        selectedProject: project,
      }),
    ).toEqual(["Prompt title is required", "Original request is required"])
  })

  it("restores save state and reports the atomic create failure", async () => {
    const createPrompt = vi.fn(async (_input: CreatePromptWithInitialVersionInput) => {
      throw new Error("Atomic create failed")
    })
    const onTagsChanged = vi.fn()
    const setIsSaving = vi.fn()
    const setMessage = vi.fn()

    await executeCompiledPromptSave(
      {
        compiled,
        editablePrompt: version.compiledPrompt,
        selectedProject: project,
        tagNames: ["atomic"],
      },
      { createPrompt, onTagsChanged, setIsSaving, setMessage },
    )

    expect(onTagsChanged).not.toHaveBeenCalled()
    expect(setIsSaving).toHaveBeenNthCalledWith(1, true)
    expect(setIsSaving).toHaveBeenLastCalledWith(false)
    expect(setMessage).toHaveBeenLastCalledWith("Atomic create failed")
  })

  it("keeps post-create rebuild and tag attachment out of new save paths", async () => {
    const [librarySource, compilerSource] = await Promise.all([
      readFile("renderer/src/hooks/use-prompt-library-panel.ts", "utf8"),
      readFile("renderer/src/hooks/use-compiler-persistence-actions.ts", "utf8"),
    ])
    const compilerCreatePath = compilerSource.slice(
      compilerSource.indexOf("export async function executeCompiledPromptSave"),
      compilerSource.indexOf("export function useCompilerPersistenceActions"),
    )

    expect(librarySource).not.toContain("search.rebuildIndex")
    expect(compilerCreatePath).not.toContain("search.rebuildIndex")
    expect(compilerCreatePath).not.toContain("attachSelectedSuggestedTags")
    expect(compilerSource).toContain("suggestedTags.attachSelectedSuggestedTags(selectedAsset.id)")
  })
})
