import type {
  ComparePromptVersionsResult,
  Project,
  PromptAsset,
  PromptVersion,
} from "../../../electron/ipc-types"
import type { LoadStatus } from "../hooks/use-prompter-library"
import { PromptVersionManagement } from "./prompt-version-management"
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { EmptyState } from "./ui/empty-state"

type PromptCompilerDetailSectionProps = {
  readonly assets: readonly PromptAsset[]
  readonly compareVersions: (
    baseVersionId: string,
    compareVersionId: string,
  ) => Promise<ComparePromptVersionsResult>
  readonly currentVersion: PromptVersion | null
  readonly error: string | null
  readonly selectedAsset: PromptAsset | null
  readonly selectedProject: Project | null
  readonly selectedVersion: PromptVersion | null
  readonly status: LoadStatus
  readonly versions: readonly PromptVersion[]
  readonly onDerivePrompt: (asset: PromptAsset, version: PromptVersion) => void
  readonly onDuplicatePrompt: (asset: PromptAsset, version: PromptVersion) => Promise<void>
  readonly onNavigatePrompt: (id: string) => void
  readonly onPromptTemplatesChanged: () => void
  readonly onSelectVersion: (id: string) => void
  readonly onSetCurrentVersion: (promptAssetId: string, versionId: string) => Promise<void>
}

export function PromptCompilerDetailSection({
  assets,
  compareVersions,
  currentVersion,
  error,
  selectedAsset,
  selectedProject,
  selectedVersion,
  status,
  versions,
  onDerivePrompt,
  onDuplicatePrompt,
  onNavigatePrompt,
  onPromptTemplatesChanged,
  onSelectVersion,
  onSetCurrentVersion,
}: PromptCompilerDetailSectionProps) {
  return (
    <>
      {selectedProject === null && (
        <EmptyState
          label="Detail state"
          title="Select a project first"
          description="Compile previews are local, but saving requires a selected project."
        />
      )}

      {selectedProject !== null && selectedAsset === null && (
        <EmptyState
          label="Detail state"
          title="Select a prompt to view details"
          description="New prompts will show their current version here."
        />
      )}

      {selectedAsset !== null && status === "loading" && (
        <p className="text-[12px] text-muted">Loading prompt detail...</p>
      )}
      {selectedAsset !== null && status === "error" && (
        <p className="text-[12px] text-muted-strong">{error}</p>
      )}

      {selectedAsset !== null && status === "ready" && currentVersion === null && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedAsset.title}</CardTitle>
            <CardDescription>No current version is set for this prompt asset.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {selectedAsset !== null && status === "ready" && currentVersion !== null && (
        <PromptVersionManagement
          compareVersions={compareVersions}
          currentVersion={currentVersion}
          sameProjectAssets={assets}
          selectedAsset={selectedAsset}
          selectedVersion={selectedVersion}
          projectName={selectedProject?.name ?? null}
          selectVersion={onSelectVersion}
          setCurrentVersion={onSetCurrentVersion}
          versions={versions}
          onDerivePrompt={onDerivePrompt}
          onDuplicatePrompt={onDuplicatePrompt}
          onNavigatePrompt={onNavigatePrompt}
          onPromptTemplateSaved={onPromptTemplatesChanged}
        />
      )}
    </>
  )
}
