import type {
  BackupExportResult,
  BackupImportResult,
  BackupPrivacyConfirmationRequired,
  BackupValidationPreview,
  PreparedEncryptedBackupPreview,
  SavePreparedEncryptedBackupResult,
  ValidateEncryptedBackupResult,
} from "../../../electron/ipc-types"

export type BackupFailureKind = "export" | "validation" | "import" | "cancel"

type ReadonlyDeep<T> = T extends readonly (infer TItem)[]
  ? readonly ReadonlyDeep<TItem>[]
  : T extends object
    ? { readonly [TKey in keyof T]: ReadonlyDeep<T[TKey]> }
    : T

export type BackupValidationView = ReadonlyDeep<BackupValidationPreview>
export type BackupConfirmation = ReadonlyDeep<BackupPrivacyConfirmationRequired>

export type BackupOperation =
  | "plaintext_export"
  | "plaintext_save"
  | "encrypted_prepare"
  | "encrypted_save"
  | "plaintext_validation"
  | "encrypted_validation"
  | "encrypted_unlock"
  | "import"
  | "cancel"

export type BackupState =
  | { readonly kind: "idle" }
  | { readonly kind: "working"; readonly operation: BackupOperation; readonly message: string }
  | {
      readonly kind: "plaintext_confirmation"
      readonly confirmation: BackupConfirmation
      readonly message: string
    }
  | {
      readonly kind: "encrypted_export"
      readonly preview: PreparedEncryptedBackupPreview
      readonly confirmation: BackupConfirmation | null
      readonly message: string
    }
  | {
      readonly kind: "encrypted_import"
      readonly locked: Extract<
        ValidateEncryptedBackupResult,
        { readonly status: "passphrase_required" }
      >
      readonly error: string | null
      readonly message: string
    }
  | { readonly kind: "preview"; readonly preview: BackupValidationView; readonly message: string }
  | {
      readonly kind: "exported"
      readonly result: BackupExportResult | SavePreparedEncryptedBackupResult
      readonly message: string
    }
  | { readonly kind: "success"; readonly result: BackupImportResult; readonly message: string }
  | {
      readonly kind: "import_failure"
      readonly preview: BackupValidationView
      readonly message: string
    }
  | {
      readonly kind: "failure"
      readonly failureKind: Exclude<BackupFailureKind, "import">
      readonly message: string
    }
  | { readonly kind: "cancelled"; readonly message: string }

export function backupPreview(state: BackupState): BackupValidationView | null {
  switch (state.kind) {
    case "preview":
    case "import_failure":
      return state.preview
    case "idle":
    case "working":
    case "plaintext_confirmation":
    case "encrypted_export":
    case "encrypted_import":
    case "exported":
    case "success":
    case "failure":
    case "cancelled":
      return null
    default:
      return assertNever(state)
  }
}

export function backupMessage(state: BackupState): string | null {
  return state.kind === "idle" ? null : state.message
}

export function backupExportResult(
  state: BackupState,
): BackupExportResult | SavePreparedEncryptedBackupResult | null {
  return state.kind === "exported" ? state.result : null
}

export function backupImportResult(state: BackupState): BackupImportResult | null {
  return state.kind === "success" ? state.result : null
}

export function assertNever(value: never): never {
  throw new TypeError(`Unexpected backup state: ${JSON.stringify(value)}`)
}
