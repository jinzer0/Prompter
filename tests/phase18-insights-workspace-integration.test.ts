import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import type { InsightsNavigationIntent } from "../renderer/src/lib/insights-navigation"
import {
  type InsightsNavigationSnapshot,
  resolveInsightsNavigationStep,
} from "../renderer/src/lib/insights-workspace-navigation"

const projectId = "11111111-1111-4111-8111-111111111111"
const assetId = "22222222-2222-4222-8222-222222222222"
const versionId = "33333333-3333-4333-8333-333333333333"
const tagId = "44444444-4444-4444-8444-444444444444"
const templateId = "55555555-5555-4555-8555-555555555555"
const profileId = "66666666-6666-4666-8666-666666666666"

const baseSnapshot = {
  assetIds: [],
  assetStatus: "ready",
  selectedAssetId: null,
  selectedProjectId: null,
  selectedVersionId: null,
  versionIds: [],
  versionStatus: "ready",
} satisfies InsightsNavigationSnapshot

const promptIntent = {
  kind: "prompt",
  projectId,
  promptAssetId: assetId,
  promptVersionId: versionId,
} satisfies InsightsNavigationIntent

describe("phase18 insights workspace integration", () => {
  it("sequences owning project, scoped asset, and exact version before prompt focus", () => {
    // Given: a prompt navigation request and each successive loader snapshot.
    const snapshots = [
      baseSnapshot,
      { ...baseSnapshot, selectedProjectId: projectId, assetStatus: "loading" },
      { ...baseSnapshot, selectedProjectId: projectId, assetIds: [assetId] },
      {
        ...baseSnapshot,
        selectedProjectId: projectId,
        selectedAssetId: assetId,
        assetIds: [assetId],
        versionStatus: "loading",
      },
      {
        ...baseSnapshot,
        selectedProjectId: projectId,
        selectedAssetId: assetId,
        assetIds: [assetId],
        versionIds: [versionId],
      },
      {
        ...baseSnapshot,
        selectedProjectId: projectId,
        selectedAssetId: assetId,
        selectedVersionId: versionId,
        assetIds: [assetId],
        versionIds: [versionId],
      },
    ] satisfies readonly InsightsNavigationSnapshot[]
    // When: the resolver observes each async stage.
    const steps = snapshots.map((snapshot) => resolveInsightsNavigationStep(promptIntent, snapshot))
    // Then: selection order is deterministic and never mutates data.
    expect(steps).toEqual([
      { kind: "select_project", projectId },
      { kind: "wait" },
      { kind: "select_asset", promptAssetId: assetId },
      { kind: "wait" },
      { kind: "select_version", promptVersionId: versionId },
      { kind: "focus", target: "prompt-version" },
    ])
  })

  it("focuses quality only after exact prompt selection without review actions", () => {
    // Given: the exact project, asset, and version are selected.
    const intent = { ...promptIntent, kind: "prompt_quality" } satisfies InsightsNavigationIntent
    const snapshot = {
      ...baseSnapshot,
      selectedProjectId: projectId,
      selectedAssetId: assetId,
      selectedVersionId: versionId,
      assetIds: [assetId],
      versionIds: [versionId],
    } satisfies InsightsNavigationSnapshot
    // When: the final navigation step resolves.
    const step = resolveInsightsNavigationStep(intent, snapshot)
    // Then: it requests focus only.
    expect(step).toEqual({ kind: "focus", target: "prompt-quality" })
  })

  it("routes tag, template, context, harness, project, and maintenance destinations", () => {
    // Given: read-only destination intents with the owning project already selected.
    const snapshot = { ...baseSnapshot, selectedProjectId: projectId }
    const cases = [
      [
        { kind: "project", projectId },
        { kind: "focus", target: "prompt-library" },
      ],
      [
        { kind: "tag", projectId, tagId },
        { kind: "apply_tag_filter", projectId, tagId },
      ],
      [
        { kind: "prompt_templates", promptTemplateId: templateId },
        { kind: "select_prompt_template", promptTemplateId: templateId },
      ],
      [
        { kind: "project_context", projectId, profileId },
        { kind: "select_context_profile", projectId, profileId },
      ],
      [
        { kind: "harness_templates", harnessTemplateId: null },
        { kind: "focus", target: "harness-templates" },
      ],
      [{ kind: "maintenance" }, { kind: "focus", target: "settings-maintenance" }],
    ] as const satisfies readonly (readonly [InsightsNavigationIntent, object])[]
    // When: each destination resolves.
    const steps = cases.map(([intent]) => resolveInsightsNavigationStep(intent, snapshot))
    // Then: only selection, filter, or focus steps are emitted.
    expect(steps).toEqual(cases.map(([, step]) => step))
  })

  it("selects a tag's owning project before applying its filter", () => {
    // Given: a project-owned tag intent while another project is selected.
    const intent = { kind: "tag", projectId, tagId } satisfies InsightsNavigationIntent
    const otherProjectId = "99999999-9999-4999-8999-999999999999"
    // When: the resolver observes the old and then owning project selection.
    const steps = [
      resolveInsightsNavigationStep(intent, {
        ...baseSnapshot,
        selectedProjectId: otherProjectId,
      }),
      resolveInsightsNavigationStep(intent, { ...baseSnapshot, selectedProjectId: projectId }),
    ]
    // Then: the filter cannot run until the owning project is active.
    expect(steps).toEqual([
      { kind: "select_project", projectId },
      { kind: "apply_tag_filter", projectId, tagId },
    ])
  })

  it("keeps library and compiler mounted while Insights spans both workspace columns", () => {
    // Given: the real app and navigation hook source.
    const appSource = readFileSync("renderer/src/components/shell/app-shell.tsx", "utf8")
    const navigationSource = readFileSync(
      "renderer/src/hooks/use-insights-workspace-navigation.ts",
      "utf8",
    )
    // When: workspace composition and navigation effects are inspected.
    // Then: hidden library panels stay mounted and navigation never triggers actions.
    expect(navigationSource).toContain('useState<WorkspaceView>("library")')
    expect(appSource).toContain('data-testid="insights-workspace"')
    expect(appSource).toContain(
      'insightsNavigation.workspaceView === "library" ? "contents" : "hidden"',
    )
    expect(appSource).toContain("<InsightsDashboard")
    expect(navigationSource).not.toMatch(
      /\.(review|scanLibrary|executeAction|analyze|compile|setDraft)\(/,
    )
  })

  it("preserves the Phase 18 workspace while Privacy Center uses the same mounted swap", () => {
    // Given: the application composition after Privacy Center is added.
    const appSource = readFileSync("renderer/src/components/shell/app-shell.tsx", "utf8")
    const workspaceNavigationSource = readFileSync(
      "renderer/src/components/shell/workspace-view-navigation.tsx",
      "utf8",
    )
    const navigationSource = readFileSync(
      "renderer/src/hooks/use-insights-workspace-navigation.ts",
      "utf8",
    )
    // When: workspace visibility and sidebar routes are inspected.
    // Then: Library remains mounted and both read-only workspaces are explicit selections.
    expect(navigationSource).toContain(
      'export type WorkspaceView = "library" | "insights" | "privacy"',
    )
    expect(appSource).toContain('data-testid="privacy-workspace"')
    expect(workspaceNavigationSource).toContain('data-menu-action-target="privacy-center"')
    expect(appSource).toContain(
      'insightsNavigation.workspaceView === "library" ? "contents" : "hidden"',
    )
    expect(appSource).not.toMatch(/workspaceView.*&&.*(setDraft|scanLibrary|analyze|compile)/)
  })

  it("provides stable sidebar and destination targets without clicking quality actions", () => {
    // Given: the sidebar, manager, library, and quality component sources.
    const sources = [
      "renderer/src/components/shell/app-shell.tsx",
      "renderer/src/components/shell/workspace-view-navigation.tsx",
      "renderer/src/components/prompt-library-panel.tsx",
      "renderer/src/components/prompt-template-manager.tsx",
      "renderer/src/components/harness-template-manager.tsx",
      "renderer/src/components/project-context-profile-manager.tsx",
      "renderer/src/components/prompt-version-management.tsx",
      "renderer/src/components/quality/prompt-quality-review-panel.tsx",
    ].map((path) => readFileSync(path, "utf8"))
    // When: stable integration targets are inspected.
    // Then: every destination has a focusable or clickable target.
    for (const target of [
      "library-insights",
      "prompt-library",
      "prompt-templates",
      "harness-templates",
      "project-context",
      "prompt-version",
      "prompt-quality",
    ]) {
      expect(sources.join("\n")).toContain(target)
    }
    expect(sources.at(-1)).not.toContain('data-insights-target="prompt-quality" onClick')
  })
})
