import { describe, expect, it } from "vitest"

import type { PromptAsset, PromptVersion } from "../electron/ipc-types"
import { currentVersionForAsset } from "../renderer/src/lib/prompt-scope"

const baseAsset: PromptAsset = {
  id: "asset-a",
  projectId: "project-a",
  title: "Asset A",
  scenario: "feature",
  targetAgent: "codex",
  currentVersionId: "version-a",
  parentPromptId: null,
  parentPromptVersionId: null,
  derivationType: null,
  createdAt: 1,
  updatedAt: 2,
}

const baseVersion: PromptVersion = {
  id: "version-a",
  promptAssetId: "asset-a",
  versionNumber: 1,
  originalInput: "input",
  compiledPrompt: "compiled",
  assumptions: null,
  questions: null,
  answers: null,
  acceptanceCriteria: null,
  validationCommands: null,
  qualityScore: null,
  createdAt: 3,
}

describe("prompt version scoping", () => {
  it("returns no current version when loaded versions belong to a previous asset", () => {
    const selectedAsset = { ...baseAsset, id: "asset-b", currentVersionId: "version-b" }
    const previousAssetVersions = { assetId: "asset-a", versions: [baseVersion] }

    expect(currentVersionForAsset(selectedAsset, previousAssetVersions)).toBeNull()
  })

  it("uses a fallback version only when versions are scoped to the selected asset", () => {
    const assetWithoutCurrent = { ...baseAsset, currentVersionId: null }
    const scopedVersions = { assetId: baseAsset.id, versions: [baseVersion] }

    expect(currentVersionForAsset(assetWithoutCurrent, scopedVersions)).toEqual(baseVersion)
  })
})
