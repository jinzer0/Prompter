import {
  collectFullBackupData,
  collectProjectBackupData,
} from "../backup/backup-export-collectors.js"
import type { AppDatabase } from "../db/repositories/common.js"
import type {
  ScanDraftPrivacyInput,
  ScanExportContentInput,
  ScanLibraryPrivacyInput,
  ScanSensitiveTextInput,
  SensitiveScanResult,
} from "./privacy-schemas.js"
import {
  draftPayloadFields,
  exportPayloadFields,
  libraryPayloadFields,
  scanSensitivePayload,
} from "./scan-sensitive-payload.js"
import { scanSensitiveText } from "./scan-sensitive-text.js"

export type PrivacyScanServiceConfig = {
  readonly db: AppDatabase
}

export type PrivacyScanService = {
  readonly scanText: (input: ScanSensitiveTextInput) => SensitiveScanResult
  readonly scanDraft: (input: ScanDraftPrivacyInput) => SensitiveScanResult
  readonly scanExportContent: (input: ScanExportContentInput) => SensitiveScanResult
  readonly scanLibrary: (input: ScanLibraryPrivacyInput) => SensitiveScanResult
}

export function createPrivacyScanService({ db }: PrivacyScanServiceConfig): PrivacyScanService {
  return {
    scanText(input) {
      return scanSensitiveText(input)
    },
    scanDraft(input) {
      return scanSensitivePayload({ source: "draft", fields: draftPayloadFields(input) })
    },
    scanExportContent(input) {
      return scanSensitivePayload({ source: "export", fields: exportPayloadFields(input) })
    },
    scanLibrary(input) {
      const data =
        input.projectId === undefined
          ? collectFullBackupData(db)
          : collectProjectBackupData(db, input.projectId)

      return scanSensitivePayload({ source: "library", fields: libraryPayloadFields(data) })
    },
  }
}
