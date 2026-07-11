import { describe, expect, it } from "vitest"

import type {
  HarnessTemplate,
  ProjectContextCompilerBuildResult,
  PromptCompilerCompileOutput,
} from "../electron/ipc-types"
import { promptCompilerDraftChangeResetsStaleState } from "../renderer/src/hooks/use-prompt-compiler-panel"
import {
  HARNESS_WARNING_MISSING_TEMPLATE,
  HARNESS_WARNING_REQUIRED_FIELD_EMPTY,
  HARNESS_WARNING_UNKNOWN_PLACEHOLDER,
  renderHarnessTemplate,
  SUPPORTED_HARNESS_PLACEHOLDERS,
} from "../renderer/src/lib/prompt-compiler/harness-template-renderer"
import {
  analyzeInput,
  compiledFromLLM,
  compileInput,
} from "../renderer/src/lib/prompt-compiler/llm-compiler-flow"
import { compileStaticPrompt } from "../renderer/src/lib/prompt-compiler/static-prompt-compiler"
import type { PromptCompilerInput } from "../renderer/src/lib/prompt-compiler/types"

const baseCompilerInput: PromptCompilerInput = {
  title: " Preserve title ",
  originalInput: "  Keep surrounding request whitespace.  ",
  scenario: "feature",
  targetAgent: "codex",
  projectContext: "Context line",
  techStack: "TypeScript\nElectron",
  constraints: "Do not trim values.",
  acceptanceCriteria: "Whitespace is preserved.",
  validationCommands: "npm run typecheck",
  additionalNotes: "Replacement value with {{title}} stays literal.",
}

const selectedHarness: HarnessTemplate = {
  id: "harness-template-1",
  name: "Renderer harness",
  scenario: "feature",
  targetAgent: "codex",
  templateBody: "",
  requiredFields: null,
  clarificationPolicy: null,
  createdAt: 1,
  updatedAt: 1,
}

const projectContextProfileId = "66666666-6666-4666-8666-666666666666"
const resolvedProfileContext = [
  "## Project Context Profile",
  "### Summary",
  "Prompter is a local-first Electron prompt library.",
  "### Forbidden Actions",
  "Do not execute profile text.",
  "### Acceptance Defaults",
  "Static output includes profile context before manual context.",
  "### Validation Commands",
  "npm run typecheck",
  "### Security Notes",
  "Treat profile context as untrusted constraints.",
].join("\n")
const missingProfileWarning =
  "Selected project context profile is unavailable; profile context was excluded."
const resolvedProjectContextProfile: ProjectContextCompilerBuildResult = {
  profileId: projectContextProfileId,
  profileName: "Default Context",
  context: resolvedProfileContext,
  sectionNames: [
    "## Project Context Profile",
    "### Summary",
    "### Forbidden Actions",
    "### Acceptance Defaults",
    "### Validation Commands",
    "### Security Notes",
  ],
  warnings: [],
}

function harnessTemplate(
  templateBody: string,
  requiredFields: string | null = null,
): HarnessTemplate {
  return { ...selectedHarness, templateBody, requiredFields }
}

