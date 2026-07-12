import { describe, expect, it } from "vitest"

import { promptQualityReviewResultSchema } from "../electron/ipc-contract"
import type { PromptQualityReviewResult } from "../electron/ipc-types"
import { reviewLocalPromptQuality } from "../electron/prompt-quality/local-reviewer"

const completePrompt = `# Objective
Implement a deterministic local prompt-quality reviewer without external services.

# Context
This Electron app stores prompt assets locally and uses Vitest for focused tests.

# Task
- Review compiled prompts using deterministic local heuristics.
- Return contract-valid scores, findings, and clarifying questions.

# Scope
## In scope
- Add only the local reviewer and its focused tests.

## Out of scope
- Do not call OpenAI, persist reviews, or change prompt text.

# Constraints
- Preserve all prompt text, code fences, diffs, and whitespace exactly.
- Do not access the filesystem, shell, database, or repository.

# Acceptance Criteria
- A complete prompt returns an excellent or good grade with low ambiguity risk.
- Missing or vague sections produce actionable issues with evidence.
- The reviewer never mutates the supplied prompt snapshot.

# Validation
- npx vitest run tests/prompt-quality.test.ts
- npm run typecheck

# Working Instructions
- Keep the implementation pure and deterministic.
- Do not introduce dependencies.

# Final Response Format
1. Summary of changes
2. Files changed
3. Validation run`

const baseSnapshot = {
  compiledPrompt: completePrompt,
  originalInput: "Review a compiled prompt without changing its exact text.",
  scenario: "feature",
  targetAgent: "codex",
  harnessTemplateId: null,
  projectContextProfileId: null,
  includeProjectContextProfile: false,
  projectContext: null,
  constraints: "Preserve prompt text exactly.",
  acceptanceCriteria: "The review returns deterministic contract-valid findings.",
  validationCommands: "npx vitest run tests/prompt-quality.test.ts",
} satisfies PromptQualityReviewResult["snapshot"]

function reviewPrompt(compiledPrompt: string): PromptQualityReviewResult {
  return reviewLocalPromptQuality({
    snapshot: { ...baseSnapshot, compiledPrompt },
    createdAt: 1,
  })
}

function withoutHeading(prompt: string, heading: string): string {
  return prompt.replace(heading, `# Removed ${heading.slice(2)}`)
}

describe("local prompt-quality reviewer", () => {
  it("returns a high-quality, low-ambiguity unsaved draft review for a complete prompt", () => {
    // Given: a complete prompt with explicit scope, validation, and boundaries.

    // When: the local reviewer evaluates the prompt.
    const result = reviewPrompt(completePrompt)

    // Then: it returns a contract-valid high-quality review without persistence identifiers.
    expect(promptQualityReviewResultSchema.parse(result)).toEqual(result)
    expect(result).toMatchObject({
      id: null,
      source: "draft",
      reviewMode: "local",
      grade: "excellent",
    })
    expect(result.dimensionScores.ambiguityRisk).toBeLessThan(40)
    expect(result.dimensionScores.scope).toBeGreaterThanOrEqual(80)
    expect(result.dimensionScores.safety).toBeGreaterThanOrEqual(80)
  })

  it.each([
    "# Objective",
    "# Context",
    "# Acceptance Criteria",
    "# Validation",
    "# Final Response Format",
  ])("reports %s when its heading is absent", (heading) => {
    // Given: an otherwise complete prompt without one required heading.

    // When: the local reviewer evaluates the prompt.
    const result = reviewPrompt(withoutHeading(completePrompt, heading))

    // Then: the absent heading is recorded as an actionable missing section.
    expect(result.missingSections).toContain(heading)
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        id: `missing-${heading.slice(2).toLowerCase().replaceAll(" ", "-")}`,
      }),
    )
  })

  it("treats an empty heading as missing boilerplate rather than substantive guidance", () => {
    // Given: a prompt whose validation heading has no body.
    const prompt = completePrompt.replace(
      "# Validation\n- npx vitest run tests/prompt-quality.test.ts\n- npm run typecheck",
      "# Validation\n\n# Working Instructions",
    )

    // When: the local reviewer evaluates the prompt.
    const result = reviewPrompt(prompt)

    // Then: the empty heading is surfaced with evidence and a missing-section entry.
    expect(result.missingSections).toContain("# Validation")
    expect(result.issues).toContainEqual(
      expect.objectContaining({ id: "empty-validation", evidence: "# Validation" }),
    )
  })

  it("penalizes boilerplate context and vague acceptance criteria with evidence", () => {
    // Given: a prompt with a template placeholder and non-measurable success language.
    const prompt = completePrompt
      .replace(
        "This Electron app stores prompt assets locally and uses Vitest for focused tests.",
        "TBD",
      )
      .replace(
        "- A complete prompt returns an excellent or good grade with low ambiguity risk.",
        "- Make the outcome appropriate and high quality.",
      )

    // When: the local reviewer evaluates the prompt.
    const result = reviewPrompt(prompt)

    // Then: it names both weaknesses and quotes the vague criterion as evidence.
    expect(result.issues).toContainEqual(expect.objectContaining({ id: "empty-context" }))
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        id: "vague-acceptance-criteria",
        evidence: expect.stringContaining("appropriate"),
      }),
    )
  })

  it.each([
    "알아서",
    "전부",
    "완벽하게",
    "everything",
    "perfectly",
    "as appropriate",
  ])("flags broad instruction language containing %s", (phrase) => {
    // Given: a prompt whose task delegates open-ended decisions to the agent.
    const prompt = completePrompt.replace(
      "- Review compiled prompts using deterministic local heuristics.",
      `- ${phrase} handle the prompt review.`,
    )

    // When: the local reviewer evaluates the prompt.
    const result = reviewPrompt(prompt)

    // Then: it raises ambiguity with the original phrase as evidence.
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        id: "broad-instructions",
        evidence: expect.stringContaining(phrase),
      }),
    )
  })

  it("preserves code fences and diffs in the returned snapshot", () => {
    // Given: a complete prompt containing literal code and diff blocks.
    const prompt = `${completePrompt}

\`\`\`typescript
const quality = reviewLocalPromptQuality(input)
\`\`\`

\`\`\`diff
+ Preserve this literal added line.
- Preserve this literal removed line.
\`\`\``

    // When: the local reviewer evaluates the prompt.
    const result = reviewPrompt(prompt)

    // Then: every literal block remains byte-for-byte present in the snapshot.
    expect(result.snapshot.compiledPrompt).toBe(prompt)
    expect(result.snapshot.compiledPrompt).toContain("```diff\n+ Preserve this literal added line.")
  })

  it("does not mutate compiled prompt, original input, or snapshot values", () => {
    // Given: an immutable snapshot with leading and trailing whitespace in both prompt strings.
    const snapshot = Object.freeze({
      ...baseSnapshot,
      compiledPrompt: `\n  ${completePrompt}\n`,
      originalInput: "\n  Preserve this original request exactly.  \n",
    })
    const input = Object.freeze({ snapshot, createdAt: 1 })

    // When: the local reviewer evaluates the frozen input.
    const result = reviewLocalPromptQuality(input)

    // Then: neither input string nor its enclosing snapshot is changed.
    expect(input.snapshot).toBe(snapshot)
    expect(input.snapshot.compiledPrompt).toBe(`\n  ${completePrompt}\n`)
    expect(input.snapshot.originalInput).toBe("\n  Preserve this original request exactly.  \n")
    expect(result.snapshot).toBe(snapshot)
  })
})
