export type PromptVersionLineDiffKind = "added" | "changed" | "removed" | "unchanged"

export type PromptVersionLineDiff = {
  readonly kind: PromptVersionLineDiffKind
  readonly baseLineNumber: number | null
  readonly compareLineNumber: number | null
  readonly baseText: string | null
  readonly compareText: string | null
}

export type PromptVersionDiffInput = {
  readonly baseText: string
  readonly compareText: string
}

export type PromptVersionMetadataSource = {
  readonly assumptions: string | null
  readonly questions: string | null
  readonly answers: string | null
  readonly acceptanceCriteria: string | null
  readonly validationCommands: string | null
  readonly qualityScore: number | null
}

export type PromptVersionMetadata = {
  readonly assumptions: readonly string[]
  readonly questions: readonly string[]
  readonly answers: readonly string[]
  readonly acceptanceCriteria: readonly string[]
  readonly validationCommands: readonly string[]
  readonly qualityScore: number | null
}

function promptLines(value: string): readonly string[] {
  return value.length === 0 ? [] : value.split("\n")
}

export function buildPromptVersionLineDiff({
  baseText,
  compareText,
}: PromptVersionDiffInput): readonly PromptVersionLineDiff[] {
  const baseLines = promptLines(baseText)
  const compareLines = promptLines(compareText)
  const lineCount = Math.max(baseLines.length, compareLines.length)
  const diff: PromptVersionLineDiff[] = []

  for (let index = 0; index < lineCount; index += 1) {
    const baseLine = baseLines[index]
    const compareLine = compareLines[index]

    if (baseLine === undefined && compareLine !== undefined) {
      diff.push({
        kind: "added",
        baseLineNumber: null,
        compareLineNumber: index + 1,
        baseText: null,
        compareText: compareLine,
      })
    } else if (baseLine !== undefined && compareLine === undefined) {
      diff.push({
        kind: "removed",
        baseLineNumber: index + 1,
        compareLineNumber: null,
        baseText: baseLine,
        compareText: null,
      })
    } else if (baseLine !== undefined && compareLine !== undefined) {
      diff.push({
        kind: baseLine === compareLine ? "unchanged" : "changed",
        baseLineNumber: index + 1,
        compareLineNumber: index + 1,
        baseText: baseLine,
        compareText: compareLine,
      })
    }
  }

  return diff
}

function parseJson(text: string): unknown | null {
  try {
    return JSON.parse(text)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return null
    }

    throw error
  }
}

function objectValue(value: unknown): object | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null
}

function stringField(record: object, fieldName: string): string | null {
  const entry = Object.entries(record).find(([key]) => key === fieldName)
  const value = entry?.[1]

  return typeof value === "string" ? value : null
}

function metadataText(value: unknown): string | null {
  if (typeof value === "string") {
    return value.trim().length > 0 ? value : null
  }

  const record = objectValue(value)

  if (record === null) {
    return null
  }

  const question = stringField(record, "question")
  const answer = stringField(record, "answer")

  if (question !== null && answer !== null) {
    return `${question}: ${answer}`
  }
  if (question !== null) {
    return question
  }
  if (answer !== null) {
    return answer
  }

  return null
}

function jsonArrayText(value: string | null): readonly string[] {
  if (value === null || value.trim().length === 0) {
    return []
  }

  const parsed = parseJson(value)

  if (!Array.isArray(parsed)) {
    return []
  }

  return parsed.flatMap((item) => {
    const text = metadataText(item)
    return text === null ? [] : [text]
  })
}

function jsonArrayOrLines(value: string | null): readonly string[] {
  if (value === null || value.trim().length === 0) {
    return []
  }

  const parsed = parseJson(value)

  if (Array.isArray(parsed)) {
    return parsed.flatMap((item) => {
      const text = metadataText(item)
      return text === null ? [] : [text]
    })
  }

  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

export function parsePromptVersionMetadata(
  version: PromptVersionMetadataSource,
): PromptVersionMetadata {
  return {
    assumptions: jsonArrayText(version.assumptions),
    questions: jsonArrayText(version.questions),
    answers: jsonArrayText(version.answers),
    acceptanceCriteria: jsonArrayOrLines(version.acceptanceCriteria),
    validationCommands: jsonArrayOrLines(version.validationCommands),
    qualityScore: version.qualityScore,
  }
}
