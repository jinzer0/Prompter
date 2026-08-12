import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { app, BrowserWindow, Menu, safeStorage, type WebContents } from "electron"

import { AppLockOperationInvalidatedError } from "./app-lock/app-lock-guard.js"
import { createAppLockService } from "./app-lock/app-lock-service.js"
import { createAppLockSessionRevoker } from "./app-lock/app-lock-session-revoker.js"
import { createApplicationMenuTemplate, MENU_ACTION_CHANNEL } from "./app-menu.js"
import { createBackupExportService } from "./backup/backup-export-service.js"
import { createBackupExportSessionStore } from "./backup/backup-export-session-store.js"
import { createBackupImportService } from "./backup/backup-import-service.js"
import { createBackupNativeService } from "./backup/backup-native-service.js"
import { createBackupImportSessionStore } from "./backup/backup-session-store.js"
import { createBackupValidationService } from "./backup/backup-validation-service.js"
import { createEncryptedBackupImportSessionStore } from "./backup/encrypted-backup-import-session-store.js"
import { openPrompterDatabase, type PrompterDatabase } from "./db/connection.js"
import { registerIpcHandlers } from "./ipc-handlers.js"
import { createTrustedIpcSenderAssertion } from "./ipc-trusted-sender.js"
import {
  backupNativeDependencies,
  confirmMaintenanceAction,
  promptExportNativeDependencies,
} from "./main-native-dependencies.js"
import { secureMainWindowNavigation } from "./main-window-security.js"
import { createMaintenanceActionSessionStore } from "./maintenance/maintenance-action-session-store.js"
import { createMaintenanceServices } from "./maintenance/maintenance-services.js"
import { createPrivacyConfirmationSessionStore } from "./privacy/privacy-confirmation-session-store.js"
import { createTestPromptCompilerClientFactory } from "./prompt-compiler/test-client.js"
import { createPromptExportNativeService } from "./prompt-export-native.js"
import { canonicalizeRendererUrl } from "./renderer-url.js"
import { createOpenAIKeyStore } from "./secrets/open-ai-key-store.js"
import { createWindowOptions } from "./window-options.js"

const electronDirectory = join(app.getAppPath(), "dist-electron")
const preloadPath = join(electronDirectory, "preload.cjs")
const productionRendererUrl = canonicalizeRendererUrl(
  pathToFileURL(join(electronDirectory, "../dist/renderer/index.html")).toString(),
)
const {
  PROMPTER_USER_DATA_DIR: prompterUserDataDirectory,
  VITE_DEV_SERVER_URL: rendererDevServerUrl,
} = process.env
const rendererUrl =
  rendererDevServerUrl === undefined || rendererDevServerUrl.length === 0
    ? productionRendererUrl
    : canonicalizeRendererUrl(rendererDevServerUrl)
let database: PrompterDatabase | undefined

if (prompterUserDataDirectory !== undefined && prompterUserDataDirectory.length > 0) {
  app.setPath("userData", prompterUserDataDirectory)
}

function openMainDatabase(
  privacyConfirmationSessions: ReturnType<typeof createPrivacyConfirmationSessionStore>,
  appLockGuard: {
    readonly capture: () => { readonly revision: number }
    readonly check: (epoch: { readonly revision: number }) => void
  },
): PrompterDatabase {
  const promptCompilerClientFactory = createTestPromptCompilerClientFactory(process.env)

  return openPrompterDatabase({
    databasePath: join(app.getPath("userData"), "prompter.sqlite"),
    migrationsFolder: join(app.getAppPath(), "drizzle"),
    openAIKeyStore: createOpenAIKeyStore({
      safeStorage,
      secretFilePath: join(app.getPath("userData"), "secrets", "open-ai-key.json"),
    }),
    ...(promptCompilerClientFactory === undefined ? {} : { promptCompilerClientFactory }),
    privacyConfirmationSessions,
    appLockGuard,
  })
}

function installApplicationMenu(
  window: BrowserWindow,
  appLock: ReturnType<typeof createAppLockService>,
): void {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate(
      createApplicationMenuTemplate({
        isDevelopment: rendererUrl !== productionRendererUrl,
        isMac: process.platform === "darwin",
        locked: appLock.getState().locked,
        sendAction: (action) => {
          if (action === "lockPrompter") {
            appLock.lock()
            installApplicationMenu(window, appLock)
          }
          window.webContents.send(MENU_ACTION_CHANNEL, action)
        },
      }),
    ),
  )
}

