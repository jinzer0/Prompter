import type {
  PrivacyBridge,
  ScanDraftPrivacyInput,
  SensitiveFinding,
  SensitiveScanResult,
} from "../../../../electron/ipc-types"
import type { ClarificationAnswersById } from "./llm-compiler-flow"
import type { PromptCompilerInput } from "./types"

export type CompilerDraftPrivacyContent = {
  readonly answers: ClarificationAnswersById
  readonly draft: PromptCompilerInput
  readonly editablePrompt: string
  readonly includedProjectContext: string | null
  readonly selectedHarnessTemplate: string | null
  readonly selectedPromptTemplate: string | null
}

type CompilerPrivacyBridge = Pick<PrivacyBridge, "scanDraft" | "scanText">

type AdditionalPrivacyField = {
  readonly field: string
  readonly previewLabel: string
  readonly text: string
}

function draftScanInput(content: CompilerDraftPrivacyContent): ScanDraftPrivacyInput {
  return {
    originalInput: content.draft.originalInput,
    compiledPrompt: content.editablePrompt,
    projectContext: content.draft.projectContext ?? null,
    techStack: content.draft.techStack ?? null,
    constraints: content.draft.constraints ?? null,
    acceptanceCriteria: content.draft.acceptanceCriteria ?? null,
    validationCommands: content.draft.validationCommands ?? null,
    additionalNotes: content.draft.additionalNotes ?? null,
  }
}

function additionalPrivacyFields(
  content: CompilerDraftPrivacyContent,
): readonly AdditionalPrivacyField[] {
  const candidates = [
    {
      field: "projectContextProfile",
      previewLabel: "Included project context profile",
      text: content.includedProjectContext,
    },
    {
      field: "harnessTemplate",
      previewLabel: "Selected harness template",
      text: content.selectedHarnessTemplate,
    },
    {
      field: "promptTemplate",
      previewLabel: "Selected prompt template",
      text: content.selectedPromptTemplate,
    },
  ]
  const fields: AdditionalPrivacyField[] = []
  for (const candidate of candidates) {
    if (candidate.text !== null) fields.push({ ...candidate, text: candidate.text })
  }
  for (const [questionId, answer] of Object.entries(content.answers)) {
    fields.push({
      field: `clarificationAnswer:${questionId}`,
      previewLabel: "Clarification answer",
      text: answer,
    })
  }
  return fields
}

function mergedScanResult(results: readonly SensitiveScanResult[]): SensitiveScanResult {
  const findings = results.flatMap((result) => result.findings)
  const count = (severity: SensitiveFinding["severity"]): number =>
    findings.filter((finding) => finding.severity === severity).length

  return {
    scannedAt: Math.max(...results.map((result) => result.scannedAt)),
    source: "draft",
    findingCount: findings.length,
    criticalCount: count("critical"),
    highCount: count("high"),
    mediumCount: count("medium"),
    lowCount: count("low"),
    findings,
    safeToProceed: results.every((result) => result.safeToProceed),
    warnings: results.flatMap((result) => result.warnings),
  }
}

export async function scanCompilerDraftPrivacy(
  bridge: CompilerPrivacyBridge,
  content: CompilerDraftPrivacyContent,
): Promise<SensitiveScanResult> {
  const additionalScans = additionalPrivacyFields(content).map((field) =>
    bridge.scanText({
      source: "draft",
      text: field.text,
      location: {
        entityType: "draft",
        field: field.field,
        previewLabel: field.previewLabel,
      },
    }),
  )
  const results = await Promise.all([bridge.scanDraft(draftScanInput(content)), ...additionalScans])
  return mergedScanResult(results)
}