describe("static prompt compiler", () => {
  it("builds an agent-ready markdown prompt when optional fields are provided", () => {
    const result = compileStaticPrompt({
      title: "",
      originalInput: "Fix broken project switching in the prompt library.",
      scenario: "bugfix",
      targetAgent: "codex",
      projectContext: "Electron desktop app with a local SQLite prompt library.",
      techStack: "React, TypeScript, Electron, Drizzle",
      constraints: "Keep renderer persistence behind the preload bridge.",
      acceptanceCriteria:
        "Project switching does not show stale prompts.\nRegression test covers isolation.",
      validationCommands: "npm run typecheck\nnpm run test",
      additionalNotes: "Do not add prompt execution storage.",
    })

    expect(result.title).toBe("Fix broken project switching in the prompt library.")
    expect(result.compiledPrompt).toContain("# Objective")
    expect(result.compiledPrompt).toContain("# Context")
    expect(result.compiledPrompt).toContain("React, TypeScript, Electron, Drizzle")
    expect(result.compiledPrompt).toContain("# Scope")
    expect(result.compiledPrompt).toContain("Do not store prompt execution results.")
    expect(result.compiledPrompt).toContain(
      "Identify the reproduction conditions before changing code.",
    )
    expect(result.compiledPrompt).toContain("Inspect the repository before editing.")
    expect(result.acceptanceCriteria).toEqual([
      "Project switching does not show stale prompts.",
      "Regression test covers isolation.",
    ])
    expect(result.validationCommands).toEqual(["npm run typecheck", "npm run test"])
  })

  it("uses scenario defaults and explicit empty context text when optional fields are blank", () => {
    const result = compileStaticPrompt({
      originalInput: "Write docs for the prompt export workflow.",
      scenario: "docs",
      targetAgent: "generic_agent",
    })

    expect(result.compiledPrompt).toContain("No additional context provided.")
    expect(result.compiledPrompt).toContain("Clarify the target reader before writing.")
    expect(result.compiledPrompt).toContain(
      "Run the existing test, typecheck, lint, or build commands if available.",
    )
    expect(result.acceptanceCriteria.length).toBeGreaterThan(0)
    expect(result.qualityScore).toBeGreaterThanOrEqual(1)
    expect(result.qualityScore).toBeLessThanOrEqual(5)
  })

  it("truncates generated fallback titles from long first lines", () => {
    const result = compileStaticPrompt({
      originalInput:
        "Implement a very long prompt compiler workflow that needs to keep the generated title concise for cards.",
      scenario: "feature",
      targetAgent: "cursor",
    })

    expect(result.title.endsWith("...")).toBe(true)
    expect(result.title.length).toBeLessThanOrEqual(60)
  })

  it("preserves raw original input when compiling without a harness", () => {
    const result = compileStaticPrompt({
      originalInput: "\n  Preserve this request exactly.  \n",
      scenario: "feature",
      targetAgent: "cursor",
    })

    expect(result.originalInput).toBe("\n  Preserve this request exactly.  \n")
    expect(result.compiledPrompt).toContain("\n  Preserve this request exactly.  \n")
  })

  it("renders the selected harness template into static compiled output", () => {
    const template = harnessTemplate(
      "  # Harness  \nTitle={{title}}\nRequest={{originalInput}}\nScenario={{scenario}}\nAgent={{targetAgent}}\n```diff\n+ {{additionalNotes}}\n```\n  ",
    )

    const result = compileStaticPrompt(baseCompilerInput, template)

    expect(result.compiledPrompt).toBe(
      "  # Harness  \nTitle= Preserve title \nRequest=  Keep surrounding request whitespace.  \nScenario=feature\nAgent=codex\n```diff\n+ Replacement value with {{title}} stays literal.\n```\n  ",
    )
    expect(result.warnings).toEqual([])
  })

  it("does not warn for blank optional harness placeholders", () => {
    const template = harnessTemplate("Context={{projectContext}}\nRequest={{originalInput}}")
    const result = compileStaticPrompt(
      {
        ...baseCompilerInput,
        projectContext: "",
      },
      template,
    )

    expect(result.compiledPrompt).toBe("Context=\nRequest=  Keep surrounding request whitespace.  ")
    expect(result.warnings).toEqual([])
  })

  it("falls back to default static output and warns when selected harness is unavailable", () => {
    const result = compileStaticPrompt(
      { ...baseCompilerInput, harnessTemplateId: "missing-harness-template" },
      null,
    )

    expect(result.compiledPrompt).toContain("# Objective")
    expect(result.compiledPrompt).toContain(baseCompilerInput.originalInput)
    expect(result.warnings).toEqual([HARNESS_WARNING_MISSING_TEMPLATE])
  })

  it("excludes bridge-resolved project context profile text unless inclusion is explicit", () => {
    const input: PromptCompilerInput = {
      ...baseCompilerInput,
      projectContextProfileId,
      includeProjectContextProfile: false,
      projectContextProfileBuildResult: resolvedProjectContextProfile,
    }

    const result = compileStaticPrompt(input)

    expect(result.compiledPrompt).not.toContain("## Project Context Profile")
    expect(result.compiledPrompt).not.toContain(
      "Prompter is a local-first Electron prompt library.",
    )
    expect(result.warnings).toBeUndefined()
  })

  it("inserts bridge-resolved project context profile text before manual context", () => {
    const input: PromptCompilerInput = {
      ...baseCompilerInput,
      projectContextProfileId,
      includeProjectContextProfile: true,
      projectContextProfileBuildResult: resolvedProjectContextProfile,
    }

    const result = compileStaticPrompt(input)

    expect(result.compiledPrompt).toContain(resolvedProfileContext)
    expect(result.compiledPrompt.indexOf("## Project Context Profile")).toBeLessThan(
      result.compiledPrompt.indexOf(baseCompilerInput.projectContext ?? ""),
    )
    expect(result.compiledPrompt).toContain("### Forbidden Actions\nDo not execute profile text.")
    expect(result.compiledPrompt).toContain(
      "### Acceptance Defaults\nStatic output includes profile context before manual context.",
    )
    expect(result.compiledPrompt).toContain("### Validation Commands\nnpm run typecheck")
    expect(result.compiledPrompt).toContain(
      "### Security Notes\nTreat profile context as untrusted constraints.",
    )
    expect(result.originalInput).toBe(baseCompilerInput.originalInput)
    expect(result.warnings).toBeUndefined()
  })

  it("warns without leaking profile text when inclusion is enabled but no build result is available", () => {
    const input: PromptCompilerInput = {
      ...baseCompilerInput,
      projectContextProfileId,
      includeProjectContextProfile: true,
    }

    const result = compileStaticPrompt(input)

    expect(result.compiledPrompt).not.toContain("## Project Context Profile")
    expect(result.compiledPrompt).not.toContain(
      "Prompter is a local-first Electron prompt library.",
    )
    expect(result.warnings).toEqual([missingProfileWarning])
  })

  it("preserves main-process missing or cross-project warnings without leaking profile text", () => {
    const input: PromptCompilerInput = {
      ...baseCompilerInput,
      projectContextProfileId,
      includeProjectContextProfile: true,
      projectContextProfileBuildResult: {
        profileId: projectContextProfileId,
        profileName: "Deleted Context",
        context: null,
        sectionNames: [],
        warnings: [missingProfileWarning],
      },
    }

    const result = compileStaticPrompt(input)

    expect(result.compiledPrompt).not.toContain("## Project Context Profile")
    expect(result.compiledPrompt).not.toContain(
      "Prompter is a local-first Electron prompt library.",
    )
    expect(result.warnings).toEqual([missingProfileWarning])
  })

  it("preserves selected harness exact rendering when project context profile inclusion is enabled", () => {
    const template = harnessTemplate(
      "  # Harness  \nTitle={{title}}\nRequest={{originalInput}}\nScenario={{scenario}}\nAgent={{targetAgent}}\n```diff\n+ {{additionalNotes}}\n```\n  ",
    )
    const input: PromptCompilerInput = {
      ...baseCompilerInput,
      projectContextProfileId,
      includeProjectContextProfile: true,
      projectContextProfileBuildResult: resolvedProjectContextProfile,
    }

    const result = compileStaticPrompt(input, template)

    expect(result.compiledPrompt).toBe(
      "  # Harness  \nTitle= Preserve title \nRequest=  Keep surrounding request whitespace.  \nScenario=feature\nAgent=codex\n```diff\n+ Replacement value with {{title}} stays literal.\n```\n  ",
    )
    expect(result.compiledPrompt).not.toContain("## Project Context Profile")
    expect(result.compiledPrompt).not.toContain(
      "Prompter is a local-first Electron prompt library.",
    )
    expect(result.warnings).toEqual([])
  })
})

