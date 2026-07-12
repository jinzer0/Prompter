import { COMPILED_PROMPT_REQUIRED_SECTIONS } from "../ipc-contract.js"

export type RequiredSection = (typeof COMPILED_PROMPT_REQUIRED_SECTIONS)[number]

export type SectionAnalysis = {
  readonly heading: RequiredSection
  readonly text: string | null
  readonly hasContent: boolean
  readonly hasMeaningfulContent: boolean
}

export const requiredSectionDetails = {
  "# Objective": {
    title: "Objective",
    question: "What specific outcome should this prompt achieve?",
  },
  "# Context": {
    title: "Context",
    question: "What project or product context would prevent incorrect assumptions?",
  },
  "# Task": {
    title: "Task",
    question: "What concrete work should the receiving agent perform?",
  },
  "# Scope": {
    title: "Scope",
    question: "Which changes are explicitly in scope and out of scope?",
  },
  "# Constraints": {
    title: "Constraints",
    question: "Which technical, compatibility, or implementation constraints apply?",
  },
  "# Acceptance Criteria": {
    title: "Acceptance Criteria",
    question: "What observable outcomes prove the work is complete?",
  },
  "# Validation": {
    title: "Validation",
    question: "Which focused commands or checks should validate the change?",
  },
  "# Working Instructions": {
    title: "Working Instructions",
    question: "Which working practices or decision boundaries should guide execution?",
  },
  "# Final Response Format": {
    title: "Final Response Format",
    question: "Which final-response fields should the receiving agent provide?",
  },
} as const satisfies Record<RequiredSection, { readonly title: string; readonly question: string }>

const boilerplateSection =
  /^(?:tbd|todo|n\/?a|none|not provided|no additional context provided\.)[.! ]*$/iu

function analyzeSection(prompt: string, heading: RequiredSection): SectionAnalysis {
  const lines = prompt.split(/\r?\n/)
  const body: string[] = []
  let inCodeFence = false
  let hasHeading = false

  for (const line of lines) {
    const trimmedStart = line.trimStart()
    const togglesCodeFence = trimmedStart.startsWith("```") || trimmedStart.startsWith("~~~")

    if (!inCodeFence && line.trimEnd() === heading) {
      hasHeading = true
      continue
    }

    if (hasHeading && !inCodeFence && line.startsWith("# ")) {
      break
    }

    if (hasHeading) {
      body.push(line)
    }

    if (togglesCodeFence) {
      inCodeFence = !inCodeFence
    }
  }

  const text = hasHeading ? body.join("\n") : null
  const trimmed = text?.trim() ?? ""

  return {
    heading,
    text,
    hasContent: trimmed.length > 0,
    hasMeaningfulContent: trimmed.length > 0 && !boilerplateSection.test(trimmed),
  }
}

export function analyzeCompiledPromptSections(prompt: string): readonly SectionAnalysis[] {
  return COMPILED_PROMPT_REQUIRED_SECTIONS.map((heading) => analyzeSection(prompt, heading))
}

export function sectionHasContent(
  sections: readonly SectionAnalysis[],
  heading: RequiredSection,
): boolean {
  return sections.some((section) => section.heading === heading && section.hasContent)
}

export function sectionIsMeaningful(
  sections: readonly SectionAnalysis[],
  heading: RequiredSection,
): boolean {
  return sections.some((section) => section.heading === heading && section.hasMeaningfulContent)
}

export function sectionText(
  sections: readonly SectionAnalysis[],
  heading: RequiredSection,
): string {
  return sections.find((section) => section.heading === heading)?.text ?? ""
}
