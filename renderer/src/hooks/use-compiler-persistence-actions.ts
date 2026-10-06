import { useRef, useState } from "react"

import type {
  CreateDerivedPromptAssetInput,
  CreateNextPromptVersionInput,
  CreatePromptWithInitialVersionResult,
  Project,
  PromptAsset,
  PromptVersion,
} from "../../../electron/ipc-types"
import {
  executeCompiledPromptSave,
  promptSaveDisabledReasons,
} from "../lib/compiler-persistence-save"
import {
  COMPILER_PROJECT_REBIND_REQUIRED_MESSAGE,
  type CompilerProjectBinding,
  executeGuardedCompilerPersistence,
} from "../lib/compiler-project-binding"
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

type UseCompilerPersistenceActionsConfig = {
  readonly binding: CompilerProjectBinding
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

export {
  type ExecuteCompiledPromptSaveActions,
  executeCompiledPromptSave,
  promptSaveDisabledReasons,
} from "../lib/compiler-persistence-save"

export function useCompilerPersistenceActions({
  binding,
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
  const savingNextVersion = useRef(false)
  const [pendingSavedRefreshes, setPendingSavedRefreshes] = useState<
    readonly (() => Promise<void>)[]
  >([])
  const saveDisabledReasons = promptSaveDisabledReasons({
    compiled,
    editablePrompt,
    selectedProject,
  })

  async function savePrompt(): Promise<void> {
    const action = derivedPromptSource === null ? "save_prompt" : "save_derived"
    const guardResult = await executeGuardedCompilerPersistence(
      { action, binding, currentProjectId: selectedProject?.id ?? null },
      () => undefined,
    )
    if (guardResult === "blocked") {
      setMessage(COMPILER_PROJECT_REBIND_REQUIRED_MESSAGE)
      return
    }

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
        binding,
        compiled,
        editablePrompt,
        selectedProject,
        tagNames: suggestedTags.selectedSuggestedTags,
      },
      { createPrompt, onTagsChanged, setIsSaving, setMessage },
    )
  }

  async function saveNextVersion(): Promise<void> {
    if (savingNextVersion.current) return
    const guardResult = await executeGuardedCompilerPersistence(
      { action: "save_next_version", binding, currentProjectId: selectedProject?.id ?? null },
      () => undefined,
    )
    if (guardResult === "blocked") {
      setMessage(COMPILER_PROJECT_REBIND_REQUIRED_MESSAGE)
      return
    }

    if (selectedAsset === null) {
      setMessage("Select a prompt before saving a new version")
      return
    }

    if (compiled === null || editablePrompt.trim().length === 0) {
      setMessage("Compile a prompt before saving a new version")
      return
    }

    if (savingNextVersion.current) return
    savingNextVersion.current = true
    setIsSavingNextVersion(true)
    setMessage(null)

    try {
      await createNextVersion({
        promptAssetId: selectedAsset.id,
        ...versionInputFromCompiled(compiled, editablePrompt.trim()),
        makeCurrent: true,
      })
      const refresh = async () => {
        await window.prompter.search.rebuildIndex()
        await suggestedTags.attachSelectedSuggestedTags(selectedAsset.id)
      }
      setPendingSavedRefreshes((pending) => [...pending, refresh])
      onSavedNextVersion()
      try {
        await refresh()
        setPendingSavedRefreshes((pending) => pending.filter((item) => item !== refresh))
        setMessage("Saved as a new version.")
      } catch {
        setMessage(
          "버전은 저장됐지만 목록·태그 갱신을 완료하지 못했습니다. 갱신 재시도는 새 버전을 만들지 않습니다.",
        )
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Prompt version could not be saved")
    } finally {
      savingNextVersion.current = false
      setIsSavingNextVersion(false)
    }
  }

  async function retrySavedRefresh(): Promise<void> {
    if (pendingSavedRefreshes.length === 0 || savingNextVersion.current) return
    savingNextVersion.current = true
    setIsSavingNextVersion(true)
    try {
      for (const refresh of pendingSavedRefreshes) {
        await refresh()
        setPendingSavedRefreshes((pending) => pending.filter((item) => item !== refresh))
      }
      setMessage("저장 후 목록·태그 갱신을 완료했습니다.")
    } catch {
      setMessage("버전은 저장됐지만 목록·태그 갱신을 완료하지 못했습니다. 다시 갱신해 주세요.")
    } finally {
      savingNextVersion.current = false
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
    hasPendingSavedRefresh: pendingSavedRefreshes.length > 0,
    retrySavedRefresh,
    saveDisabledReasons,
    saveNextVersion,
    savePrompt,
  }
}
