import { readFile } from "node:fs/promises"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { CompilerProjectBindingNotice } from "../renderer/src/components/compiler-project-binding-notice"
import { ProjectContextProfileSelector } from "../renderer/src/components/project-context-profile-selector"
import { PromptCompilerActions } from "../renderer/src/components/prompt-compiler-actions"
import { PromptTemplateSelector } from "../renderer/src/components/prompt-template-selector"
import {
  COMPILER_PROJECT_REBIND_DESCRIPTION_ID,
  type CompilerStatePreservationRequest,
  createCompilerProjectBinding,
  reduceCompilerProjectBinding,
  resolveCompilerProjectTransition,
} from "../renderer/src/lib/compiler-project-binding"
import { missingProjectContextProfilePreview } from "../renderer/src/lib/project-context-profile-selection"
import "./phase18-insights-compiler-defaults-cases"

const preservationRequest = {
  sourceProjectId: "project-a",
  targetProjectId: "project-b",
  requestId: 18,
} satisfies CompilerStatePreservationRequest

describe("Phase 18 Insights compiler preservation", () => {
  it("preserves compiler state once for the exact Insights project transition", () => {
    // Given: an unconsumed Insights request targeting the project now being selected.
    // When: the compiler resolves the cross-project transition.
    const resolution = resolveCompilerProjectTransition({
      appliedRequestId: null,
      currentProjectId: preservationRequest.targetProjectId,
      previousProjectId: "project-a",
      request: preservationRequest,
    })
    // Then: the transition preserves state and consumes the stable request ID.
    expect(resolution).toEqual({ kind: "preserve", request: preservationRequest })
  })

  it("resets for consumed, mismatched, and ordinary project transitions", () => {
    // Given: requests that are stale, target another project, or do not exist.
    const cases = [
      { appliedRequestId: preservationRequest.requestId, request: preservationRequest },
      {
        appliedRequestId: null,
        request: { ...preservationRequest, targetProjectId: "project-c" },
      },
      { appliedRequestId: null, request: null },
    ] as const
    // When: each case resolves the same ordinary project transition.
    const resolutions = cases.map(({ appliedRequestId, request }) =>
      resolveCompilerProjectTransition({
        appliedRequestId,
        currentProjectId: "project-b",
        previousProjectId: "project-a",
        request,
      }),
    )
    // Then: no stale request can suppress the normal Phase 13 reset.
    expect(resolutions).toEqual([
      { kind: "reset", projectId: "project-b" },
      { kind: "reset", projectId: "project-b" },
      { kind: "reset", projectId: "project-b" },
    ])
  })

  it("does nothing when the selected project has not changed", () => {
    // Given: an Insights request whose target is already selected.
    // When: the compiler resolves the unchanged project identity.
    const resolution = resolveCompilerProjectTransition({
      appliedRequestId: null,
      currentProjectId: "project-b",
      previousProjectId: "project-b",
      request: preservationRequest,
    })
    // Then: the request cannot be consumed before a real transition.
    expect(resolution).toEqual({ kind: "unchanged" })
  })

  it("shows a retained include choice as checked but disabled for an unavailable profile", () => {
    // Given: Insights preserved an included old-project profile with excluded compiler context.
    const preview = missingProjectContextProfilePreview("old-project-profile")
    // When: the target-project selector renders the preserved unavailable selection.
    const markup = renderToStaticMarkup(
      createElement(ProjectContextProfileSelector, {
        error: null,
        includeProjectContextProfile: true,
        isSelectedProfileUnavailable: true,
        preview,
        previewError: null,
        previewStatus: "ready",
        profiles: [],
        projectName: "Target project",
        selectedProfileId: preview.profileId,
        status: "ready",
        onIncludeChange: () => undefined,
        onManageProfiles: () => undefined,
        onSelectProfile: () => undefined,
      }),
    )
    // Then: the retained choice stays visible, cannot be changed, and contributes no context.
    expect(markup).toMatch(
      /<input(?=[^>]*aria-label="Include project context profile")(?=[^>]*checked="")(?=[^>]*disabled="")[^>]*>/,
    )
    expect(preview.context).toBeNull()
    expect(markup).not.toContain("<pre")
  })

  it("explains preserved_unbound state and describes guarded controls while Copy remains enabled", () => {
    // Given: project A compiler output preserved under project B.
    const binding = reduceCompilerProjectBinding(createCompilerProjectBinding("project-a"), {
      kind: "project_preserved",
      request: preservationRequest,
    })
    // When: the binding notice and compiler action row render.
    const markup = renderToStaticMarkup(
      createElement("div", null, [
        createElement(CompilerProjectBindingNotice, {
          key: "notice",
          binding,
          projectName: "Project B",
          onRebind: () => undefined,
        }),
        createElement(PromptCompilerActions, {
          key: "actions",
          canCopy: true,
          canSaveNextVersion: true,
          canSavePrompt: true,
          compilerActionsEnabled: false,
          guardDescriptionId: COMPILER_PROJECT_REBIND_DESCRIPTION_ID,
          isAnalyzing: false,
          isCompilingLLM: false,
          isReadingClipboard: false,
          isSaving: false,
          isSavingNextVersion: false,
          onAnalyzeWithLLM: () => undefined,
          onCompileWithLLM: () => undefined,
          onCopyPrompt: () => undefined,
          onImportFromClipboard: async () => undefined,
          onSaveNextVersion: async () => undefined,
          onSavePrompt: async () => undefined,
        }),
      ]),
    )
    const templateMarkup = renderToStaticMarkup(
      createElement(PromptTemplateSelector, {
        canApply: false,
        guardDescriptionId: COMPILER_PROJECT_REBIND_DESCRIPTION_ID,
        isConfirmationPending: false,
        pendingTemplate: null,
        preview: null,
        templates: [],
        variableNames: [],
        variableValues: {},
        onCancelApply: () => undefined,
        onConfirmApply: () => undefined,
        onPreview: () => undefined,
        onRequestApply: () => undefined,
        onSelectTemplate: () => undefined,
        onVariableChange: () => undefined,
      }),
    )
    // Then: status and rebind are visible, mutation controls share its description, and Copy works.
    expect(markup).toContain('role="status"')
    expect(markup).toContain("Rebind compiler to Project B")
    expect(
      markup.match(new RegExp(`aria-describedby="${COMPILER_PROJECT_REBIND_DESCRIPTION_ID}"`, "g")),
    ).toHaveLength(5)
    expect(
      templateMarkup.match(
        new RegExp(`aria-describedby="${COMPILER_PROJECT_REBIND_DESCRIPTION_ID}"`, "g"),
      ),
    ).toHaveLength(2)
    expect(markup).toMatch(
      /<button(?=[^>]*data-menu-action-target="copy-compiled-prompt")(?![^>]* disabled(?:=|>))[^>]*>/,
    )
  })

  it("wires stable navigation identity and unavailable-profile exclusion through owned files", async () => {
    // Given: the complete owned production path from Insights navigation to compiler selection UI.
    const [navigation, app, panel, contextHook, selection, selector] = await Promise.all([
      readFile("renderer/src/hooks/use-insights-workspace-navigation.ts", "utf8"),
      readFile("renderer/src/app.tsx", "utf8"),
      readFile("renderer/src/components/prompt-compiler-panel.tsx", "utf8"),
      readFile("renderer/src/hooks/use-compiler-project-context.ts", "utf8"),
      readFile("renderer/src/lib/project-context-profile-selection.ts", "utf8"),
      readFile("renderer/src/components/project-context-profile-selector.tsx", "utf8"),
    ])
    // When: the one-shot preservation wiring is inspected.
    // Then: request allocation, propagation, build exclusion, and visible unavailable state coexist.
    expect(navigation).toContain("statePreservationRequest")
    expect(navigation).toContain("requestIdRef.current += 1")
    expect(navigation).toContain("sourceProjectId: snapshot.selectedProjectId")
    expect(navigation).toContain("targetProjectId: projectId")
    expect(app).toContain("compilerStatePreservationRequest=")
    expect(panel).toContain("compilerStatePreservationRequest")
    expect(contextHook).toContain("resolveCompilerProjectTransition")
    expect(contextHook.match(/onProjectTransition\(transitionResolution\)/g)).toHaveLength(1)
    expect(selection).toContain("missingProjectContextProfilePreview")
    expect(selection).toContain("preservedUnavailableProfileId === selectedProfileId")
    expect(selector).toContain("Unavailable Context Profile")
    expect(selector).toContain("disabled")
  })
})