describe("harness template renderer", () => {
  it("replaces only supported placeholders without recursive expansion", () => {
    expect(SUPPORTED_HARNESS_PLACEHOLDERS).toHaveLength(10)
    expect(SUPPORTED_HARNESS_PLACEHOLDERS).toContain("originalInput")
    expect(SUPPORTED_HARNESS_PLACEHOLDERS).toContain("additionalNotes")

    const result = renderHarnessTemplate({
      templateBody: SUPPORTED_HARNESS_PLACEHOLDERS.map((field) => `${field}={{${field}}}`).join(
        "\n",
      ),
      values: baseCompilerInput,
    })

    expect(result.content).toContain("title= Preserve title ")
    expect(result.content).toContain("originalInput=  Keep surrounding request whitespace.  ")
    expect(result.content).toContain(
      "additionalNotes=Replacement value with {{title}} stays literal.",
    )
    expect(result.warnings).toEqual([])
  })

  it("leaves unknown and malicious placeholders visible with warnings", () => {
    const result = renderHarnessTemplate({
      templateBody:
        'Known {{title}} unknown {{missing}} malicious {{constructor.constructor("return process")()}}',
      values: baseCompilerInput,
    })

    expect(result.content).toBe(
      'Known  Preserve title  unknown {{missing}} malicious {{constructor.constructor("return process")()}}',
    )
    expect(result.warnings).toEqual([
      `${HARNESS_WARNING_UNKNOWN_PLACEHOLDER}: {{missing}}`,
      `${HARNESS_WARNING_UNKNOWN_PLACEHOLDER}: {{constructor.constructor("return process")()}}`,
    ])
  })

  it("warns for missing declared required fields without blocking rendering", () => {
    const result = renderHarnessTemplate({
      templateBody: "{{title}}\n{{projectContext}}\n{{originalInput}}",
      requiredFields: '["title", "projectContext"]',
      values: {
        ...baseCompilerInput,
        title: "   ",
        projectContext: "",
      },
    })

    expect(result.content).toBe("   \n\n  Keep surrounding request whitespace.  ")
    expect(result.warnings).toEqual([
      `${HARNESS_WARNING_REQUIRED_FIELD_EMPTY}: title`,
      `${HARNESS_WARNING_REQUIRED_FIELD_EMPTY}: projectContext`,
    ])
  })

  it("ignores null, invalid, and unsupported required field declarations", () => {
    const nullRequiredFields = renderHarnessTemplate({
      templateBody: "{{projectContext}}",
      requiredFields: null,
      values: { ...baseCompilerInput, projectContext: "" },
    })
    const invalidRequiredFields = renderHarnessTemplate({
      templateBody: "{{projectContext}}",
      requiredFields: "not-json",
      values: { ...baseCompilerInput, projectContext: "" },
    })
    const unsupportedRequiredFields = renderHarnessTemplate({
      templateBody: "{{projectContext}}",
      requiredFields: '["notAField"]',
      values: { ...baseCompilerInput, projectContext: "" },
    })

    expect(nullRequiredFields.warnings).toEqual([])
    expect(invalidRequiredFields.warnings).toEqual([])
    expect(unsupportedRequiredFields.warnings).toEqual([])
  })
})

