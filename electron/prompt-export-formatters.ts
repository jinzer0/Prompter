import { exportFormatLabels, exportPromptResultSchema } from "./ipc-contract.js"
import type { ExportFormat, ExportPromptInput, ExportPromptResult } from "./ipc-types.js"
import { buildAgentsMdSnippet, buildSkillMdDraft } from "./prompt-export-drafts.js"

type StandardExportFormat = Extract<
  ExportFormat,
  "markdown" | "codex" | "claude_code" | "cursor" | "generic_agent"
>

type AgentInstructions = {
  readonly heading: string
  readonly lines: readonly string[]
}

function assertNever(value: never): never {
  throw new Error(`Unexpected export format: ${String(value)}`)
}

function trimOrNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

function slugifyTitle(title: string): string {
  const normalized = title.normalize("NFKD").toLowerCase()
  const slug = normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  return slug.length === 0 ? "prompt" : slug
}

function formatTimestamp(timestamp: number | null | undefined): string | null {
  return timestamp === null || timestamp === undefined ? null : String(timestamp)
}

function buildFilenameBase(input: ExportPromptInput): string {
  const title = trimOrNull(input.title)

  return title === null ? `prompt-${input.createdAt ?? input.updatedAt ?? 0}` : slugifyTitle(title)
}

function joinBullets(lines: readonly string[]): string {
  return lines.map((line) => `- ${line}`).join("\n")
}

function sectionBlock(title: string, body: string): string {
  return `${title}\n${body}`
}

function optionalBullet(label: string, value: string | null | undefined): string | null {
  const trimmed = trimOrNull(value ?? "")
  return trimmed === null ? null : `- ${label}: ${trimmed}`
}

function numberBullet(label: string, value: number | null | undefined): string | null {
  return value === null || value === undefined ? null : `- ${label}: ${value}`
}

function metadataLines(input: ExportPromptInput): readonly string[] {
  return [
    `- Format: ${exportFormatLabels[input.format]}`,
    `- Scenario: ${input.scenario}`,
    `- Target agent: ${input.targetAgent}`,
    optionalBullet("Title", trimOrNull(input.title)),
    optionalBullet("Project", input.projectName),
    optionalBullet("Prompt asset ID", input.promptAssetId),
    `- Prompt version ID: ${input.promptVersionId}`,
    numberBullet("Quality score (compiler/saved summary)", input.qualityScore),
    optionalBullet("Created at", formatTimestamp(input.createdAt)),
    optionalBullet("Updated at", formatTimestamp(input.updatedAt)),
    input.tags === undefined ? null : `- Tags: ${input.tags.map((tag) => tag.name).join(", ")}`,
  ].filter((line): line is string => line !== null)
}

function metadataSection(input: ExportPromptInput): string {
  return sectionBlock("## Metadata", metadataLines(input).join("\n"))
}

function attributionSection(): string {
  return sectionBlock("## Attribution", "Generated with Prompter.")
}

function listSection(title: string, items: readonly string[] | undefined): string | null {
  if (items === undefined || items.length === 0) {
    return null
  }

  return sectionBlock(title, joinBullets(items))
}

function agentInstructionsFor(format: StandardExportFormat): AgentInstructions {
  switch (format) {
    case "markdown":
      return {
        heading: "## Agent Instructions",
        lines: [
          "Use this Markdown export as the readable source of truth.",
          "Preserve the metadata, context, and compiled prompt sections in order.",
        ],
      }
    case "codex":
      return {
        heading: "## Agent Instructions",
        lines: [
          "Before editing, inspect the repository structure and relevant files.",
          "Write a concise plan before making changes.",
          "Prefer small, reviewable changes aligned with the existing codebase.",
          "Include tests, type checks, and build results in the final response.",
          "Do not perform unrelated refactors.",
          "Do not store prompt execution results.",
        ],
      }
    case "claude_code":
      return {
        heading: "## Agent Instructions",
        lines: [
          "Write a concise plan before starting.",
          "Separate assumptions, plan, changed files, and verification results.",
          "Preserve the existing architecture boundaries.",
          "If something is uncertain, state it instead of inventing behavior.",
        ],
      }
    case "cursor":
      return {
        heading: "## Agent Instructions",
        lines: [
          "Identify candidate files before editing.",
          "Follow nearby code style and naming conventions.",
          "Keep the task concrete so work can begin immediately after paste.",
          "Do not perform a large rewrite.",
        ],
      }
    case "generic_agent":
      return {
        heading: "## Agent Instructions",
        lines: [
          "Confirm the context before acting.",
          "Write a short plan, keep the scope fixed, and return validation steps.",
          "Avoid tool-specific commands or agent-specific terminology.",
        ],
      }
    default:
      return assertNever(format)
  }
}

