import type { ExportPromptInput } from "./ipc-types.js"

function trimOrNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

function slugifyTitle(title: string): string {
  const normalized = title.normalize("NFKD").toLowerCase()
  const slug = normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  return slug.length === 0 ? "prompt" : slug
}

function joinBullets(lines: readonly string[]): string {
  return lines.map((line) => `- ${line}`).join("\n")
}

function sectionBlock(title: string, body: string): string {
  return `${title}\n${body}`
}

function attributionSection(): string {
  return sectionBlock("## Attribution", "Generated with Prompter.")
}

function skillName(input: ExportPromptInput): string {
  const tagName = input.tags?.[0]?.name
  return slugifyTitle(trimOrNull(input.title) ?? tagName ?? "generated-skill")
}

export function buildAgentsMdSnippet(input: ExportPromptInput): string {
  return [
    "# Prompter Agent Instructions",
    sectionBlock(
      "## Project Context",
      `Work in ${input.projectName ?? "this project"} on ${input.scenario} prompts for ${input.targetAgent}.`,
    ),
    sectionBlock(
      "## General Working Rules",
      joinBullets([
        "Inspect relevant files before editing.",
        "Keep changes small and reviewable.",
        "Preserve existing architecture boundaries.",
        "Do not introduce unrelated refactors.",
        "Include validation results in the final response.",
      ]),
    ),
    sectionBlock(
      "## Prompt Workflow Rules",
      joinBullets([
        "Treat original input, assumptions, clarification, acceptance criteria, and validation commands as the prompt source of truth.",
        "Keep generated prompts reusable when they are intended for project-level guidance.",
      ]),
    ),
    sectionBlock(
      "## Out of Scope",
      joinBullets([
        "Do not store prompt execution results.",
        "Do not add agent run history unless explicitly requested.",
      ]),
    ),
    attributionSection(),
  ].join("\n\n")
}

export function buildSkillMdDraft(input: ExportPromptInput): string {
  const name = skillName(input)
  const description = `Use this skill when working on reusable ${input.scenario} prompt workflows.`
  const frontmatter = ["---", `name: ${name}`, `description: ${description}`, "---"].join("\n")

  return [
    frontmatter,
    "# Skill Purpose",
    `Help agents turn ${input.scenario} prompt work into repeatable, validated changes.`,
    "# When to Use",
    joinBullets([
      `Use for ${input.scenario} tasks related to ${trimOrNull(input.title) ?? "this prompt"}.`,
      "Use when the workflow can be repeated across similar prompts.",
    ]),
    "# Inputs",
    joinBullets([
      "Original user request",
      "Relevant project context",
      "Acceptance criteria",
      "Validation commands",
    ]),
    "# Workflow",
    joinBullets([
      "Inspect context first.",
      "State assumptions before acting.",
      "Apply the smallest scoped change.",
      "Validate the result through the requested checks.",
    ]),
    "# Output Format",
    joinBullets(["Summary of changes", "Files changed", "Validation results", "Open risks"]),
    "# Validation",
    joinBullets(input.validationCommands ?? ["Run the narrowest relevant verification command."]),
    "# Constraints",
    joinBullets([
      "Do not copy one-off prompt text verbatim into the skill body.",
      "Do not store prompt execution results.",
    ]),
    "# Attribution",
    "Generated with Prompter.",
  ].join("\n\n")
}
