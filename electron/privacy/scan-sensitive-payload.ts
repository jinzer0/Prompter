import { backupPayloadFields } from "./backup-payload-fields.js"
import {
  libraryPayloadFields,
  type SensitiveLibraryPayload,
  type SensitivePayloadField,
  textField,
} from "./library-payload-fields.js"
import type {
  ScanDraftPrivacyInput,
  ScanExportContentInput,
  SensitiveFinding,
} from "./privacy-schemas.js"
import {
  buildSensitiveScanResult,
  SENSITIVE_TEXT_SCAN_LIMIT,
  type SensitiveScanSource,
  scanSensitiveText,
} from "./scan-sensitive-text.js"

export type { SensitiveLibraryPayload, SensitivePayloadField }

export type SensitivePayloadScanInput = {
  readonly fields: readonly SensitivePayloadField[]
  readonly source: SensitiveScanSource
}

export function scanSensitivePayload(input: SensitivePayloadScanInput) {
  const findings: SensitiveFinding[] = []
  let truncated = false
  for (const field of input.fields) {
    const text = field.text.slice(0, SENSITIVE_TEXT_SCAN_LIMIT)
    if (text.length !== field.text.length) {
      truncated = true
    }
    findings.push(
      ...scanSensitiveText({ source: input.source, text, location: field.location }).findings,
    )
  }

  const result = buildSensitiveScanResult(
    input.source,
    findings,
    truncated
      ? [
          "One or more fields exceeded the 1 MiB scan limit.",
          "The privacy scan is incomplete and requires confirmation.",
        ]
      : [],
  )
  return truncated ? { ...result, safeToProceed: false } : result
}

export function draftPayloadFields(input: ScanDraftPrivacyInput): readonly SensitivePayloadField[] {
  return [
    ...textField(input.originalInput, {
      entityType: "draft",
      field: "originalInput",
      previewLabel: "Draft original input",
    }),
    ...textField(input.compiledPrompt, {
      entityType: "draft",
      field: "compiledPrompt",
      previewLabel: "Draft compiled prompt",
    }),
    ...textField(input.projectContext, {
      entityType: "draft",
      field: "projectContext",
      previewLabel: "Draft project context",
    }),
    ...textField(input.techStack, {
      entityType: "draft",
      field: "techStack",
      previewLabel: "Draft tech stack",
    }),
    ...textField(input.constraints, {
      entityType: "draft",
      field: "constraints",
      previewLabel: "Draft constraints",
    }),
    ...textField(input.acceptanceCriteria, {
      entityType: "draft",
      field: "acceptanceCriteria",
      previewLabel: "Draft acceptance criteria",
    }),
    ...textField(input.validationCommands, {
      entityType: "draft",
      field: "validationCommands",
      previewLabel: "Draft validation commands",
    }),
    ...textField(input.additionalNotes, {
      entityType: "draft",
      field: "additionalNotes",
      previewLabel: "Draft additional notes",
    }),
  ]
}

export function exportPayloadFields(
  input: ScanExportContentInput,
): readonly SensitivePayloadField[] {
  return textField(input.content, {
    entityType: "export",
    field: "content",
    previewLabel:
      input.format === undefined
        ? "Export content"
        : `${input.format.charAt(0).toUpperCase()}${input.format.slice(1)} export content`,
  })
}

export { backupPayloadFields, libraryPayloadFields }
