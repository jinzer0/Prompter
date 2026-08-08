import type {
  ComparePromptVersionsResult,
  CreateDerivedPromptAssetInput,
  CreateNextPromptVersionInput,
  CreatePromptWithInitialVersionResult,
  DuplicatePromptAssetInput,
  Project,
  PromptAsset,
  PromptVersion,
} from "../../../electron/ipc-types"
import type { CreatePrompt } from "../hooks/prompt-library-data"
import type { LoadStatus } from "../hooks/use-prompter-library"
import type { CompilerStatePreservationRequest } from "../lib/compiler-project-binding"

export type PromptCompilerPanelProps = {
  readonly assets: readonly PromptAsset[]
  readonly compareVersions: (
    baseVersionId: string,
    compareVersionId: string,
  ) => Promise<ComparePromptVersionsResult>
  readonly createDerivedAsset: (
    input: CreateDerivedPromptAssetInput,
  ) => Promise<CreatePromptWithInitialVersionResult>
  readonly createNextVersion: (input: CreateNextPromptVersionInput) => Promise<PromptVersion>
  readonly createPrompt: CreatePrompt
  readonly duplicateAsset: (
    input: DuplicatePromptAssetInput,
  ) => Promise<CreatePromptWithInitialVersionResult>
  readonly changedProjectContextProfileId: string | null
  readonly compilerStatePreservationRequest: CompilerStatePreservationRequest | null
  readonly currentVersion: PromptVersion | null
  readonly deletedHarnessTemplateIds: readonly string[]
  readonly deletedProjectContextProfileIds: readonly string[]
  readonly error: string | null
  readonly harnessTemplateRefreshSignal: number
  readonly projectContextProfileRefreshSignal: number
  readonly promptTemplateRefreshSignal: number
  readonly selectedAsset: PromptAsset | null
  readonly selectedVersion: PromptVersion | null
  readonly selectedProject: Project | null
  readonly selectAsset: (id: string) => void
  readonly selectVersion: (id: string) => void
  readonly setCurrentVersion: (promptAssetId: string, versionId: string) => Promise<void>
  readonly status: LoadStatus
  readonly versions: readonly PromptVersion[]
  readonly onPromptTemplatesChanged: () => void
  readonly onTagsChanged: () => void
}
