import { readFile } from "node:fs/promises"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { EXPORT_FORMATS, exportPromptInputSchema } from "../electron/ipc-contract"
import type {
  PromptAsset,
  PromptQualityReviewResult,
  PromptSearchResultItem,
  PromptVersion,
} from "../electron/ipc-types"
import { formatPromptExport } from "../electron/prompt-export-formatters"
import { PromptAssetCard } from "../renderer/src/components/prompt-asset-card"
import { PromptCompilerAnalysis } from "../renderer/src/components/prompt-compiler-analysis"
import { PromptSearchResultCard } from "../renderer/src/components/prompt-search-result-card"
import type { CompiledPromptResult } from "../renderer/src/lib/prompt-compiler/types"
import { exportBaseFromCompiled, exportBaseFromVersion } from "../renderer/src/lib/prompt-export"

const promptAsset = {
  id: "11111111-1111-4111-8111-111111111111",
  projectId: null,
  title: "Score provenance",
  scenario: "feature",
  targetAgent: "codex",
  currentVersionId: "22222222-2222-4222-8222-222222222222",
  parentPromptId: null,
  createdAt: 1,
  updatedAt: 2,
} satisfies PromptAsset

const promptVersion = {
  id: "22222222-2222-4222-8222-222222222222",
  promptAssetId: promptAsset.id,
  versionNumber: 1,
  originalInput: "Clarify score provenance.",
  compiledPrompt: "# Objective\nClarify score provenance.",
  assumptions: null,
  questions: null,
  answers: null,
  acceptanceCriteria: "Keep score fields distinct.",
  validationCommands: "npx vitest run tests/prompt-quality-score-provenance.test.ts",
  qualityScore: 82,
  createdAt: 3,
} satisfies PromptVersion

const compiledPrompt = {
  title: promptAsset.title,
  originalInput: promptVersion.originalInput,
  compiledPrompt: promptVersion.compiledPrompt,
  scenario: promptAsset.scenario,
  targetAgent: promptAsset.targetAgent,
  assumptions: [],
  acceptanceCriteria: [promptVersion.acceptanceCriteria],
  validationCommands: [promptVersion.validationCommands],
  qualityScore: 4,
  warnings: [],
} satisfies CompiledPromptResult

const reviewResult = {
  overallScore: 91,
} satisfies Pick<PromptQualityReviewResult, "overallScore">

const searchResult = {
  promptAssetId: promptAsset.id,
  currentVersionId: promptVersion.id,
  title: promptAsset.title,
  scenario: promptAsset.scenario,
  targetAgent: promptAsset.targetAgent,
  projectId: null,
  projectName: null,
  versionNumber: promptVersion.versionNumber,
  compiledPromptPreview: promptVersion.compiledPrompt,
  originalInputPreview: promptVersion.originalInput,
  matchedTextPreview: "",
  qualityScore: promptVersion.qualityScore,
  tags: [],
  createdAt: promptAsset.createdAt,
  updatedAt: promptAsset.updatedAt,
} satisfies PromptSearchResultItem

const reviewMetadataTerms = [
  "prompt_quality_reviews",
  "Quality Review",
  "review issues",
  "suggestions",
  "stale",
  "review provenance",
  "prompt-quality-review",
  "overallScore",
  "dimensionScores",
  "scoreExplanation",
] as const

const standardExportFormats = [
  "markdown",
  "codex",
  "claude_code",
  "cursor",
  "generic_agent",
] as const

function noop(): void {}

describe("prompt quality score provenance", () => {
  it("keeps compiler, saved-version, and review result scores on distinct UI surfaces", () => {
    // Given: a compiler summary, a saved version summary, and a separate review result.
    const compilerMarkup = renderToStaticMarkup(
      createElement(PromptCompilerAnalysis, {
        analysis: null,
        answers: {},
        compiled: compiledPrompt,
        onAnswerChange: noop,
        onSuggestedTagChange: noop,
        selectedSuggestedTags: [],
      }),
    )
    const assetCardMarkup = renderToStaticMarkup(
      createElement(PromptAssetCard, {
        asset: promptAsset,
        currentVersion: promptVersion,
        isSelected: false,
        onSelect: noop,
      }),
    )
    const searchCardMarkup = renderToStaticMarkup(
      createElement(PromptSearchResultCard, {
        isSelected: false,
        item: searchResult,
        onSelect: noop,
      }),
    )

    // When: each score-bearing surface renders its own summary value.

    // Then: compiler, saved-version, and review terminology stay distinct.
    expect(compilerMarkup).toContain("Compiler quality score: 4")
    expect(assetCardMarkup).toContain("Saved quality score 82")
    expect(searchCardMarkup).toContain("Saved quality score 82")
    expect(`${compilerMarkup}${assetCardMarkup}${searchCardMarkup}`).not.toContain(
      String(reviewResult.overallScore),
    )
    expect(`${assetCardMarkup}${searchCardMarkup}`).not.toContain("Review result score")
    expect(`${assetCardMarkup}${searchCardMarkup}`).not.toContain("Applied quality review score")
  })

  it("exports only compiler or saved summary scores without review metadata", () => {
    // Given: distinct compiler, persisted-version, and review-result scores.
    const compilerExport = exportBaseFromCompiled(
      compiledPrompt,
      compiledPrompt.compiledPrompt,
      null,
    )
    const versionExport = exportBaseFromVersion({
      metadata: {
        assumptions: [],
        questions: [],
        answers: [],
        acceptanceCriteria: [promptVersion.acceptanceCriteria],
        validationCommands: [promptVersion.validationCommands],
        qualityScore: promptVersion.qualityScore,
      },
      projectName: null,
      selectedAsset: promptAsset,
      selectedVersion: promptVersion,
    })

    // When: default exports format each permitted output type.
    const exports = EXPORT_FORMATS.map((format) =>
      formatPromptExport(exportPromptInputSchema.parse({ ...versionExport, format })),
    )

    // Then: the carried score is a compiler/saved summary, never review-only data.
    expect(compilerExport.qualityScore).toBe(compiledPrompt.qualityScore)
    expect(versionExport.qualityScore).toBe(promptVersion.qualityScore)
    expect(compilerExport).not.toHaveProperty("overallScore")
    expect(versionExport).not.toHaveProperty("overallScore")
    expect(compilerExport.qualityScore).not.toBe(reviewResult.overallScore)
    expect(versionExport.qualityScore).not.toBe(reviewResult.overallScore)

    for (const format of standardExportFormats) {
      const result = exports.find((item) => item.format === format)
      expect(result?.content).toContain("Quality score (compiler/saved summary): 82")
    }

    for (const result of exports) {
      for (const term of reviewMetadataTerms) {
        expect(result.content).not.toContain(term)
      }
    }
  })

  it("keeps review scores out of library-card badges, sorting, and filtering", async () => {
    // Given: the library card and query-state production sources.
    const [assetCardSource, searchCardSource, libraryStateSource] = await Promise.all([
      readFile("renderer/src/components/prompt-asset-card.tsx", "utf8"),
      readFile("renderer/src/components/prompt-search-result-card.tsx", "utf8"),
      readFile("renderer/src/hooks/use-prompt-library-panel.ts", "utf8"),
    ])

    // When: the MVP library surface is inspected for review-score behavior.

    // Then: only the saved summary remains visible; review scores cannot drive cards or filters.
    for (const source of [assetCardSource, searchCardSource]) {
      expect(source).not.toContain("overallScore")
      expect(source).not.toContain("promptQuality")
      expect(source).not.toContain("Quality Review")
    }
    expect(libraryStateSource).not.toContain("qualityScore")
  })
})