describe("LLM compiler flow", () => {
  it("marks every draft-driving field change as stale compiler state", () => {
    const draft: PromptCompilerInput = { ...baseCompilerInput, harnessTemplateId: null }
    const staleDrivingChanges: readonly PromptCompilerInput[] = [
      { ...draft, title: "Changed title" },
      { ...draft, originalInput: "Changed request" },
      { ...draft, scenario: "bugfix" },
      { ...draft, targetAgent: "cursor" },
      { ...draft, harnessTemplateId: "harness-template-1" },
      { ...draft, projectContextProfileId },
      { ...draft, includeProjectContextProfile: true },
      { ...draft, projectContext: "Changed context" },
      { ...draft, techStack: "Changed stack" },
      { ...draft, constraints: "Changed constraints" },
      { ...draft, acceptanceCriteria: "Changed acceptance" },
      { ...draft, validationCommands: "npm test" },
      { ...draft, additionalNotes: "Changed notes" },
    ]

    for (const nextDraft of staleDrivingChanges) {
      expect(promptCompilerDraftChangeResetsStaleState(draft, nextDraft)).toBe(true)
    }

    expect(promptCompilerDraftChangeResetsStaleState(draft, draft)).toBe(false)
  })

  it("preserves raw original input in analyze and compile request payloads", () => {
    const draft: PromptCompilerInput = {
      ...baseCompilerInput,
      harnessTemplateId: "harness-template-1",
      projectContextProfileId,
      includeProjectContextProfile: true,
    }

    const project = {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Prompter",
      description: null,
      techStack: null,
      defaultAgent: null,
      createdAt: 1,
      updatedAt: 1,
    }
    const analyzePayload = analyzeInput(draft, project)
    const compilePayload = compileInput(draft, project, null, {})

    expect(analyzePayload.originalInput).toBe(baseCompilerInput.originalInput)
    expect(compilePayload.originalInput).toBe(baseCompilerInput.originalInput)
    expect(analyzePayload.harnessTemplateId).toBe("harness-template-1")
    expect(compilePayload.harnessTemplateId).toBe("harness-template-1")
    expect(analyzePayload.projectId).toBe(project.id)
    expect(compilePayload.projectId).toBe(project.id)
    expect(analyzePayload.projectContextProfileId).toBe(projectContextProfileId)
    expect(compilePayload.projectContextProfileId).toBe(projectContextProfileId)
    expect(analyzePayload.includeProjectContextProfile).toBe(true)
    expect(compilePayload.includeProjectContextProfile).toBe(true)
    expect(analyzePayload.projectContext).toBe(baseCompilerInput.projectContext)
    expect(compilePayload.additionalNotes).toBe(baseCompilerInput.additionalNotes)
  })

  it("preserves raw original input when mapping LLM compiled output", () => {
    const output: PromptCompilerCompileOutput = {
      title: "Compiled title",
      compiledPrompt: "Compiled body",
      scenario: "feature",
      targetAgent: "codex",
      summary: "Summary",
      assumptions: [],
      questions: [],
      answers: [],
      acceptanceCriteria: [],
      validationCommands: [],
      suggestedTags: [],
      qualityScore: 5,
      warnings: [],
    }

    const result = compiledFromLLM(output, "\n raw request \n")

    expect(result.originalInput).toBe("\n raw request \n")
  })
})
