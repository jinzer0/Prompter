import { describe, expect, it } from "vitest"

import { shouldHandleHarnessTemplateRefresh } from "../renderer/src/hooks/use-available-harness-templates"
import { shouldHandleProjectContextProfileRefresh } from "../renderer/src/hooks/use-compiler-project-context"
import { normalizeHarnessTemplateForm } from "../renderer/src/lib/harness-template-form"
import { normalizeProjectContextProfileForm } from "../renderer/src/lib/project-context-profile-form"
import {
  clearProjectContextProfileSelection,
  missingProjectContextProfilePreview,
  profileBelongsToSelection,
  recommendedProjectContextProfileId,
  shouldResetCompilerOutputForProfileRefresh,
  shouldResetCompilerOutputForProjectContextChange,
} from "../renderer/src/lib/project-context-profile-selection"
import { cn } from "../renderer/src/lib/utils"

describe("UI class utilities", () => {
  it('keeps the later padding-x class when merging cn("px-2", "px-4")', () => {
    const mergedClassName = cn("px-2", "px-4")

    expect(mergedClassName.split(" ")).toContain("px-4")
    expect(mergedClassName.split(" ")).not.toContain("px-2")
  })
})

describe("available harness template refresh handling", () => {
  it("handles each positive refresh signal once", () => {
    expect(
      shouldHandleHarnessTemplateRefresh({
        lastHandledRefreshSignal: 0,
        refreshSignal: 0,
      }),
    ).toBe(false)

    expect(
      shouldHandleHarnessTemplateRefresh({
        lastHandledRefreshSignal: 0,
        refreshSignal: 1,
      }),
    ).toBe(true)

    expect(
      shouldHandleHarnessTemplateRefresh({
        lastHandledRefreshSignal: 1,
        refreshSignal: 1,
      }),
    ).toBe(false)

    expect(
      shouldHandleHarnessTemplateRefresh({
        lastHandledRefreshSignal: 1,
        refreshSignal: 2,
      }),
    ).toBe(true)
  })
})

describe("compiler project context profile refresh handling", () => {
  it("handles each positive refresh signal once", () => {
    expect(
      shouldHandleProjectContextProfileRefresh({
        lastHandledRefreshSignal: 0,
        refreshSignal: 0,
      }),
    ).toBe(false)

    expect(
      shouldHandleProjectContextProfileRefresh({
        lastHandledRefreshSignal: 0,
        refreshSignal: 1,
      }),
    ).toBe(true)

    expect(
      shouldHandleProjectContextProfileRefresh({
        lastHandledRefreshSignal: 1,
        refreshSignal: 1,
      }),
    ).toBe(false)

    expect(
      shouldHandleProjectContextProfileRefresh({
        lastHandledRefreshSignal: 1,
        refreshSignal: 2,
      }),
    ).toBe(true)
  })

  it("resets compiler output for selected project changes", () => {
    expect(shouldResetCompilerOutputForProjectContextChange("project-a", "project-b")).toBe(true)
    expect(shouldResetCompilerOutputForProjectContextChange("project-a", "project-a")).toBe(false)
  })

  it("resets compiler output once for included profile refreshes only", () => {
    expect(shouldResetCompilerOutputForProfileRefresh("profile-a", true, "profile-a")).toBe(true)
    expect(shouldResetCompilerOutputForProfileRefresh("profile-a", false, "profile-a")).toBe(false)
    expect(shouldResetCompilerOutputForProfileRefresh("profile-a", true, "profile-b")).toBe(false)
  })

  it("builds a deterministic warning preview for unavailable selected profiles", () => {
    const preview = missingProjectContextProfilePreview("profile-a")

    expect(preview).toEqual({
      profileId: "profile-a",
      profileName: "Unavailable Context Profile",
      context: null,
      sectionNames: [],
      warnings: ["Selected project context profile is unavailable; profile context was excluded."],
    })
  })
})

