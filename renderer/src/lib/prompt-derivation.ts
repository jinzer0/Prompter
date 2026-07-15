import type { PromptAsset, PromptVersion } from "../../../electron/ipc-types"
import type { CompiledPromptResult, PromptCompilerInput } from "./prompt-compiler/types"
import { parsePromptVersionMetadata } from "./prompt-version-diff"

export type PromptDerivationDraft = {
  readonly sourcePromptAssetId: string
  readonly sourcePromptVersionId: string
  readonly sourceTitle: string
  readonly draft: PromptCompilerInput
  readonly compiled: CompiledPromptResult
  readonly editablePrompt: string
}

export function buildDerivedPromptDraft(
  sourceAsset: PromptAsset,
  sourceVersion: PromptVersion,
): PromptDerivationDraft {
  const metadata = parsePromptVersionMetadata(sourceVersion)
  const title = `${sourceAsset.title} Derived`

  return {
    sourcePromptAssetId: sourceAsset.id,
    sourcePromptVersionId: sourceVersion.id,
    sourceTitle: sourceAsset.title,
    draft: {
      title,
      originalInput: sourceVersion.originalInput,
      scenario: sourceAsset.scenario,
      targetAgent: sourceAsset.targetAgent,
    },
    compiled: {
      title,
      originalInput: sourceVersion.originalInput,
      compiledPrompt: sourceVersion.compiledPrompt,
      scenario: sourceAsset.scenario,
      targetAgent: sourceAsset.targetAgent,
      assumptions: metadata.assumptions,
      acceptanceCriteria: metadata.acceptanceCriteria,
      validationCommands: metadata.validationCommands,
    },
    editablePrompt: sourceVersion.compiledPrompt,
  }
}

export function duplicatePromptInput(
  sourcePromptAssetId: string,
  sourcePromptVersionId: string | null,
) {
  return {
    sourcePromptAssetId,
    ...(sourcePromptVersionId === null ? {} : { sourcePromptVersionId }),
    copyTags: true,
  }
}
