import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import {
  type InsightsNavigationIntent,
  insightsNavigationSection,
} from "../renderer/src/lib/insights-navigation"

const projectId = "11111111-1111-4111-8111-111111111111"
const promptAssetId = "22222222-2222-4222-8222-222222222222"
const promptVersionId = "33333333-3333-4333-8333-333333333333"
const tagId = "44444444-4444-4444-8444-444444444444"
const promptTemplateId = "55555555-5555-4555-8555-555555555555"
const harnessTemplateId = "66666666-6666-4666-8666-666666666666"
const profileId = "77777777-7777-4777-8777-777777777777"

type ProjectOwnedIntent = Extract<
  InsightsNavigationIntent,
  { readonly kind: "prompt" | "prompt_quality" | "tag" }
>

function concreteProjectId(intent: ProjectOwnedIntent): string {
  return intent.projectId
}

describe("phase18 insights renderer contracts", () => {
  it("defines exhaustive read-only navigation intents with exact entity ids", () => {
    // Given: every supported insights destination is represented.
    const projectOwnedIntents = [
      { kind: "prompt", projectId, promptAssetId, promptVersionId },
      { kind: "prompt_quality", projectId, promptAssetId, promptVersionId },
      { kind: "tag", projectId, tagId },
    ] satisfies readonly ProjectOwnedIntent[]
    const intents = [
      { kind: "project", projectId },
      ...projectOwnedIntents,
      { kind: "prompt_templates", promptTemplateId },
      { kind: "harness_templates", harnessTemplateId },
      { kind: "project_context", projectId, profileId },
      { kind: "maintenance" },
    ] satisfies readonly InsightsNavigationIntent[]
    // When: navigation sections are derived without executing navigation.
    const sections = intents.map(insightsNavigationSection)
    // Then: all eight destinations remain explicit and ordered.
    expect(sections).toEqual(intents.map(({ kind }) => kind))
    expect(intents.slice(1, 3)).toEqual([
      { kind: "prompt", projectId, promptAssetId, promptVersionId },
      { kind: "prompt_quality", projectId, promptAssetId, promptVersionId },
    ])
    expect(projectOwnedIntents.map(concreteProjectId)).toEqual([projectId, projectId, projectId])
  })

  it("keeps the hook on the insights read surface only", () => {
    // Given: the renderer hook source is the integration boundary under test.
    // When: its bridge references are inspected.
    const source = readFileSync("renderer/src/hooks/use-insights.ts", "utf8")
    // Then: no mutation-capable or unrelated bridge surface is reachable.
    expect(source).toContain("window.prompter.insights")
    expect(source).not.toMatch(
      /window\.prompter\.(projects|prompts|promptCompiler|promptQuality|exports|maintenance|clipboard|settings)/,
    )
  })
})