function buildStandardContent(input: ExportPromptInput, format: StandardExportFormat): string {
  const agentInstructions = agentInstructionsFor(format)
  const title = `# ${trimOrNull(input.title) ?? `Prompt export ${input.promptVersionId}`}`
  const clarificationSection =
    input.questions === undefined && input.answers === undefined
      ? null
      : sectionBlock(
          "## Clarification",
          [
            ...(input.questions ?? []).map(
              (question) =>
                `- Question: ${question.question}\n  Why it matters: ${question.whyItMatters}`,
            ),
            ...(input.answers ?? []).map(
              (answer) => `- Answer: ${answer.question}: ${answer.answer}`,
            ),
          ].join("\n"),
        )
  const detailSections = [
    metadataSection(input),
    sectionBlock("## Original Input", input.originalInput),
    listSection("## Assumptions", input.assumptions),
    clarificationSection,
    listSection("## Acceptance Criteria", input.acceptanceCriteria),
    listSection("## Validation Commands", input.validationCommands),
  ].filter((section): section is string => section !== null)

  if (format !== "markdown") {
    return [
      title,
      sectionBlock(agentInstructions.heading, joinBullets(agentInstructions.lines)),
      sectionBlock("## Compiled Prompt", input.compiledPrompt),
      attributionSection(),
      ...detailSections,
    ].join("\n\n")
  }

  const sections = [
    title,
    ...detailSections,
    sectionBlock(agentInstructions.heading, joinBullets(agentInstructions.lines)),
    sectionBlock("## Compiled Prompt", input.compiledPrompt),
    attributionSection(),
  ].filter((section): section is string => section !== null)

  return sections.join("\n\n")
}

export function formatPromptExport(input: ExportPromptInput): ExportPromptResult {
  const filenameBase = buildFilenameBase(input)

  switch (input.format) {
    case "markdown":
      return exportPromptResultSchema.parse({
        format: input.format,
        filename: `${filenameBase}.md`,
        content: buildStandardContent(input, input.format),
        mimeType: "text/markdown",
      })
    case "codex":
      return exportPromptResultSchema.parse({
        format: input.format,
        filename: `${filenameBase}.codex.md`,
        content: buildStandardContent(input, input.format),
        mimeType: "text/markdown",
      })
    case "claude_code":
      return exportPromptResultSchema.parse({
        format: input.format,
        filename: `${filenameBase}.claude.md`,
        content: buildStandardContent(input, input.format),
        mimeType: "text/markdown",
      })
    case "cursor":
      return exportPromptResultSchema.parse({
        format: input.format,
        filename: `${filenameBase}.cursor.md`,
        content: buildStandardContent(input, input.format),
        mimeType: "text/markdown",
      })
    case "generic_agent":
      return exportPromptResultSchema.parse({
        format: input.format,
        filename: `${filenameBase}.agent.md`,
        content: buildStandardContent(input, input.format),
        mimeType: "text/markdown",
      })
    case "agents_md":
      return exportPromptResultSchema.parse({
        format: input.format,
        filename: "AGENTS.snippet.md",
        content: buildAgentsMdSnippet(input),
        mimeType: "text/markdown",
      })
    case "skill_md":
      return exportPromptResultSchema.parse({
        format: input.format,
        filename: "SKILL.md",
        content: buildSkillMdDraft(input),
        mimeType: "text/markdown",
      })
    default:
      return assertNever(input.format)
  }
}
