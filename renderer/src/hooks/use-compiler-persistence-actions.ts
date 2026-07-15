import { useState } from "react"

import type {
  CreateDerivedPromptAssetInput,
  CreateNextPromptVersionInput,
  CreatePromptWithInitialVersionResult,
  Project,
  PromptAsset,
  PromptVersion,
} from "../../../electron/ipc-types"
import type { CompiledPromptResult } from "../lib/prompt-compiler/types"
import { versionInputFromCompiled } from "../lib/prompt-compiler/version-input"
import type { CreatePrompt } from "./prompt-library-data"

type CreateNextVersion = (input: CreateNextPromptVersionInput) => Promise<PromptVersion>
type CreateDerivedAsset = (
  input: CreateDerivedPromptAssetInput,
) => Promise<CreatePromptWithInitialVersionResult>

export type DerivedPromptSaveSource = {
  readonly sourcePromptAssetId: string
  readonly sourcePromptVersionId: string
}

type SuggestedTagsActions = {
  readonly attachSelectedSuggestedTags: (promptAssetId: string) => Promise<void>
  readonly clearSuggestedTags: () => void
  readonly selectedSuggestedTags: readonly string[]
}

type ExecuteCompiledPromptSaveInput = {
  readonly compiled: CompiledPromptResult | null
  readonly editablePrompt: string
  readonly selectedProject: Project | null
  readonly tagNames: readonly string[]
}

export function promptSaveDisabledReasons(
  input: Pick<ExecuteCompiledPromptSaveInput, "compiled" | "editablePrompt" | "selectedProject">,
): readonly string[] {
  const reasons: string[] = []

  if (input.selectedProject === null) {
    reasons.push("Select a project before saving compiled prompt")
  }

  if (input.compiled === null) {
    reasons.push("Compile a prompt before saving")
    return reasons
  }

  if (input.compiled.title.trim().length === 0) {
    reasons.push("Prompt title is required")
  }
  if (input.compiled.originalInput.trim().length === 0) {
    reasons.push("Original request is required")
  }
  if (input.editablePrompt.trim().length === 0) {
    reasons.push("Compiled prompt output is required")
  }

  return reasons
}

export type ExecuteCompiledPromptSaveActions = {
  readonly createPrompt: CreatePrompt
  readonly onTagsChanged: () => void
  readonly setIsSaving: (isSaving: boolean) => void
  readonly setMessage: (message: string | null) => void
}

type UseCompilerPersistenceActionsConfig = {
  readonly compiled: CompiledPromptResult | null
  readonly createDerivedAsset: CreateDerivedAsset
  readonly createNextVersion: CreateNextVersion
  readonly createPrompt: CreatePrompt
  readonly derivedPromptSource: DerivedPromptSaveSource | null
  readonly editablePrompt: string
  readonly onTagsChanged: () => void
  readonly onSavedNextVersion: () => void
  readonly selectedAsset: PromptAsset | null
  readonly selectedProject: Project | null
  readonly setMessage: (message: string | null) => void
  readonly suggestedTags: SuggestedTagsActions
}

export async function executeCompiledPromptSave(
  input: ExecuteCompiledPromptSaveInput,
  actions: ExecuteCompiledPromptSaveActions,
): Promise<void> {
  if (input.selectedProject === null) {
    actions.setMessage("Select a project before saving compiled prompt")
    return
  }

  if (input.compiled === null) {
    actions.setMessage("Compile a prompt before saving")
    return
  }

  const [disabledReason] = promptSaveDisabledReasons(input)

  if (disabledReason !== undefined) {
    actions.setMessage(disabledReason)
    return
  }

  const { compiled, selectedProject } = input

  actions.setIsSaving(true)
  actions.setMessage(null)

  try {
    await actions.createPrompt({
      projectId: selectedProject.id,
      title: compiled.title,
      scenario: compiled.scenario,
      targetAgent: compiled.targetAgent,
      ...versionInputFromCompiled(compiled, input.editablePrompt.trim()),
      tagNames: [...input.tagNames],
    })

    if (input.tagNames.length > 0) {
      actions.onTagsChanged()
    }

    actions.setMessage("Compiled prompt saved.")
  } catch (error) {
    actions.setMessage(
      error instanceof Error ? error.message : "Compiled prompt could not be saved",
    )
  } finally {
    actions.setIsSaving(false)
  }
}

export function useCompilerPersistenceActions({
  compiled,
  createDerivedAsset,
  createNextVersion,
  createPrompt,
  derivedPromptSource,
  editablePrompt,
  onTagsChanged,
  onSavedNextVersion,
  selectedAsset,
  selectedProject,
  setMessage,
  suggestedTags,
}: UseCompilerPersistenceActionsConfig) {
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingNextVersion, setIsSavingNextVersion] = useState(false)
  const saveDisabledReasons = promptSaveDisabledReasons({
    compiled,
    editablePrompt,
    selectedProject,
  })

  async function savePrompt(): Promise<void> {
    if (derivedPromptSource !== null) {
      if (compiled === null) {
        setMessage("Compile a prompt before saving")
        return
      }

      const [disabledReason] = promptSaveDisabledReasons({
        compiled,
        editablePrompt,
        selectedProject,
      })

      if (disabledReason !== undefined) {
        setMessage(disabledReason)
        return
      }

      setIsSaving(true)
      setMessage(null)

      try {
        await createDerivedAsset({
          ...derivedPromptSource,
          title: compiled.title,
          ...versionInputFromCompiled(compiled, editablePrompt.trim()),
          tagNames: [...suggestedTags.selectedSuggestedTags],
        })
        if (suggestedTags.selectedSuggestedTags.length > 0) {
          onTagsChanged()
        }
        setMessage("Derived prompt saved.")
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Derived prompt could not be saved")
      } finally {
        setIsSaving(false)
      }
      return
    }

    await executeCompiledPromptSave(
      {
        compiled,
        editablePrompt,
        selectedProject,
        tagNames: suggestedTags.selectedSuggestedTags,
      },
      { createPrompt, onTagsChanged, setIsSaving, setMessage },
    )
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
    saveDisabledReasons,
    saveNextVersion,
    savePrompt,
  }
}