function createMainWindow(appLock: ReturnType<typeof createAppLockService>): BrowserWindow {
  const window = new BrowserWindow(createWindowOptions(preloadPath))
  installApplicationMenu(window, appLock)
  secureMainWindowNavigation(window.webContents, rendererUrl)
  return window
}

async function loadMainWindow(window: BrowserWindow): Promise<void> {
  if (rendererUrl === productionRendererUrl) {
    await window.loadFile(join(electronDirectory, "../dist/renderer/index.html"))
    return
  }

  await window.loadURL(rendererUrl)
}

async function start(): Promise<void> {
  await app.whenReady()
  const privacySessions = createPrivacyConfirmationSessionStore()
  const maintenanceSessions = createMaintenanceActionSessionStore()
  const backupExportSessions = createBackupExportSessionStore()
  const encryptedBackupImportSessions = createEncryptedBackupImportSessionStore()
  let appLock: ReturnType<typeof createAppLockService> | null = null
  const appLockGuard = {
    capture: () => {
      if (appLock === null || appLock.getState().locked) {
        throw new AppLockOperationInvalidatedError()
      }
      return { revision: appLock.getStateRevision() }
    },
    check: (epoch: { readonly revision: number }) => {
      if (
        appLock === null ||
        appLock.getState().locked ||
        appLock.getStateRevision() !== epoch.revision
      ) {
        throw new AppLockOperationInvalidatedError()
      }
    },
  }
  const openedDatabase = openMainDatabase(privacySessions, appLockGuard)
  database = openedDatabase
  const backupNative = createBackupNativeService(backupNativeDependencies, appLockGuard)
  const backupSessions = createBackupImportSessionStore({
    now: backupNative.now,
    createId: backupNative.createId,
  })
  const activeAppLock = createAppLockService({
    metadataStore: openedDatabase.services,
    revokeSensitiveSessions: createAppLockSessionRevoker({
      privacyConfirmationSessions: privacySessions,
      maintenanceActionSessions: maintenanceSessions,
      backupExportSessions,
      backupImportSessions: backupSessions,
      encryptedBackupImportSessions,
    }).revokeSensitiveSessions,
  })
  appLock = activeAppLock
  const mainWindow = createMainWindow(activeAppLock)
  const trustedWebContents: WebContents[] = [mainWindow.webContents]
  registerIpcHandlers(
    {
      ...openedDatabase.services,
      ...createMaintenanceServices({
        sqlite: openedDatabase.sqlite,
        confirmAction: confirmMaintenanceAction,
        sessions: maintenanceSessions,
        appLockGuard,
      }),
      ...createPromptExportNativeService({
        ...promptExportNativeDependencies,
        privacyGuard: openedDatabase.services.privacyGuard,
        appLockGuard,
      }),
      ...createBackupExportService({
        db: openedDatabase.db,
        native: backupNative,
        exportSessions: backupExportSessions,
        privacyConfirmationSessions: privacySessions,
        getWarnBeforeBackup: () => openedDatabase.services.getPrivacySettings().warnBeforeBackup,
        appLockGuard,
      }),
      ...createBackupValidationService({
        db: openedDatabase.db,
        native: backupNative,
        sessions: backupSessions,
        encryptedImportSessions: encryptedBackupImportSessions,
        appLockGuard,
      }),
      ...createBackupImportService({
        db: openedDatabase.db,
        sqlite: openedDatabase.sqlite,
        sessions: backupSessions,
        createId: backupNative.createId,
        appLockGuard,
      }),
    },
    activeAppLock,
    () => {
      for (const window of BrowserWindow.getAllWindows()) {
        installApplicationMenu(window, activeAppLock)
      }
    },
    createTrustedIpcSenderAssertion({
      getTrustedWebContents: () => trustedWebContents,
      trustedUrl: rendererUrl,
    }),
  )
  await loadMainWindow(mainWindow)

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const window = createMainWindow(activeAppLock)
      trustedWebContents.push(window.webContents)
      void loadMainWindow(window)
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
