import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import type { PromptAsset, PromptLineage, PromptVersion } from "../electron/ipc-types"
import {
  PromptLineageContent,
  PromptLineagePanel,
} from "../renderer/src/components/prompt-lineage-panel"
import {
  buildDerivedPromptDraft,
  duplicatePromptInput,
} from "../renderer/src/lib/prompt-derivation"
import { buildPromptLineageView } from "../renderer/src/lib/prompt-lineage-model"

const sourceAsset = {
  id: "11111111-1111-4111-8111-111111111111",
  projectId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  title: "Source prompt",
  scenario: "feature",
  targetAgent: "codex",
  currentVersionId: "22222222-2222-4222-8222-222222222222",
  parentPromptId: null,
  parentPromptVersionId: null,
  derivationType: null,
  createdAt: 1,
  updatedAt: 2,
} satisfies PromptAsset

const childAsset = {
  ...sourceAsset,
  id: "33333333-3333-4333-8333-333333333333",
  title: "Child prompt",
  currentVersionId: "44444444-4444-4444-8444-444444444444",
  parentPromptId: sourceAsset.id,
  parentPromptVersionId: "22222222-2222-4222-8222-222222222222",
  derivationType: "derived",
} satisfies PromptAsset

const deletedSourceChildAsset = {
  ...childAsset,
  parentPromptId: null,
  parentPromptVersionId: null,
} satisfies PromptAsset

const sourceVersion = {
  id: "22222222-2222-4222-8222-222222222222",
  promptAssetId: sourceAsset.id,
  versionNumber: 1,
  originalInput: "Keep this original request.",
  compiledPrompt: "Compiled source prompt.",
  assumptions: JSON.stringify(["Assumption"]),
  questions: JSON.stringify([]),
  answers: JSON.stringify([]),
  acceptanceCriteria: "Criterion",
  validationCommands: "npm test",
  qualityScore: null,
  createdAt: 3,
} satisfies PromptVersion

const lineage = {
  parent: {
    promptAssetId: sourceAsset.id,
    promptVersionId: sourceVersion.id,
    title: sourceAsset.title,
    versionNumber: 1,
    derivationType: "derived",
  },
  children: [
    {
      promptAssetId: childAsset.id,
      promptVersionId: "44444444-4444-4444-8444-444444444444",
      title: childAsset.title,
      versionNumber: 1,
      derivationType: "duplicate",
    },
  ],
} satisfies PromptLineage

describe("phase15 lineage UI contracts", () => {
  it("builds duplicate bridge input with source ids and copyTags only", () => {
    expect(duplicatePromptInput(sourceAsset.id, sourceVersion.id)).toEqual({
      sourcePromptAssetId: sourceAsset.id,
      sourcePromptVersionId: sourceVersion.id,
      copyTags: true,
    })
  })

  it("seeds derived drafts from a source version without writing to the database", () => {
    const draft = buildDerivedPromptDraft(sourceAsset, sourceVersion)

    expect(draft.sourcePromptAssetId).toBe(sourceAsset.id)
    expect(draft.sourcePromptVersionId).toBe(sourceVersion.id)
    expect(draft.draft.originalInput).toBe(sourceVersion.originalInput)
    expect(draft.editablePrompt).toBe(sourceVersion.compiledPrompt)
    expect(draft.compiled.acceptanceCriteria).toEqual(["Criterion"])
  })

  it("marks same-project navigation enabled and cross-project navigation disabled", () => {
    const view = buildPromptLineageView(childAsset, lineage, [sourceAsset])

    expect(view.parent.kind).toBe("active")
    if (view.parent.kind !== "active") {
      return
    }
    expect(view.parent.parent.canNavigate).toBe(true)
    expect(view.children[0]?.canNavigate).toBe(false)
  })

  it("shows deleted source state from retained derivation type when source ids are nulled", () => {
    const view = buildPromptLineageView(deletedSourceChildAsset, { parent: null, children: [] }, [
      deletedSourceChildAsset,
    ])

    expect(view.parent).toEqual({ kind: "deleted" })
  })

  it("renders no-lineage panel copy and same-project navigation guard text", () => {
    const markup = renderToStaticMarkup(
      createElement(PromptLineagePanel, {
        sameProjectAssets: [],
        selectedAsset: sourceAsset,
        onNavigate: () => undefined,
      }),
    )

    expect(markup).toContain("Lineage")
    expect(markup).toContain("Loading lineage")
  })

  it("renders active parent and child lineage summaries when lineage is loaded", () => {
    const markup = renderToStaticMarkup(
      createElement(PromptLineageContent, {
        error: null,
        lineage,
        sameProjectAssets: [sourceAsset, childAsset],
        selectedAsset: childAsset,
        onNavigate: () => undefined,
      }),
    )

    expect(markup).toContain("active_source")
    expect(markup).toContain("Source prompt")
    expect(markup).toContain("children")
    expect(markup).toContain("Child prompt")
  })

  it("renders deleted source lineage state when the source asset cannot be opened", () => {
    const markup = renderToStaticMarkup(
      createElement(PromptLineageContent, {
        error: null,
        lineage: { parent: null, children: [] },
        sameProjectAssets: [deletedSourceChildAsset],
        selectedAsset: deletedSourceChildAsset,
        onNavigate: () => undefined,
      }),
    )

    expect(markup).toContain("Source prompt is deleted or unavailable")
    expect(markup).toContain("Source details are no longer available")
  })
})
