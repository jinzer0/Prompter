import { z } from "zod"

import { sensitiveScanResultSchema } from "../privacy/privacy-schemas.js"

type ReadonlyDeep<T> = T extends readonly (infer TItem)[]
  ? readonly ReadonlyDeep<TItem>[]
  : T extends object
    ? { readonly [TKey in keyof T]: ReadonlyDeep<T[TKey]> }
    : T

const idSchema = z.string().uuid()
const passphraseSchema = z.string().min(1).max(1_024)
const messageSchema = z.string().trim().min(1).max(1_000)
const canonicalBase64Schema = z
  .string()
  .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/][AQgw]==|[A-Za-z0-9+/]{2}[AEIMQUYcgkosw048]=)?$/)
  .min(1)

function canonicalBase64BytesSchema(byteLength: number) {
  const encodedLength = 4 * Math.ceil(byteLength / 3)
  const paddingLength = (3 - (byteLength % 3)) % 3
  return canonicalBase64Schema.refine(
    (value) =>
      value.length === encodedLength && (value.match(/=*$/)?.[0].length ?? 0) === paddingLength,
    `Expected ${byteLength} bytes of base64 data`,
  )
}

const encryptedBackupItemCountsSchema = z
  .object({
    projects: z.number().int().nonnegative(),
    promptAssets: z.number().int().nonnegative(),
    promptVersions: z.number().int().nonnegative(),
    tags: z.number().int().nonnegative(),
    promptTags: z.number().int().nonnegative(),
    harnessTemplates: z.number().int().nonnegative(),
    projectContextProfiles: z.number().int().nonnegative(),
    promptTemplates: z.number().int().nonnegative(),
    promptQualityReviews: z.number().int().nonnegative(),
  })
  .strict()

export const ENCRYPTED_BACKUP_EXTENSION = ".prompter-backup.enc"
export const ENCRYPTED_BACKUP_TYPES = ["full", "project"] as const

export const encryptedBackupTypeSchema = z.enum(ENCRYPTED_BACKUP_TYPES)
export const encryptionMetadataSchema = z
  .object({
    algorithm: z.literal("aes-256-gcm"),
    kdf: z.literal("scrypt"),
    cost: z.literal(16_384),
    blockSize: z.literal(8),
    parallelization: z.literal(1),
    keyLength: z.literal(32),
    salt: canonicalBase64BytesSchema(16),
    iv: canonicalBase64BytesSchema(12),
    authTag: canonicalBase64BytesSchema(16),
  })
  .strict()

export const encryptedBackupMetadataSchema = z
  .object({
    backupType: encryptedBackupTypeSchema,
    excludesSecrets: z.literal(true),
    itemCounts: encryptedBackupItemCountsSchema,
  })
  .strict()

export const encryptedBackupEnvelopeSchema = z
  .object({
    schemaVersion: z.literal(1),
    appName: z.literal("Prompter"),
    encrypted: z.literal(true),
    encryption: encryptionMetadataSchema,
    ciphertext: canonicalBase64Schema,
    exportedAt: z.number().int().nonnegative(),
    metadata: encryptedBackupMetadataSchema,
  })
  .strict()

const prepareFullEncryptedBackupInputSchema = z.object({ backupType: z.literal("full") }).strict()
const prepareProjectEncryptedBackupInputSchema = z
  .object({ backupType: z.literal("project"), projectId: idSchema })
  .strict()

export const prepareEncryptedBackupInputSchema = z.discriminatedUnion("backupType", [
  prepareFullEncryptedBackupInputSchema,
  prepareProjectEncryptedBackupInputSchema,
])

export const preparedEncryptedBackupPreviewSchema = z
  .object({
    preparedBackupSessionId: idSchema,
    backupType: encryptedBackupTypeSchema,
    privacyScan: sensitiveScanResultSchema,
  })
  .strict()

export const savePreparedEncryptedBackupInputSchema = z
  .object({
    preparedBackupSessionId: idSchema,
    passphrase: passphraseSchema,
    privacyConfirmationSessionId: idSchema.optional(),
  })
  .strict()

export const savePreparedEncryptedBackupResultSchema = z
  .object({
    cancelled: z.boolean(),
    backupType: encryptedBackupTypeSchema,
    message: messageSchema,
  })
  .strict()

export const exportEncryptedBackupInputSchema = z.discriminatedUnion("backupType", [
  prepareFullEncryptedBackupInputSchema.extend({
    passphrase: passphraseSchema,
    privacyConfirmationSessionId: idSchema.optional(),
  }),
  prepareProjectEncryptedBackupInputSchema.extend({
    passphrase: passphraseSchema,
    privacyConfirmationSessionId: idSchema.optional(),
  }),
])

export const validateEncryptedBackupFileInputSchema = z.undefined()
export const validateEncryptedBackupResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("cancelled") }).strict(),
  z
    .object({
      status: z.literal("passphrase_required"),
      encryptedImportSessionId: idSchema,
      backupType: encryptedBackupTypeSchema,
      exportedAt: z.number().int().nonnegative(),
    })
    .strict(),
])

export const unlockEncryptedBackupInputSchema = z
  .object({ encryptedImportSessionId: idSchema, passphrase: passphraseSchema })
  .strict()

export const encryptedBackupUnlockInvalidPassphraseSchema = z
  .object({ status: z.literal("invalid_passphrase"), message: messageSchema })
  .strict()

export function createEncryptedBackupUnlockValidationResultSchema<TPreview extends z.ZodType>(
  previewSchema: TPreview,
) {
  return z.discriminatedUnion("status", [
    encryptedBackupUnlockInvalidPassphraseSchema,
    z.object({ status: z.literal("ready"), preview: previewSchema }).strict(),
  ])
}

export type EncryptedBackupEnvelope = ReadonlyDeep<z.output<typeof encryptedBackupEnvelopeSchema>>
export type PrepareEncryptedBackupInput = ReadonlyDeep<
  z.input<typeof prepareEncryptedBackupInputSchema>
>
export type PreparedEncryptedBackupPreview = ReadonlyDeep<
  z.output<typeof preparedEncryptedBackupPreviewSchema>
>
export type SavePreparedEncryptedBackupInput = ReadonlyDeep<
  z.input<typeof savePreparedEncryptedBackupInputSchema>
>
export type SavePreparedEncryptedBackupResult = ReadonlyDeep<
  z.output<typeof savePreparedEncryptedBackupResultSchema>
>
export type ValidateEncryptedBackupResult = ReadonlyDeep<
  z.output<typeof validateEncryptedBackupResultSchema>
>
export type UnlockEncryptedBackupInput = ReadonlyDeep<
  z.input<typeof unlockEncryptedBackupInputSchema>
>
