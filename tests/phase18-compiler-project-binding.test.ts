import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { PromptCompilerOutputPanel } from "../renderer/src/components/prompt-compiler-output-panel"
import {
  COMPILER_PROJECT_REBIND_DESCRIPTION_ID,
  type CompilerProjectAction,
  type CompilerStatePreservationRequest,
  compilerProjectActionIsAllowed,
  createCompilerProjectBinding,
  executeGuardedCompilerPersistence,
  rebindCompilerDraft,
  reduceCompilerProjectBinding,
  resolveCompilerProjectTransition,
} from "../renderer/src/lib/compiler-project-binding"
import { emptyCompilerInput } from "../renderer/src/lib/prompt-compiler/llm-compiler-flow"
import { compileStaticPrompt } from "../renderer/src/lib/prompt-compiler/static-prompt-compiler"

const preservationRequest = {
  sourceProjectId: "project-a",
  targetProjectId: "project-b",
  requestId: 18,
} satisfies CompilerStatePreservationRequest

const guardedActions = [
  "analyze",
  "compile_static",
  "compile_llm",
  "template_apply",
  "save_prompt",
  "save_derived",
  "save_next_version",
  "edit_output",
  "save_export_file",
] as const satisfies readonly CompilerProjectAction[]
const persistenceActions = ["save_prompt", "save_derived", "save_next_version"] as const

