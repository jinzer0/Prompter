import { z } from "zod"

type ReadonlyDeep<T> = T extends readonly (infer TItem)[]
  ? readonly ReadonlyDeep<TItem>[]
  : T extends object
    ? { readonly [TKey in keyof T]: ReadonlyDeep<T[TKey]> }
    : T

const idSchema = z.string().uuid()
const textSchema = z.string().max(1_000_000)
const displayTextSchema = z.string().trim().min(1).max(1_000)

export const SENSITIVE_FINDING_SEVERITIES = ["low", "medium", "high", "critical"] as const
export const SENSITIVE_FINDING_CATEGORIES = [
  "openai_api_key",
  "github_token",
  "bearer_token",
  "aws_access_key",
  "private_key",
  "environment_secret",
  "url_secret",
  "email_address",
  "phone_number",
  "national_id",
  "internal_url",
  "private_ip",
] as const
export const SENSITIVE_SCAN_SOURCES = [
  "draft",
  "prompt_version",
  "project_context",
  "template",
  "export",
  "backup",
  "library",
] as const

export const sensitiveFindingSeveritySchema = z.enum(SENSITIVE_FINDING_SEVERITIES)
export const sensitiveFindingCategorySchema = z.enum(SENSITIVE_FINDING_CATEGORIES)
export const sensitiveScanSourceSchema = z.enum(SENSITIVE_SCAN_SOURCES)
export const sensitiveFindingConfidenceSchema = z.enum(["low", "medium", "high"])

export const sensitiveFindingLocationSchema = z
  .object({
    entityType: z.string().trim().min(1).max(100),
    entityId: idSchema.optional(),
    field: z.string().trim().min(1).max(100),
    previewLabel: z.string().trim().min(1).max(200).optional(),
  })
  .strict()

export const sensitiveFindingSchema = z
  .object({
    id: z.string().trim().min(1).max(200),
    severity: sensitiveFindingSeveritySchema,
    category: sensitiveFindingCategorySchema,
    label: displayTextSchema,
    description: displayTextSchema,
    location: sensitiveFindingLocationSchema,
    evidenceMasked: displayTextSchema,
    startOffset: z.number().int().nonnegative().optional(),
    endOffset: z.number().int().nonnegative().optional(),
    confidence: sensitiveFindingConfidenceSchema,
    recommendation: displayTextSchema,
  })
  .strict()
  .superRefine((finding, context) => {
    if (
      finding.startOffset !== undefined &&
      finding.endOffset !== undefined &&
      finding.endOffset < finding.startOffset
    ) {
      context.addIssue({
        code: "custom",
        path: ["endOffset"],
        message: "End offset must not precede start offset",
      })
    }
  })

export const sensitiveScanResultSchema = z
  .object({
    scannedAt: z.number().int().nonnegative(),
    source: sensitiveScanSourceSchema,
    findingCount: z.number().int().nonnegative(),
    criticalCount: z.number().int().nonnegative(),
    highCount: z.number().int().nonnegative(),
    mediumCount: z.number().int().nonnegative(),
    lowCount: z.number().int().nonnegative(),
    findings: z.array(sensitiveFindingSchema),
    safeToProceed: z.boolean(),
    warnings: z.array(displayTextSchema),
  })
  .strict()
  .superRefine((result, context) => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 }
    for (const finding of result.findings) {
      counts[finding.severity] += 1
    }

    if (result.findingCount !== result.findings.length) {
      context.addIssue({
        code: "custom",
        path: ["findingCount"],
        message: "Finding counts must match findings",
      })
    }
    if (result.criticalCount !== counts.critical) {
      context.addIssue({
        code: "custom",
        path: ["criticalCount"],
        message: "Finding counts must match findings",
      })
    }
    if (result.highCount !== counts.high) {
      context.addIssue({
        code: "custom",
        path: ["highCount"],
        message: "Finding counts must match findings",
      })
    }
    if (result.mediumCount !== counts.medium) {
      context.addIssue({
        code: "custom",
        path: ["mediumCount"],
        message: "Finding counts must match findings",
      })
    }
    if (result.lowCount !== counts.low) {
      context.addIssue({
        code: "custom",
        path: ["lowCount"],
        message: "Finding counts must match findings",
      })
    }

    if ((counts.critical > 0 || counts.high > 0) && result.safeToProceed) {
      context.addIssue({
        code: "custom",
        path: ["safeToProceed"],
        message: "High and critical findings require confirmation",
      })
    }
  })

export const scanSensitiveTextInputSchema = z
  .object({
    source: sensitiveScanSourceSchema,
    text: textSchema,
    location: sensitiveFindingLocationSchema.optional(),
  })
  .strict()

export const scanDraftPrivacyInputSchema = z
  .object({
    originalInput: textSchema,
    compiledPrompt: textSchema.nullable().optional(),
    projectContext: textSchema.nullable().optional(),
    techStack: textSchema.nullable().optional(),
    constraints: textSchema.nullable().optional(),
    acceptanceCriteria: textSchema.nullable().optional(),
    validationCommands: textSchema.nullable().optional(),
    additionalNotes: textSchema.nullable().optional(),
  })
  .strict()

export const scanLibraryPrivacyInputSchema = z.object({ projectId: idSchema.optional() }).strict()

export const scanExportContentInputSchema = z
  .object({ content: textSchema, format: z.string().trim().min(1).max(100).optional() })
  .strict()

export const privacySettingsSchema = z
  .object({
    warnBeforeLLM: z.boolean().default(true),
    warnBeforeExport: z.boolean().default(true),
    warnBeforeBackup: z.boolean().default(true),
    enableLibraryScan: z.boolean().default(true),
  })
  .strict()

export const updatePrivacySettingsInputSchema = privacySettingsSchema.partial().strict()

export const privacyConfirmationRequiredSchema = z
  .object({
    status: z.literal("confirmation_required"),
    privacyConfirmationSessionId: idSchema,
    scanResult: sensitiveScanResultSchema,
  })
  .strict()

export const privacyConfirmationCancelledSchema = z
  .object({ status: z.literal("cancelled") })
  .strict()

export const privacyConfirmationResultSchema = z.discriminatedUnion("status", [
  privacyConfirmationRequiredSchema,
  privacyConfirmationCancelledSchema,
])

export type SensitiveFinding = ReadonlyDeep<z.output<typeof sensitiveFindingSchema>>
export type SensitiveScanResult = ReadonlyDeep<z.output<typeof sensitiveScanResultSchema>>
export type ScanSensitiveTextInput = ReadonlyDeep<z.input<typeof scanSensitiveTextInputSchema>>
export type ScanDraftPrivacyInput = ReadonlyDeep<z.input<typeof scanDraftPrivacyInputSchema>>
export type ScanLibraryPrivacyInput = ReadonlyDeep<z.input<typeof scanLibraryPrivacyInputSchema>>
export type ScanExportContentInput = ReadonlyDeep<z.input<typeof scanExportContentInputSchema>>
export type PrivacySettings = ReadonlyDeep<z.output<typeof privacySettingsSchema>>
export type UpdatePrivacySettingsInput = ReadonlyDeep<
  z.input<typeof updatePrivacySettingsInputSchema>
>
export type PrivacyConfirmationResult = ReadonlyDeep<
  z.output<typeof privacyConfirmationResultSchema>
>
