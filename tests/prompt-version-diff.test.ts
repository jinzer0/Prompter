import { describe, expect, it } from "vitest"

type PromptVersionLineDiff = {
  readonly kind: "added" | "changed" | "removed" | "unchanged"
  readonly baseLineNumber: number | null
  readonly compareLineNumber: number | null
  readonly baseText: string | null
  readonly compareText: string | null
}

type PromptVersionDiffInput = {
  readonly baseText: string
  readonly compareText: string
}

type PromptVersionMetadataSource = {
  readonly assumptions: string | null
  readonly questions: string | null
  readonly answers: string | null
  readonly acceptanceCriteria: string | null
  readonly validationCommands: string | null
  readonly qualityScore: number | null
}

type PromptVersionMetadata = {
  readonly assumptions: readonly string[]
  readonly questions: readonly string[]
  readonly answers: readonly string[]
  readonly acceptanceCriteria: readonly string[]
  readonly validationCommands: readonly string[]
  readonly qualityScore: number | null
}

type PromptVersionDiffHelpers = {
  readonly buildPromptVersionLineDiff: (
    input: PromptVersionDiffInput,
  ) => readonly PromptVersionLineDiff[]
  readonly parsePromptVersionMetadata: (
    version: PromptVersionMetadataSource,
  ) => PromptVersionMetadata
}

const promptVersionDiffHelperPath = "../renderer/src/lib/prompt-version-diff"

function hasFunctionProperty(value: object, propertyName: string): boolean {
  return typeof Reflect.get(value, propertyName) === "function"
}

function isPromptVersionDiffHelpers(value: unknown): value is PromptVersionDiffHelpers {
  return (
    typeof value === "object" &&
    value !== null &&
    hasFunctionProperty(value, "buildPromptVersionLineDiff") &&
    hasFunctionProperty(value, "parsePromptVersionMetadata")
  )
}

async function loadPromptVersionDiffHelpers(): Promise<PromptVersionDiffHelpers> {
  const loadedModule: unknown = await import(promptVersionDiffHelperPath)

  if (!isPromptVersionDiffHelpers(loadedModule)) {
    throw new TypeError("Prompt version diff helpers are not exported")
  }

  return loadedModule
}

describe("prompt version diff helpers", () => {
  it("builds a line diff that can render unchanged, changed, and added prompt lines", async () => {
    const { buildPromptVersionLineDiff } = await loadPromptVersionDiffHelpers()
    const baseText = ["# Objective", "Ship the original prompt.", "# Acceptance Criteria"].join(
      "\n",
    )
    const compareText = [
      "# Objective",
      "Ship the revised prompt.",
      "# Acceptance Criteria",
      "Run targeted Phase 6 tests.",
    ].join("\n")

    const diff = buildPromptVersionLineDiff({ baseText, compareText })

    expect(diff).toEqual([
      {
        kind: "unchanged",
        baseLineNumber: 1,
        compareLineNumber: 1,
        baseText: "# Objective",
        compareText: "# Objective",
      },
      {
        kind: "changed",
        baseLineNumber: 2,
        compareLineNumber: 2,
        baseText: "Ship the original prompt.",
        compareText: "Ship the revised prompt.",
      },
      {
        kind: "unchanged",
        baseLineNumber: 3,
        compareLineNumber: 3,
        baseText: "# Acceptance Criteria",
        compareText: "# Acceptance Criteria",
      },
      {
        kind: "added",
        baseLineNumber: null,
        compareLineNumber: 4,
        baseText: null,
        compareText: "Run targeted Phase 6 tests.",
      },
    ])
  })

  it("falls back to empty metadata arrays when persisted version metadata is malformed", async () => {
    const { parsePromptVersionMetadata } = await loadPromptVersionDiffHelpers()
    const version = {
      assumptions: "not-json",
      questions: "{malformed",
      answers: "{}",
      acceptanceCriteria: "Smoke test fails red.\nPrompt count stays 1.",
      validationCommands: "npm run test:smoke",
      qualityScore: null,
    }

    const metadata = parsePromptVersionMetadata(version)

    expect(metadata).toEqual({
      assumptions: [],
      questions: [],
      answers: [],
      acceptanceCriteria: ["Smoke test fails red.", "Prompt count stays 1."],
      validationCommands: ["npm run test:smoke"],
      qualityScore: null,
    })
  })
})
