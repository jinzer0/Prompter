import { describe, expect, it } from "vitest"

import {
  findDuplicatePromptCandidates,
  findDuplicateTagGroups,
  type MaintenancePromptAssetRow,
  type MaintenancePromptVersionRow,
} from "../electron/maintenance/duplicate-detection"
import {
  planCurrentVersionRepairs,
  planSearchIndexHealth,
  planSelectedCurrentVersionRepairPreviews,
} from "../electron/maintenance/version-planning"

function promptAsset(
  id: string,
  title: string,
  overrides: Partial<Omit<MaintenancePromptAssetRow, "id" | "title">> = {},
): MaintenancePromptAssetRow {
  return {
    id,
    title,
    scenario: "feature",
    targetAgent: "codex",
    currentVersionId: `v${id}`,
    ...overrides,
  }
}

function promptVersion(
  id: string,
  promptAssetId: string,
  overrides: Partial<Omit<MaintenancePromptVersionRow, "id" | "promptAssetId">> = {},
): MaintenancePromptVersionRow {
  return {
    id,
    promptAssetId,
    versionNumber: 1,
    originalInput: `o${promptAssetId}`,
    compiledPrompt: `c${promptAssetId}`,
    ...overrides,
  }
}

const promptAssets = [
  promptAsset("a", " Ship Prompt "),
  promptAsset("b", "Ship Prompt", { scenario: "bugfix", targetAgent: "cursor" }),
  promptAsset("c", "Deploy--Guide"),
  promptAsset("d", "deploy guide", { scenario: "review", targetAgent: "cursor" }),
  promptAsset("e", "Original one"),
  promptAsset("f", "Original two"),
  promptAsset("g", "Compiled one"),
  promptAsset("h", "Compiled two"),
  promptAsset("i", "Review_api", { scenario: "review", targetAgent: "claude_code" }),
  promptAsset("j", "review api", { scenario: "review", targetAgent: "claude_code" }),
  promptAsset("unrelated", "Independent", { currentVersionId: "vu" }),
  promptAsset("wrong", "Wrong pointer", { currentVersionId: "va" }),
  promptAsset("blank-a", "Blank one"),
  promptAsset("blank-b", "Blank two"),
] satisfies readonly MaintenancePromptAssetRow[]

const promptVersions = [
  promptVersion("va", "a"),
  promptVersion("vb", "b"),
  promptVersion("vc", "c"),
  promptVersion("vd", "d"),
  promptVersion("ve", "e", { originalInput: "shared input" }),
  promptVersion("vf", "f", { originalInput: "shared input" }),
  promptVersion("vg", "g", { compiledPrompt: "shared output" }),
  promptVersion("vh", "h", { compiledPrompt: "shared output" }),
  promptVersion("vi", "i"),
  promptVersion("vj", "j"),
  promptVersion("vu", "unrelated", {
    versionNumber: 2,
    originalInput: "unique",
    compiledPrompt: "unique",
  }),
  promptVersion("old-u", "unrelated", {
    originalInput: "shared input",
    compiledPrompt: "shared output",
  }),
  promptVersion("vblank-a", "blank-a", { originalInput: " ", compiledPrompt: " " }),
  promptVersion("vblank-b", "blank-b", { originalInput: " ", compiledPrompt: " " }),
] satisfies readonly MaintenancePromptVersionRow[]

