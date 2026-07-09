import type {
  ComparePromptVersionsResult,
  CreateNextPromptVersionInput,
  CreatePromptAssetInput,
  CreatePromptVersionInput,
  Project,
  PromptAsset,
  PromptVersion,
} from "../../../electron/ipc-types"

export type LoadStatus = "loading" | "ready" | "error"

export type ScopedPromptAssets = {
  readonly projectId: string
  readonly assets: readonly PromptAsset[]
}

export type PromptVersionSummary = {
  readonly assetId: string
  readonly version: PromptVersion | null
}

export type ScopedPromptVersionSummaries = {
  readonly projectId: string
  readonly summaries: readonly PromptVersionSummary[]
}

type PromptAssetsSnapshot = {
  readonly assets: readonly PromptAsset[]
  readonly summaries: readonly PromptVersionSummary[]
}

type CreatedPromptVersionSnapshot = PromptAssetsSnapshot & {
  readonly asset: PromptAsset
  readonly version: PromptVersion
}

type PromptVersionMutationSnapshot = CreatedPromptVersionSnapshot & {
  readonly versions: readonly PromptVersion[]
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected persistence error"
}

export function selectedProjectId(
  current: string | null,
  projects: readonly Project[],
): string | null {
  if (current !== null && projects.some((project) => project.id === current)) {
    return current
  }

  return projects[0]?.id ?? null
}

export function selectedAssetId(
  current: string | null,
  assets: readonly PromptAsset[],
): string | null {
  if (current !== null && assets.some((asset) => asset.id === current)) {
    return current
  }

  return assets[0]?.id ?? null
}

export function selectedPromptVersionId(
  current: string | null,
  asset: PromptAsset,
  versions: readonly PromptVersion[],
): string | null {
  if (current !== null && versions.some((version) => version.id === current)) {
    return current
  }

  const currentVersionId = asset.currentVersionId

  if (currentVersionId !== null && versions.some((version) => version.id === currentVersionId)) {
    return currentVersionId
  }

  return versions[0]?.id ?? null
}

async function loadCurrentVersionSummaries(
  assets: readonly PromptAsset[],
): Promise<readonly PromptVersionSummary[]> {
  return Promise.all(
    assets.map(async (asset) => ({
      assetId: asset.id,
      version: await window.prompter.prompts.getCurrentVersion(asset.id),
    })),
  )
}

export async function loadPromptAssets(projectId: string): Promise<PromptAssetsSnapshot> {
  const assets = await window.prompter.prompts.listAssets({ projectId })
  const summaries = await loadCurrentVersionSummaries(assets)

  return { assets, summaries }
}

export async function createPromptWithVersion(
  projectId: string,
  assetInput: CreatePromptAssetInput,
  versionInput: Omit<CreatePromptVersionInput, "promptAssetId">,
): Promise<CreatedPromptVersionSnapshot> {
  const asset = await window.prompter.prompts.createAsset(assetInput)
  const version = await window.prompter.prompts.createVersion({
    ...versionInput,
    promptAssetId: asset.id,
  })
  const currentAsset = await window.prompter.prompts.setCurrentVersion(asset.id, version.id)
  const { assets, summaries } = await loadPromptAssets(projectId)

  return { asset: currentAsset, assets, summaries, version }
}

export async function createNextPromptVersionState(
  projectId: string,
  input: CreateNextPromptVersionInput,
): Promise<PromptVersionMutationSnapshot> {
  const result = await window.prompter.prompts.createNextVersion(input)
  const versions = await window.prompter.prompts.listVersions(result.asset.id)
  const { assets, summaries } = await loadPromptAssets(projectId)

  return { asset: result.asset, assets, summaries, version: result.version, versions }
}

export async function setCurrentPromptVersionState(
  projectId: string,
  promptAssetId: string,
  promptVersionId: string,
): Promise<Omit<PromptVersionMutationSnapshot, "version">> {
  const asset = await window.prompter.prompts.setCurrentVersion(promptAssetId, promptVersionId)
  const versions = await window.prompter.prompts.listVersions(asset.id)
  const { assets, summaries } = await loadPromptAssets(projectId)

  return { asset, assets, summaries, versions }
}

export async function comparePromptVersions(
  baseVersionId: string,
  compareVersionId: string,
): Promise<ComparePromptVersionsResult> {
  return window.prompter.prompts.compareVersions(baseVersionId, compareVersionId)
}
