import { createHash, randomUUID } from "node:crypto"
import { readFile, stat, writeFile } from "node:fs/promises"
import { app, clipboard, dialog } from "electron"

import type { BackupNativeDependencies } from "./backup/backup-native-service.js"
import type {
  MaintenanceActionConfirmationDecision,
  MaintenanceActionConfirmationRequest,
} from "./maintenance/maintenance-action-service.js"
import type { PromptExportNativeDependencies } from "./prompt-export-native.js"

export const promptExportNativeDependencies = {
  showSaveDialog: (options) =>
    dialog.showSaveDialog({
      defaultPath: options.defaultPath,
      filters: options.filters.map((filter) => ({
        name: filter.name,
        extensions: [...filter.extensions],
      })),
    }),
  writeFile,
  copyText: (text) => clipboard.writeText(text),
  readText: () => clipboard.readText(),
} satisfies Omit<PromptExportNativeDependencies, "privacyGuard">

export const backupNativeDependencies = {
  showSaveDialog: (options) =>
    dialog.showSaveDialog({
      defaultPath: options.defaultPath,
      filters: options.filters.map((filter) => ({
        name: filter.name,
        extensions: [...filter.extensions],
      })),
    }),
  showOpenDialog: () =>
    dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "Prompter Backup", extensions: ["json", "enc"] }],
    }),
  readFile: (filePath) => readFile(filePath, "utf8"),
  getFileSize: async (filePath) => (await stat(filePath)).size,
  writeFile,
  now: Date.now,
  createId: randomUUID,
  hashText: (text) => createHash("sha256").update(text).digest("hex"),
  getAppVersion: () => app.getVersion(),
} satisfies BackupNativeDependencies

export async function confirmMaintenanceAction(
  request: MaintenanceActionConfirmationRequest,
): Promise<MaintenanceActionConfirmationDecision> {
  const result = await dialog.showMessageBox({
    type: "warning",
    title: request.preview.title,
    message: request.preview.description,
    detail: [...request.affectedDisplayNames, ...request.warnings, ...request.consequences].join(
      "\n",
    ),
    buttons: ["Cancel", "Continue"],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  })
  return result.response === 1 ? "confirmed" : "cancelled"
}