describe("Phase 17 maintenance detection utilities", () => {
  it("groups duplicate tags after trim, case, and separator normalization while ignoring blanks", () => {
    // Given: equivalent tag spellings, an unrelated tag, and names with no normalized key.
    const tags = [
      { id: "t1", name: "  Build Tools " },
      { id: "t2", name: "build_tools" },
      { id: "t3", name: "BUILD-TOOLS" },
      { id: "t4", name: "release" },
      { id: "blank", name: " _ - " },
    ]

    // When: duplicate tag groups are planned.
    const groups = findDuplicateTagGroups(tags)

    // Then: only the nonblank normalized duplicate set is returned.
    expect(groups).toEqual([
      {
        normalizedName: "build tools",
        tagIds: ["t1", "t2", "t3"],
        canonicalRecommendation: {
          tagId: "t1",
          tagName: "Build Tools",
          reason: "stable_tag_id",
        },
        requiresCanonicalSelection: true,
      },
    ])
    expect(groups.every((group) => !("canonicalTagId" in group) && !("actionType" in group))).toBe(
      true,
    )
  })

  it("finds every MVP prompt duplicate criterion without grouping unrelated or historical content", () => {
    // Given: current-version rows for each exact/normalized criterion plus adversarial pointers.
    // When: finding-only duplicate candidates are computed.
    const candidates = findDuplicatePromptCandidates(promptAssets, promptVersions)

    // Then: each intended pair is present and unrelated, historical, and wrong-asset rows are absent.
    expect(candidates.map(({ promptAssetIds }) => promptAssetIds)).toEqual([
      ["a", "b"],
      ["c", "d"],
      ["e", "f"],
      ["g", "h"],
      ["i", "j"],
    ])
    expect(candidates[0]?.matchedOn).toEqual(["exact_title", "normalized_title"])
    expect(candidates[4]?.matchedOn).toContain("normalized_title_scenario_target_agent")
  })

  it("includes supplied project and prompt context on finding-only duplicate candidates", () => {
    // Given: duplicate assets with project labels and prompt classification metadata.
    const assets = [
      promptAsset("meta-a", "Shared Prompt", {
        projectId: "project-a",
        scenario: "feature",
        targetAgent: "codex",
      }),
      promptAsset("meta-b", "shared_prompt", {
        projectId: null,
        scenario: "review",
        targetAgent: "cursor",
      }),
    ]

    // When: duplicate candidates are detected from the supplied DTOs.
    const [candidate] = findDuplicatePromptCandidates(assets, [])

    // Then: both prompt contexts are retained without creating an executable action selection.
    expect(candidate?.promptMetadata).toEqual([
      {
        promptAssetId: "meta-a",
        projectId: "project-a",
        scenario: "feature",
        targetAgent: "codex",
      },
      {
        promptAssetId: "meta-b",
        projectId: null,
        scenario: "review",
        targetAgent: "cursor",
      },
    ])
    expect(candidate?.findingOnly).toBe(true)
    expect(candidate === undefined || !("actionType" in candidate)).toBe(true)
  })

  it("plans the highest same-asset version for repair and separates empty assets", () => {
    // Given: null, missing, wrong-asset, valid, and versionless current-version states.
    const assets = [
      promptAsset("null", "Null", { currentVersionId: null }),
      promptAsset("missing", "Missing", { currentVersionId: "gone" }),
      promptAsset("wrong", "Wrong", { currentVersionId: "other-v" }),
      promptAsset("valid", "Valid", { currentVersionId: "valid-v" }),
      promptAsset("empty", "Empty", { currentVersionId: null }),
    ] satisfies readonly MaintenancePromptAssetRow[]
    const versions = [
      promptVersion("null-v1", "null"),
      promptVersion("null-v3", "null", { versionNumber: 3 }),
      promptVersion("missing-v", "missing", { versionNumber: 2 }),
      promptVersion("wrong-v", "wrong", { versionNumber: 4 }),
      promptVersion("other-v", "valid"),
      promptVersion("valid-v", "valid", { versionNumber: 2 }),
    ] satisfies readonly MaintenancePromptVersionRow[]

    // When: current-version repair work is planned.
    const plan = planCurrentVersionRepairs(assets, versions)

    // Then: repair reasons are precise, targets are highest-owned, and empty assets are findings only.
    expect(plan.repairs).toEqual([
      { promptAssetId: "null", replacementVersionId: "null-v3", reason: "null_current_version" },
      {
        promptAssetId: "missing",
        replacementVersionId: "missing-v",
        reason: "missing_current_version",
      },
      {
        promptAssetId: "wrong",
        replacementVersionId: "wrong-v",
        reason: "wrong_asset_current_version",
      },
    ])
    expect(plan.emptyAssetFindings).toEqual([
      { promptAssetId: "empty", findingType: "empty_prompt_asset" },
    ])
  })

  it("previews repairs only for selected repairable assets with highest-owned version numbers", () => {
    // Given: selected broken, valid, empty, unknown, and unselected broken assets.
    const assets = [
      promptAsset("selected-null", "Selected null", { currentVersionId: null }),
      promptAsset("selected-wrong", "Selected wrong", { currentVersionId: "foreign-v" }),
      promptAsset("selected-valid", "Selected valid", { currentVersionId: "valid-v" }),
      promptAsset("selected-empty", "Selected empty", { currentVersionId: null }),
      promptAsset("unselected", "Unselected", { currentVersionId: null }),
    ]
    const versions = [
      promptVersion("null-v1", "selected-null"),
      promptVersion("null-v4", "selected-null", { versionNumber: 4 }),
      promptVersion("wrong-v3", "selected-wrong", { versionNumber: 3 }),
      promptVersion("foreign-v", "unselected", { versionNumber: 2 }),
      promptVersion("valid-v", "selected-valid", { versionNumber: 5 }),
      promptVersion("unselected-v", "unselected", { versionNumber: 6 }),
    ]

    // When: repair previews are planned for an explicit asset selection.
    const previews = planSelectedCurrentVersionRepairPreviews(assets, versions, [
      "selected-null",
      "selected-wrong",
      "selected-valid",
      "selected-empty",
      "missing-asset",
    ])

    // Then: only selected repair candidates preview the highest same-owner replacement.
    expect(previews).toEqual([
      {
        promptAssetId: "selected-null",
        currentVersionId: null,
        replacementVersionId: "null-v4",
        replacementVersionNumber: 4,
        reason: "null_current_version",
      },
      {
        promptAssetId: "selected-wrong",
        currentVersionId: "foreign-v",
        replacementVersionId: "wrong-v3",
        replacementVersionNumber: 3,
        reason: "wrong_asset_current_version",
      },
    ])
  })

  it("plans missing, extra, and stale FTS rows from valid current-version projections only", () => {
    // Given: a valid current row, missing row, stale row, wrong pointer, historical row, and extra index row.
    const assets = [
      ...promptAssets.slice(0, 3),
      promptAsset("wrong-owner", "Wrong", { currentVersionId: "va" }),
    ]
    const versions = [
      ...promptVersions,
      promptVersion("old-a", "a", {
        versionNumber: 0,
        originalInput: "old",
        compiledPrompt: "old",
      }),
    ]
    const indexedRows = [
      { promptAssetId: "a", title: " Ship Prompt ", originalInput: "oa", compiledPrompt: "ca" },
      { promptAssetId: "c", title: "stale", originalInput: "oc", compiledPrompt: "cc" },
      { promptAssetId: "extra", title: "Extra", originalInput: "extra", compiledPrompt: "extra" },
    ]

    // When: index health is compared to the repository rebuild projection.
    const plan = planSearchIndexHealth(assets, versions, indexedRows)

    // Then: only owned current versions form expected rows and all three drift classes are reported.
    expect(plan.expectedRows.map(({ promptAssetId }) => promptAssetId)).toEqual(["a", "b", "c"])
    expect(plan.expectedRows.map(({ promptAssetId }) => promptAssetId)).not.toContain("wrong-owner")
    expect(plan.missingPromptAssetIds).toEqual(["b"])
    expect(plan.missingPromptAssetIds).not.toContain("wrong-owner")
    expect(plan.extraPromptAssetIds).toEqual(["extra"])
    expect(plan.stalePromptAssetIds).toEqual(["c"])
  })
})
