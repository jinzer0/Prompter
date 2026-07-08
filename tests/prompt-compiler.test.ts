import { describe, expect, it } from "vitest"

import { compileStaticPrompt } from "../renderer/src/lib/prompt-compiler/static-prompt-compiler"

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
})