describe("harness template form normalization", () => {
  const baseForm = {
    name: "Feature harness",
    scenario: "feature",
    targetAgent: "codex",
    templateBody: "  Keep this body exactly.\n",
    requiredFields: '["originalInput", "projectContext"]',
    clarificationPolicy: '{"mode":"ask","maxQuestions":3}',
  } as const

  it("parses requiredFields JSON textarea into a string array", () => {
    const result = normalizeHarnessTemplateForm(baseForm)

    expect(result.ok).toBe(true)
    expect(result.ok ? result.value.requiredFields : null).toEqual([
      "originalInput",
      "projectContext",
    ])
  })

  it("rejects non-array requiredFields JSON", () => {
    const result = normalizeHarnessTemplateForm({
      ...baseForm,
      requiredFields: '{"originalInput":true}',
    })

    expect(result).toMatchObject({ ok: false, field: "requiredFields" })
  })

  it("rejects requiredFields entries that are not non-empty strings", () => {
    const emptyEntry = normalizeHarnessTemplateForm({
      ...baseForm,
      requiredFields: '["title", ""]',
    })
    const nonStringEntry = normalizeHarnessTemplateForm({
      ...baseForm,
      requiredFields: '["title", 42]',
    })

    expect(emptyEntry).toMatchObject({ ok: false, field: "requiredFields" })
    expect(nonStringEntry).toMatchObject({ ok: false, field: "requiredFields" })
  })

  it("parses clarificationPolicy JSON textarea into an object", () => {
    const result = normalizeHarnessTemplateForm(baseForm)

    expect(result.ok).toBe(true)
    expect(result.ok ? result.value.clarificationPolicy : null).toEqual({
      maxQuestions: 3,
      mode: "ask",
    })
  })

  it("rejects non-object clarificationPolicy JSON", () => {
    const result = normalizeHarnessTemplateForm({
      ...baseForm,
      clarificationPolicy: '["ask"]',
    })

    expect(result).toMatchObject({ ok: false, field: "clarificationPolicy" })
  })

  it("preserves non-blank templateBody exactly", () => {
    const result = normalizeHarnessTemplateForm({
      ...baseForm,
      templateBody: "\n  Exact {{originalInput}} body.  \n",
    })

    expect(result.ok).toBe(true)
    expect(result.ok ? result.value.templateBody : null).toBe(
      "\n  Exact {{originalInput}} body.  \n",
    )
  })

  it("rejects blank or whitespace-only templateBody before bridge input exists", () => {
    const blank = normalizeHarnessTemplateForm({ ...baseForm, templateBody: "" })
    const whitespace = normalizeHarnessTemplateForm({ ...baseForm, templateBody: " \n\t " })

    expect(blank).toMatchObject({ ok: false, field: "templateBody" })
    expect(whitespace).toMatchObject({ ok: false, field: "templateBody" })
  })
})

describe("project context profile form normalization", () => {
  const baseForm = {
    name: "  Default Context  ",
    summary: "\n  Keep summary whitespace.  \n",
    techStack: "  Electron\nReact  ",
    architectureNotes: "",
    codingConventions: "",
    constraints: "",
    forbiddenActions: "",
    acceptanceDefaults: "",
    validationCommands: "npm run typecheck\n  npx vitest run tests/ui-utils.test.ts",
    securityNotes: "",
    additionalContext: "",
    testingNotes: "",
    packageManager: " npm ",
    defaultBranch: " main ",
    repoPath: " /tmp/Prompter ",
    isDefault: false,
  } as const

  it("trims only the name for bridge submission", () => {
    const result = normalizeProjectContextProfileForm(baseForm)

    expect(result.ok).toBe(true)
    expect(result.ok ? result.value.name : null).toBe("Default Context")
    expect(result.ok ? result.value.bridgeInput.name : null).toBe("Default Context")
    expect(result.ok ? result.value.summary : null).toBe("\n  Keep summary whitespace.  \n")
    expect(result.ok ? result.value.packageManager : null).toBe(" npm ")
    expect(result.ok ? result.value.repoPath : null).toBe(" /tmp/Prompter ")
  })

  it("rejects a blank name before bridge input exists", () => {
    const result = normalizeProjectContextProfileForm({ ...baseForm, name: " \n\t " })

    expect(result).toMatchObject({ ok: false, field: "name" })
  })
})

describe("project context profile compiler selection", () => {
  const profiles = [
    { id: "profile-secondary", name: "Secondary", isDefault: false },
    { id: "profile-default", name: "Default", isDefault: true },
  ] as const

  it("recommends the selected project's default profile", () => {
    expect(recommendedProjectContextProfileId(profiles)).toBe("profile-default")
    expect(recommendedProjectContextProfileId([{ ...profiles[0] }])).toBeNull()
  })

  it("identifies stale profile ids after project changes", () => {
    expect(profileBelongsToSelection(profiles, "profile-default")).toBe(true)
    expect(profileBelongsToSelection(profiles, "previous-project-profile")).toBe(false)
    expect(profileBelongsToSelection(profiles, null)).toBe(true)
  })

  it("clears profile include state without changing manual compiler fields", () => {
    const draft = {
      originalInput: "Keep request",
      scenario: "feature",
      targetAgent: "codex",
      projectContext: "Manual context",
      techStack: "Manual stack",
      constraints: "Manual constraints",
      acceptanceCriteria: "Manual acceptance",
      validationCommands: "Manual validation",
      additionalNotes: "Manual notes",
      projectContextProfileId: "previous-project-profile",
      includeProjectContextProfile: true,
    } as const

    const result = clearProjectContextProfileSelection(draft)

    expect(result).toMatchObject({
      originalInput: draft.originalInput,
      projectContext: draft.projectContext,
      techStack: draft.techStack,
      constraints: draft.constraints,
      acceptanceCriteria: draft.acceptanceCriteria,
      validationCommands: draft.validationCommands,
      additionalNotes: draft.additionalNotes,
    })
    expect(result.projectContextProfileId).toBeNull()
    expect(result.includeProjectContextProfile).toBe(false)
  })
})
