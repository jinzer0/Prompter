const fallbackTitle = "Untitled prompt"
const titleLimit = 60

export function nonEmptyLines(value: string | undefined): readonly string[] {
  return (value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

export function paragraph(value: string | undefined, fallback: string): string {
  const lines = nonEmptyLines(value)
  return lines.length === 0 ? fallback : lines.join("\n")
}

export function bulletList(items: readonly string[]): string {
  return items.map((item) => `* ${item}`).join("\n")
}

export function titleFromInput(title: string | undefined, originalInput: string): string {
  const explicitTitle = title?.trim()

  if (explicitTitle !== undefined && explicitTitle.length > 0) {
    return explicitTitle
  }

  const [firstLine] = nonEmptyLines(originalInput)
  const baseTitle = firstLine ?? fallbackTitle

  if (baseTitle.length <= titleLimit) {
    return baseTitle
  }

  return `${baseTitle.slice(0, titleLimit - 3).trimEnd()}...`
}
