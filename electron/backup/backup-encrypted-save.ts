import type { BackupEnvelope, BackupType, SavePreparedEncryptedBackupResult } from "../ipc-types.js"
import type { BackupNativeService } from "./backup-native-service.js"
import type { createEncryptedBackupCrypto } from "./encrypted-backup-crypto.js"
import {
  ENCRYPTED_BACKUP_EXTENSION,
  type EncryptedBackupEnvelope,
  savePreparedEncryptedBackupResultSchema,
} from "./encrypted-backup-schemas.js"

const encryptedDefaultFilenames = {
  full: `prompter-library${ENCRYPTED_BACKUP_EXTENSION}`,
  project: `prompter-project${ENCRYPTED_BACKUP_EXTENSION}`,
} as const

type SavePreparedEncryptedBackupInput = {
  readonly backupEnvelope: BackupEnvelope
  readonly backupType: BackupType
  readonly passphrase: string
  readonly crypto: ReturnType<typeof createEncryptedBackupCrypto>
  readonly native: BackupNativeService
}

export async function saveEncryptedBackup(
  input: SavePreparedEncryptedBackupInput,
): Promise<SavePreparedEncryptedBackupResult> {
  if (input.backupType !== "full" && input.backupType !== "project") {
    throw new TypeError("Encrypted backups support only full and project exports")
  }
  const encryptedBackup: EncryptedBackupEnvelope = await input.crypto.encryptBackupEnvelope({
    backupEnvelope: input.backupEnvelope,
    passphrase: input.passphrase,
  })
  const saved = await input.native.saveBackup({
    content: JSON.stringify(encryptedBackup),
    defaultFilename: encryptedDefaultFilenames[input.backupType],
    format: "encrypted",
  })
  return savePreparedEncryptedBackupResultSchema.parse({
    cancelled: saved.cancelled,
    backupType: input.backupType,
    message: saved.cancelled ? "Encrypted backup export cancelled" : "Encrypted backup exported",
  })
}
