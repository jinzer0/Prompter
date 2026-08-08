import { readFileSync } from "node:fs"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import type { InsightsDateRange } from "../electron/ipc-types"
import {
  type InsightsDashboardController,
  InsightsDashboardView,
} from "../renderer/src/components/insights/insights-dashboard"
import {
  changeInsightsDateRangeFilter,
  changeInsightsProjectFilter,
} from "../renderer/src/components/insights/insights-filters"
import {
  maintenanceNavigation,
  projectContextNavigation,
  promptQualityNavigation,
  promptTemplateNavigation,
  tagNavigation,
  versionPromptNavigation,
} from "../renderer/src/components/insights/insights-navigation-actions"
import { ProjectHealthPanel } from "../renderer/src/components/insights/insights-project-health"
import { QualityInsightsPanel } from "../renderer/src/components/insights/insights-quality"
import { TagInsightsPanel } from "../renderer/src/components/insights/insights-tags"
import { VersionActivityPanel } from "../renderer/src/components/insights/insights-versions"
import type { InsightsState } from "../renderer/src/hooks/insights-state"
import {
  globalTagInsights,
  orphanQualityInsights,
  orphanQualityPrompt,
  orphanVersionActivityInsights,
  orphanVersionedPrompt,
  project,
  projectId,
  promptTemplate,
  qualityPrompt,
  readyInsightsData,
  tagUsage,
  versionedPrompt,
} from "./phase18-insights-ui-fixtures"

const componentFiles = [
  "insights-dashboard.tsx",
  "insights-distributions.tsx",
  "insights-filters.tsx",
  "insights-project-health.tsx",
  "insights-quality.tsx",
  "insights-summary.tsx",
  "insights-tags.tsx",
  "insights-templates.tsx",
  "insights-versions.tsx",
  "insights-context-maintenance.tsx",
] as const

function controller(state: InsightsState): InsightsDashboardController {
  return {
    ...state,
    retry: async () => undefined,
    setDateRange: () => undefined,
    setProjectId: () => undefined,
  }
}

function markup(state: InsightsState): string {
  return renderToStaticMarkup(
    createElement(InsightsDashboardView, {
      insights: controller(state),
      projects: [project],
      onBackToLibrary: () => undefined,
      onNavigate: () => undefined,
    }),
  )
}

