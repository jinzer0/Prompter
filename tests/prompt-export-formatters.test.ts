import { describe, expect, it } from "vitest"

import {
  EXPORT_FORMATS,
  exportFormatLabels,
  exportFormatSchema,
  exportPromptInputSchema,
  exportPromptResultSchema,
} from "../electron/ipc-contract"
import { formatPromptExport } from "../electron/prompt-export-formatters"

const baseInput = {
  promptAssetId: "11111111-1111-4111-8111-111111111111",
  promptVersionId: "22222222-2222-4222-8222-222222222222",
  title: "Prompt Export / Test: 01",
  scenario: "feature",
  targetAgent: "codex",
  originalInput: "Build a prompt export formatter.",
  compiledPrompt: [
    "# Objective",
    "Ship the export formatter.",
    "# Context",
    "The app is local-first.",
    "# Task",
    "Format prompt exports.",
    "# Scope",
    "Do not wire IPC yet.",
    "# Constraints",
    "Keep it pure.",
    "# Acceptance Criteria",
    "Tests pass.",
    "# Validation",
    "npm test -- tests/prompt-export-formatters.test.ts",
    "# Working Instructions",
    "Follow the export contract.",
    "# Final Response Format",
    "Summarize the result.",
  ].join("\n\n"),
  assumptions: ["The formatter stays pure."],
  questions: [
    {
      id: "format",
      question: "Which export format should we use?",
      whyItMatters: "It changes the filename and content layout.",
      options: ["markdown", "codex"],
      required: true,
    },
  ],
  answers: [
    {
      questionId: "format",
      question: "Which export format should we use?",
      answer: "markdown",
    },
  ],
  acceptanceCriteria: ["All export formats render deterministically."],
  validationCommands: ["npm test -- tests/prompt-export-formatters.test.ts"],
  tags: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      name: "export",
      createdAt: 1700000000000,
    },
  ],
  projectName: "Prompter",
  qualityScore: 88,
  createdAt: 1700000000000,
  updatedAt: 1700000005000,
} as const

const forbiddenTerms = [
  "prompt_runs",
  "agent_runs",
  "execution_results",
  "validation_results",
  "run_logs",
  "safeStorage",
] as const

describe("prompt export formatter contract", () => {
  it("exposes all supported export formats and validates them", () => {
    expect(EXPORT_FORMATS).toEqual([
      "markdown",
      "codex",
      "claude_code",
      "cursor",
      "generic_agent",
      "agents_md",
      "skill_md",
    ])

    for (const format of EXPORT_FORMATS) {
      expect(exportFormatSchema.parse(format)).toBe(format)
    }

    expect(exportFormatLabels).toEqual({
      markdown: "Markdown Prompt",
      codex: "Codex Prompt",
      claude_code: "Claude Code Prompt",
      cursor: "Cursor Prompt",
      generic_agent: "Generic Agent Prompt",
      agents_md: "AGENTS.md Snippet",
      skill_md: "SKILL.md Draft",
    })
  })

  it("parses and formats a markdown export with metadata and a safe filename", () => {
    const input = exportPromptInputSchema.parse({
      ...baseInput,
      format: "markdown",
    })

    const result = formatPromptExport(input)

    expect(exportPromptResultSchema.parse(result)).toEqual(result)
    expect(result).toMatchObject({
      format: "markdown",
      filename: "prompt-export-test-01.md",
      mimeType: "text/markdown",
    })
    expect(result.content).toContain("# Prompt Export / Test: 01")
    expect(result.content).toContain("## Metadata")
    expect(result.content).toContain("Project: Prompter")
    expect(result.content).toContain("Quality score (compiler/saved summary): 88")
    expect(result.content).toContain("## Original Input")
    expect(result.content).toContain("## Compiled Prompt")
    expect(result.content).toContain("## Clarification")
    expect(result.content).toContain("## Acceptance Criteria")
    expect(result.content).toContain("## Validation Commands")
    expect(result.content).toContain("## Attribution")
    expect(result.content).toContain("Generated with Prompter.")
    expect(result.content).toContain("# Objective")
  })

  it("falls back to the timestamp when the title is blank", () => {
    const result = formatPromptExport(
      exportPromptInputSchema.parse({
        ...baseInput,
        title: "   ",
        format: "markdown",
      }),
    )

    expect(result.filename).toBe("prompt-1700000000000.md")
  })

  it.each([
    ["codex", "codex", "inspect the repository structure", "Do not store prompt execution results"],
    ["claude_code", "claude", "Separate assumptions", "changed files"],
    ["cursor", "cursor", "Identify candidate files", "Do not perform a large rewrite"],
    ["generic_agent", "agent", "Confirm the context", "tool-specific commands"],
  ] as const)("places %s instructions in the export content", (format, filenameStem, phrase, guardrail) => {
    const result = formatPromptExport(
      exportPromptInputSchema.parse({
        ...baseInput,
        format,
      }),
    )

    expect(result.filename).toBe(`prompt-export-test-01.${filenameStem}.md`)
    expect(result.content).toContain("## Agent Instructions")
    expect(result.content).toContain(phrase)
    expect(result.content).toContain(guardrail)
    expect(result.content).toContain("## Compiled Prompt")
    expect(result.content).toContain("## Attribution")
    expect(result.content).toContain("Generated with Prompter.")
    expect(result.content.indexOf("# Objective")).toBeLessThan(
      result.content.indexOf("## Metadata"),
    )
    expect(result.content.indexOf("## Agent Instructions")).toBeLessThan(
      result.content.indexOf("## Compiled Prompt"),
    )
  })

  it("creates a reusable AGENTS.md snippet without embedding the full compiled prompt", () => {
    const result = formatPromptExport(
      exportPromptInputSchema.parse({
        ...baseInput,
        format: "agents_md",
      }),
    )

    expect(result.filename).toBe("AGENTS.snippet.md")
    expect(result.content).toContain("# Prompter Agent Instructions")
    expect(result.content).toContain("## Project Context")
    expect(result.content).toContain("## General Working Rules")
    expect(result.content).toContain("## Prompt Workflow Rules")
    expect(result.content).toContain("## Out of Scope")
    expect(result.content).toContain("## Attribution")
    expect(result.content).toContain("Generated with Prompter.")
    expect(result.content).toContain("Do not store prompt execution results.")
    expect(result.content).not.toContain(baseInput.compiledPrompt)
  })

  it("creates a reusable SKILL.md draft with frontmatter and validation sections", () => {
    const result = formatPromptExport(
      exportPromptInputSchema.parse({
        ...baseInput,
        format: "skill_md",
      }),
    )

    expect(result.filename).toBe("SKILL.md")
    expect(result.content).toContain("---\nname: prompt-export-test-01")
    expect(result.content).toContain("description: Use this skill when")
    expect(result.content).toContain("# Skill Purpose")
    expect(result.content).toContain("# When to Use")
    expect(result.content).toContain("# Inputs")
    expect(result.content).toContain("# Workflow")
    expect(result.content).toContain("# Output Format")
    expect(result.content).toContain("# Validation")
    expect(result.content).toContain("# Constraints")
    expect(result.content).toContain("# Attribution")
    expect(result.content).toContain("Generated with Prompter.")
    expect(result.content).not.toContain(baseInput.compiledPrompt)
  })

  it.each(EXPORT_FORMATS)("keeps %s exports free of secret and run-storage terms", (format) => {
    const result = formatPromptExport(
      exportPromptInputSchema.parse({
        ...baseInput,
        format,
      }),
    )

    for (const term of forbiddenTerms) {
      expect(result.content).not.toContain(term)
    }
  })
})
