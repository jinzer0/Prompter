import { createHash, randomUUID } from "node:crypto"
import { readFile, stat, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { app, BrowserWindow, clipboard, dialog, Menu, safeStorage } from "electron"

import { createApplicationMenuTemplate, MENU_ACTION_CHANNEL } from "./app-menu.js"
import { createBackupExportService } from "./backup/backup-export-service.js"
import { createBackupImportService } from "./backup/backup-import-service.js"
import {
  type BackupNativeDependencies,
  createBackupNativeService,
} from "./backup/backup-native-service.js"
import { createBackupImportSessionStore } from "./backup/backup-session-store.js"
import { createBackupValidationService } from "./backup/backup-validation-service.js"
import { openPrompterDatabase, type PrompterDatabase } from "./db/connection.js"
import { registerIpcHandlers } from "./ipc-handlers.js"
import type {
  MaintenanceActionConfirmationDecision,
  MaintenanceActionConfirmationRequest,
} from "./maintenance/maintenance-action-service.js"
import { createMaintenanceServices } from "./maintenance/maintenance-services.js"
import { createTestPromptCompilerClientFactory } from "./prompt-compiler/test-client.js"
import {
  createPromptExportNativeService,
  type PromptExportNativeDependencies,
} from "./prompt-export-native.js"
import { createOpenAIKeyStore } from "./secrets/open-ai-key-store.js"
import { createWindowOptions } from "./window-options.js"

const electronDirectory = join(app.getAppPath(), "dist-electron")
const preloadPath = join(electronDirectory, "preload.cjs")
const {
  PROMPTER_USER_DATA_DIR: prompterUserDataDirectory,
  VITE_DEV_SERVER_URL: rendererDevServerUrl,
} = process.env
let database: PrompterDatabase | undefined

if (prompterUserDataDirectory !== undefined && prompterUserDataDirectory.length > 0) {
  app.setPath("userData", prompterUserDataDirectory)
}

function openMainDatabase(): PrompterDatabase {
  const promptCompilerClientFactory = createTestPromptCompilerClientFactory(process.env)

  return openPrompterDatabase({
    databasePath: join(app.getPath("userData"), "prompter.sqlite"),
    migrationsFolder: join(app.getAppPath(), "drizzle"),
    openAIKeyStore: createOpenAIKeyStore({
      safeStorage,
      secretFilePath: join(app.getPath("userData"), "secrets", "open-ai-key.json"),
    }),
    ...(promptCompilerClientFactory === undefined ? {} : { promptCompilerClientFactory }),
  })
}

function installApplicationMenu(window: BrowserWindow): void {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate(
      createApplicationMenuTemplate({
        isDevelopment: rendererDevServerUrl !== undefined && rendererDevServerUrl.length > 0,
        isMac: process.platform === "darwin",
        sendAction: (action) => window.webContents.send(MENU_ACTION_CHANNEL, action),
      }),
    ),
  )
}

const promptExportNativeDependencies = {
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
} satisfies PromptExportNativeDependencies

const backupNativeDependencies = {
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
      filters: [{ name: "Prompter Backup", extensions: ["json"] }],
    }),
  readFile: (filePath) => readFile(filePath, "utf8"),
  getFileSize: async (filePath) => (await stat(filePath)).size,
  writeFile,
  now: Date.now,
  createId: randomUUID,
  hashText: (text) => createHash("sha256").update(text).digest("hex"),
  getAppVersion: () => app.getVersion(),
} satisfies BackupNativeDependencies

async function confirmMaintenanceAction(
  request: MaintenanceActionConfirmationRequest,
): Promise<MaintenanceActionConfirmationDecision> {
  const detail = [
    ...request.affectedDisplayNames,
    ...request.warnings,
    ...request.consequences,
  ].join("\n")
  const result = await dialog.showMessageBox({
    type: "warning",
    title: request.preview.title,
    message: request.preview.description,
    detail,
    buttons: ["Cancel", "Continue"],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  })

  return result.response === 1 ? "confirmed" : "cancelled"
}

async function createMainWindow(): Promise<void> {
  const window = new BrowserWindow(createWindowOptions(preloadPath))
  installApplicationMenu(window)

  if (rendererDevServerUrl === undefined || rendererDevServerUrl.length === 0) {
    await window.loadFile(join(electronDirectory, "../dist/renderer/index.html"))
    return
  }

  await window.loadURL(rendererDevServerUrl)
}

async function start(): Promise<void> {
  await app.whenReady()
  database = openMainDatabase()
  const backupNative = createBackupNativeService(backupNativeDependencies)
  const backupSessions = createBackupImportSessionStore({
    now: backupNative.now,
    createId: backupNative.createId,
  })
  registerIpcHandlers({
    ...database.services,
    ...createMaintenanceServices({
      sqlite: database.sqlite,
      confirmAction: confirmMaintenanceAction,
    }),
    ...createPromptExportNativeService(promptExportNativeDependencies),
    ...createBackupExportService({ db: database.db, native: backupNative }),
    ...createBackupValidationService({
      db: database.db,
      native: backupNative,
      sessions: backupSessions,
    }),
    ...createBackupImportService({
      db: database.db,
      sqlite: database.sqlite,
      sessions: backupSessions,
      createId: backupNative.createId,
    }),
  })
  await createMainWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow()
    }
  })
}

app.on("before-quit", () => {
  database?.close()
  database = undefined
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

void start()