describe("phase18 insights dashboard UI", () => {
  it("renders accessible loading controls with every dashboard-local filter option", () => {
    // Given: Insights is loading with the initial filter.
    const state = {
      phase: "loading",
      filters: { projectId: null, dateRange: "all" },
      data: null,
      error: null,
    } satisfies InsightsState
    // When: the dashboard view renders.
    const rendered = markup(state)
    // Then: loading and all filter choices remain visible.
    expect(rendered).toContain("Loading insights")
    expect(rendered).toContain('aria-label="Project filter"')
    expect(rendered).toContain('aria-label="Date range"')
    expect(rendered).toContain("All time")
    expect(rendered).toContain("Last 7 days")
    expect(rendered).toContain("Last 30 days")
    expect(rendered).toContain("Last 90 days")
    expect(rendered).toContain("This year")
  })

  it("renders deterministic empty and error recovery states", () => {
    // Given: empty and failed dashboard states.
    const empty = markup({
      phase: "empty",
      filters: { projectId: null, dateRange: "all" },
      data: readyInsightsData,
      error: null,
    })
    const error = markup({
      phase: "error",
      filters: { projectId, dateRange: "30d" },
      data: null,
      error: "Insights could not be loaded.",
    })
    // When: their visible recovery copy is inspected.
    // Then: empty and retry states are explicit.
    expect(empty).toContain("No project or prompt inventory")
    expect(error).toContain('role="alert"')
    expect(error).toContain("Insights could not be loaded.")
    expect(error).toContain("Retry insights")
  })

  it("renders every ready section, summary field, sort choice, and scope label", () => {
    // Given: every Insights dataset contains representative rows.
    const rendered = markup({
      phase: "ready",
      filters: { projectId, dateRange: "30d" },
      data: readyInsightsData,
      error: null,
    })
    // When: the complete dashboard is rendered.
    // Then: every required read-only section and metric is present.
    for (const section of [
      "Library summary",
      "Project health",
      "Scenario distribution",
      "Target agents",
      "Quality",
      "Version activity",
      "Tags",
      "Templates",
      "Project context",
      "Maintenance snapshot",
    ]) {
      expect(rendered).toContain(section)
    }
    for (const metric of [
      "Projects",
      "Prompt assets",
      "Prompt versions",
      "Average quality",
      "Unevaluated current",
      "Maintenance issues",
      "Last update",
    ]) {
      expect(rendered).toContain(metric)
    }
    expect(rendered).toContain('aria-label="Project health sort"')
    expect(rendered).toContain("Last updated descending")
    expect(rendered).toContain('role="progressbar"')
    expect(rendered).toContain("Selected project scope")
    expect(rendered).toContain("Global inventory")
    expect(rendered).toContain("Maintenance reports are not persisted")
  })

  it("maps filter values through typed dashboard-local callbacks", () => {
    // Given: callback observers for both filter dimensions.
    const setProjectId = vi.fn<(value: string | null) => void>()
    const setDateRange = vi.fn<(value: InsightsDateRange) => void>()
    // When: native select values are applied.
    changeInsightsProjectFilter("all", setProjectId)
    changeInsightsProjectFilter(projectId, setProjectId)
    changeInsightsDateRangeFilter("90d", setDateRange)
    // Then: callbacks receive normalized typed values only.
    expect(setProjectId).toHaveBeenNthCalledWith(1, null)
    expect(setProjectId).toHaveBeenNthCalledWith(2, projectId)
    expect(setDateRange).toHaveBeenCalledWith("90d")
  })

  it("builds exact read-only navigation payloads for related records", () => {
    // Given: representative prompt, version, tag, template, context, and maintenance records.
    // When: dashboard navigation intents are derived.
    const intents = [
      promptQualityNavigation(qualityPrompt),
      versionPromptNavigation(versionedPrompt),
      tagNavigation(projectId, tagUsage.tagId),
      promptTemplateNavigation(promptTemplate.promptTemplateId),
      projectContextNavigation(projectId),
      maintenanceNavigation(),
    ]
    // Then: owning IDs are preserved without action payloads.
    expect(intents).toEqual([
      {
        kind: "prompt_quality",
        projectId,
        promptAssetId: qualityPrompt.promptAssetId,
        promptVersionId: qualityPrompt.currentVersionId,
      },
      {
        kind: "prompt",
        projectId,
        promptAssetId: versionedPrompt.promptAssetId,
        promptVersionId: versionedPrompt.currentVersionId,
      },
      { kind: "tag", projectId, tagId: tagUsage.tagId },
      { kind: "prompt_templates", promptTemplateId: promptTemplate.promptTemplateId },
      { kind: "project_context", projectId, profileId: null },
      { kind: "maintenance" },
    ])
  })

  it("returns no prompt navigation intent without concrete project ownership", () => {
    // Given: quality and version DTOs whose owning project was removed.
    // When: navigation factories receive the orphan records.
    const intents = [
      promptQualityNavigation(orphanQualityPrompt),
      versionPromptNavigation(orphanVersionedPrompt),
    ]
    // Then: no scope-unsafe intent can be emitted.
    expect(intents).toEqual([null, null])
  })

  it("keeps global tags and orphan prompts visible without row actions", () => {
    // Given: orphan prompt rows and a global tag scope with unused tags.
    const onNavigate = vi.fn()
    const quality = renderToStaticMarkup(
      createElement(QualityInsightsPanel, {
        insights: orphanQualityInsights,
        onNavigate,
      }),
    )
    const versions = renderToStaticMarkup(
      createElement(VersionActivityPanel, {
        insights: orphanVersionActivityInsights,
        onNavigate,
      }),
    )
    const tags = renderToStaticMarkup(
      createElement(TagInsightsPanel, {
        insights: globalTagInsights,
        onNavigate,
        projectId: null,
      }),
    )
    // When: the isolated panels render.
    // Then: orphan/global rows are labelled, while only Maintenance remains actionable.
    expect(quality).toContain("Orphaned quality prompt")
    expect(versions).toContain("Orphaned version prompt")
    expect(quality).toContain("Orphaned project")
    expect(versions).toContain("Orphaned project")
    expect(quality.match(/<button/g)?.length ?? 0).toBe(0)
    expect(versions.match(/<button/g)?.length ?? 0).toBe(0)
    expect(tags).toContain(tagUsage.name)
    expect(tags).toContain("Select a project filter")
    expect(tags).toContain("Open unused tags in Maintenance")
    expect(tags.match(/<button/g)?.length ?? 0).toBe(1)
  })

  it("renders separate accessible project and context actions", () => {
    // Given: one project health row.
    const rendered = renderToStaticMarkup(
      createElement(ProjectHealthPanel, {
        insights: readyInsightsData.projectHealth,
        onNavigate: vi.fn(),
      }),
    )
    // When: its action cells render.
    // Then: project library and project context remain distinct keyboard actions.
    expect(rendered.match(/<button/g)?.length ?? 0).toBe(2)
    expect(rendered).toContain('aria-label="Open Alpha workspace project context"')
  })

  it("contains no mutation controls or direct bridge calls", () => {
    // Given: the complete ready dashboard and every Insights component source.
    const rendered = markup({
      phase: "ready",
      filters: { projectId: null, dateRange: "all" },
      data: readyInsightsData,
      error: null,
    })
    const source = componentFiles
      .map((file) => readFileSync(`renderer/src/components/insights/${file}`, "utf8"))
      .join("\n")
    // When: visible actions and implementation boundaries are inspected.
    // Then: the dashboard remains read-only and bridge-free outside its hook.
    expect(rendered).not.toMatch(/>Delete<|>Merge<|>Execute<|>Apply<|>Improve<|>Review<|>Scan</)
    expect(source).not.toMatch(/window\.prompter|ipcRenderer|\.scanLibrary|\.executeAction/)
    expect(rendered).toContain("Back to library")
    expect(rendered).toContain("Open Maintenance")
  })
})
