import { z } from "zod"

import { APP_LOCK_SCRYPT_PARAMETERS } from "./app-lock-crypto.js"

export const APP_LOCK_METADATA_SETTING_KEY = "app_lock_metadata" as const
export const APP_LOCK_METADATA_VERSION = 2 as const

const timestampSchema = z.number().int().nonnegative()
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

export const appLockMetadataSchema = z
  .object({
    version: z.literal(APP_LOCK_METADATA_VERSION),
    enabled: z.literal(true),
    kdf: z.literal("scrypt"),
    kdfParameters: z
      .object({
        cost: z.literal(APP_LOCK_SCRYPT_PARAMETERS.cost),
        blockSize: z.literal(APP_LOCK_SCRYPT_PARAMETERS.blockSize),
        parallelization: z.literal(APP_LOCK_SCRYPT_PARAMETERS.parallelization),
        keyLength: z.literal(APP_LOCK_SCRYPT_PARAMETERS.keyLength),
        maxMemory: z.literal(APP_LOCK_SCRYPT_PARAMETERS.maxMemory),
      })
      .strict(),
    salt: canonicalBase64BytesSchema(16),
    hash: canonicalBase64BytesSchema(64),
    lockOnStart: z.boolean(),
    timeoutMinutes: z.number().int().min(1).max(240),
    requireForExport: z.boolean(),
    requireForBackup: z.boolean(),
    requireForLlm: z.boolean(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()

export type AppLockMetadata = z.infer<typeof appLockMetadataSchema>

export type AppLockMetadataLoadResult =
  | { readonly kind: "absent" }
  | { readonly kind: "invalid" }
  | { readonly kind: "valid"; readonly metadata: AppLockMetadata }

export function parseAppLockMetadata(value: string | null): AppLockMetadataLoadResult {
  if (value === null) {
    return { kind: "absent" }
  }

  try {
    const parsed = appLockMetadataSchema.safeParse(JSON.parse(value))
    return parsed.success ? { kind: "valid", metadata: parsed.data } : { kind: "invalid" }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { kind: "invalid" }
    }
    throw error
  }
}