describe("Phase 18 compiler project binding", () => {
  it("enters preserved_unbound only for the exact A to B request", () => {
    // Given: compiler state explicitly bound to project A.
    const binding = createCompilerProjectBinding("project-a")
    // When: Insights preserves it across the exact requested A to B transition.
    const next = reduceCompilerProjectBinding(binding, {
      kind: "project_preserved",
      request: preservationRequest,
    })
    // Then: ownership remains explicit instead of silently following project B.
    expect(next).toEqual({ kind: "preserved_unbound", ...preservationRequest })
  })

  it("rejects consumed, mismatched, and ordinary preservation requests", () => {
    // Given: stale and mismatched requests around an A to B transition.
    const cases = [
      { appliedRequestId: 18, request: preservationRequest },
      {
        appliedRequestId: null,
        request: { ...preservationRequest, sourceProjectId: "project-c" },
      },
      {
        appliedRequestId: null,
        request: { ...preservationRequest, targetProjectId: "project-c" },
      },
      { appliedRequestId: null, request: null },
    ] as const
    // When: each transition is resolved.
    const resolutions = cases.map(({ appliedRequestId, request }) =>
      resolveCompilerProjectTransition({
        appliedRequestId,
        currentProjectId: "project-b",
        previousProjectId: "project-a",
        request,
      }),
    )
    // Then: every non-exact request follows the ordinary reset path.
    expect(resolutions).toEqual([
      { kind: "reset", projectId: "project-b" },
      { kind: "reset", projectId: "project-b" },
      { kind: "reset", projectId: "project-b" },
      { kind: "reset", projectId: "project-b" },
    ])
  })

  it("keeps draft and B-profile edits unbound", () => {
    // Given: preserved output from A is visible after selecting B.
    const binding = reduceCompilerProjectBinding(createCompilerProjectBinding("project-a"), {
      kind: "project_preserved",
      request: preservationRequest,
    })
    // When: user-authored fields and the selected profile are edited for B.
    const editedDraft = {
      ...emptyCompilerInput,
      title: "Edited in B",
      projectContextProfileId: "profile-b",
      includeProjectContextProfile: true,
    }
    // Then: edits do not participate in ownership and cannot silently bind the compiler.
    expect(editedDraft.title).toBe("Edited in B")
    expect(editedDraft.projectContextProfileId).toBe("profile-b")
    expect(compilerProjectActionIsAllowed(binding, "project-b", "compile_static")).toBe(false)
  })

  it("rebinds only to the exact target and preserves user-authored draft fields", () => {
    // Given: an A draft containing a stale profile plus authored compiler fields.
    const draft = {
      ...emptyCompilerInput,
      title: "Keep title",
      originalInput: "Keep original request",
      projectContext: "Keep manual context",
      scenario: "bugfix",
      targetAgent: "claude_code",
      harnessTemplateId: "harness-a",
      projectContextProfileId: "profile-a",
      includeProjectContextProfile: true,
    } as const
    const unbound = reduceCompilerProjectBinding(createCompilerProjectBinding("project-a"), {
      kind: "project_preserved",
      request: preservationRequest,
    })
    // When: exact and wrong-project rebinds are requested.
    const rebound = reduceCompilerProjectBinding(unbound, {
      kind: "rebind_requested",
      projectId: "project-b",
    })
    const rejected = reduceCompilerProjectBinding(unbound, {
      kind: "rebind_requested",
      projectId: "project-c",
    })
    const reboundDraft = rebindCompilerDraft(draft)
    // Then: only B binds, the stale profile clears, and authored fields survive exactly.
    expect(rebound).toEqual({ kind: "bound", projectId: "project-b" })
    expect(rejected).toBe(unbound)
    expect(reboundDraft).toEqual({
      ...draft,
      projectContextProfileId: null,
      includeProjectContextProfile: false,
    })
  })

  it("preserves A output visibly but blocks every B mutation while Copy stays allowed", () => {
    // Given: a real static compiler output produced while bound to A.
    const compiled = compileStaticPrompt(
      {
        ...emptyCompilerInput,
        title: "Project A output",
        originalInput: "Build the A-only workflow",
      },
      null,
    )
    const unbound = reduceCompilerProjectBinding(createCompilerProjectBinding("project-a"), {
      kind: "project_preserved",
      request: preservationRequest,
    })
    // When: the preserved compiler is viewed under B.
    const guardedResults = guardedActions.map((action) =>
      compilerProjectActionIsAllowed(unbound, "project-b", action),
    )
    // Then: output remains copyable, while analyze/compile/template/save paths are blocked.
    expect(compiled.compiledPrompt.length).toBeGreaterThan(0)
    expect(guardedResults).toEqual(guardedActions.map(() => false))
    expect(compilerProjectActionIsAllowed(unbound, "project-b", "copy")).toBe(true)
  })

  it("renders preserved output read-only with native save guarded while preview and copy stay enabled", () => {
    // Given: compiled A output is retained under B without rebinding ownership.
    const compiled = compileStaticPrompt(
      {
        ...emptyCompilerInput,
        title: "Project A output",
        originalInput: "Keep the preserved output selectable",
      },
      null,
    )
    // When: the compiler output workspace renders its unbound capabilities.
    const markup = renderToStaticMarkup(
      createElement(PromptCompilerOutputPanel, {
        canEditOutput: false,
        canSaveToFile: false,
        compiled,
        draft: emptyCompilerInput,
        editablePrompt: compiled.compiledPrompt,
        guardDescriptionId: COMPILER_PROJECT_REBIND_DESCRIPTION_ID,
        outputRevision: 1,
        projectContextPreview: null,
        selectedProject: null,
        onEditablePromptChange: () => undefined,
      }),
    )
    // Then: mutation controls share the rebind description, but export preview/copy remain live.
    expect(markup).toMatch(
      new RegExp(
        `<textarea(?=[^>]*aria-label="Generated prompt preview")(?=[^>]*readOnly="")(?=[^>]*aria-describedby="${COMPILER_PROJECT_REBIND_DESCRIPTION_ID}")[^>]*>`,
      ),
    )
    expect(markup).toMatch(
      new RegExp(
        `<button(?=[^>]*data-menu-action-target="save-compiled-export")(?=[^>]*disabled="")(?=[^>]*aria-describedby="${COMPILER_PROJECT_REBIND_DESCRIPTION_ID}")[^>]*>`,
      ),
    )
    expect(markup).toMatch(
      new RegExp(
        `<button(?=[^>]*aria-describedby="${COMPILER_PROJECT_REBIND_DESCRIPTION_ID}")(?=[^>]*disabled="")[^>]*>Use improved prompt</button>`,
      ),
    )
    expect(markup).toMatch(/<button(?![^>]*disabled(?:=|>))[^>]*>Preview export<\/button>/)
    expect(markup).toMatch(/<button(?![^>]*disabled(?:=|>))[^>]*>Copy compiled export<\/button>/)
  })

  it("prevents every guarded persistence handler from invoking its repository callback", async () => {
    // Given: preserved A state displayed under project B.
    const unbound = reduceCompilerProjectBinding(createCompilerProjectBinding("project-a"), {
      kind: "project_preserved",
      request: preservationRequest,
    })
    const callbacks = [vi.fn(), vi.fn(), vi.fn()]
    // When: prompt, derived, and next-version persistence handlers are invoked programmatically.
    const results = await Promise.all(
      callbacks.map((callback, index) =>
        executeGuardedCompilerPersistence(
          {
            action: persistenceActions[index] ?? "save_prompt",
            binding: unbound,
            currentProjectId: "project-b",
          },
          callback,
        ),
      ),
    )
    // Then: all stop before any wrong-project repository callback can run.
    expect(results).toEqual(["blocked", "blocked", "blocked"])
    for (const callback of callbacks) {
      expect(callback).not.toHaveBeenCalled()
    }
  })
})
