import { useState } from "react"

import type {
  CreateNextPromptVersionInput,
  CreatePromptAssetInput,
  CreatePromptVersionInput,
  Project,
  PromptAsset,
  PromptVersion,
} from "../../../electron/ipc-types"
import type { CompiledPromptResult } from "../lib/prompt-compiler/types"
import { versionInputFromCompiled } from "../lib/prompt-compiler/version-input"

type CreatePrompt = (
  assetInput: CreatePromptAssetInput,
  versionInput: Omit<CreatePromptVersionInput, "promptAssetId">,
) => Promise<PromptAsset>

type CreateNextVersion = (input: CreateNextPromptVersionInput) => Promise<PromptVersion>

type SuggestedTagsActions = {
  readonly attachSelectedSuggestedTags: (promptAssetId: string) => Promise<void>
  readonly clearSuggestedTags: () => void
}

type UseCompilerPersistenceActionsConfig = {
  readonly compiled: CompiledPromptResult | null
  readonly createNextVersion: CreateNextVersion
  readonly createPrompt: CreatePrompt
  readonly editablePrompt: string
  readonly onSavedNextVersion: () => void
  readonly selectedAsset: PromptAsset | null
  readonly selectedProject: Project | null
  readonly setMessage: (message: string | null) => void
  readonly suggestedTags: SuggestedTagsActions
}

export function useCompilerPersistenceActions({
  compiled,
  createNextVersion,
  createPrompt,
  editablePrompt,
  onSavedNextVersion,
  selectedAsset,
  selectedProject,
  setMessage,
  suggestedTags,
}: UseCompilerPersistenceActionsConfig) {
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingNextVersion, setIsSavingNextVersion] = useState(false)

  async function savePrompt(): Promise<void> {
    if (selectedProject === null) {
      setMessage("Select a project before saving compiled prompt")
      return
    }

    if (compiled === null || editablePrompt.trim().length === 0) {
      setMessage("Compile a prompt before saving")
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      const asset = await createPrompt(
        {
          projectId: selectedProject.id,
          title: compiled.title,
          scenario: compiled.scenario,
          targetAgent: compiled.targetAgent,
        },
        versionInputFromCompiled(compiled, editablePrompt.trim()),
      )
      await window.prompter.search.rebuildIndex()
      await suggestedTags.attachSelectedSuggestedTags(asset.id)
      setMessage("Compiled prompt saved.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Compiled prompt could not be saved")
    } finally {
      setIsSaving(false)
    }
  }

  async function saveNextVersion(): Promise<void> {
    if (selectedAsset === null) {
      setMessage("Select a prompt before saving a new version")
      return
    }

    if (compiled === null || editablePrompt.trim().length === 0) {
      setMessage("Compile a prompt before saving a new version")
      return
    }

    setIsSavingNextVersion(true)
    setMessage(null)

    try {
      await createNextVersion({
        promptAssetId: selectedAsset.id,
        ...versionInputFromCompiled(compiled, editablePrompt.trim()),
        makeCurrent: true,
      })
      await window.prompter.search.rebuildIndex()
      await suggestedTags.attachSelectedSuggestedTags(selectedAsset.id)
      onSavedNextVersion()
      setMessage("Saved as a new version.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Prompt version could not be saved")
    } finally {
      setIsSavingNextVersion(false)
    }
  }

  async function copyPrompt(): Promise<void> {
    if (editablePrompt.trim().length === 0) {
      setMessage("Compiled prompt is not available to copy")
      return
    }

    try {
      await window.prompter.clipboard.copyText({ text: editablePrompt })
      setMessage("Compiled prompt copied.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Compiled prompt could not be copied")
    }
  }

  return {
    copyPrompt,
    isSaving,
    isSavingNextVersion,
    saveNextVersion,
    savePrompt,
  }
}
