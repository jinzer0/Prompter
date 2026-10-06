import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { app, BrowserWindow, Menu, nativeTheme, safeStorage, type WebContents } from "electron"
import { AppLockOperationInvalidatedError } from "./app-lock/app-lock-guard.js"
import { createAppLockService } from "./app-lock/app-lock-service.js"
import { createAppLockSessionRevoker } from "./app-lock/app-lock-session-revoker.js"
import { createApplicationMenuTemplate, MENU_ACTION_CHANNEL } from "./app-menu.js"
import { registerAppearanceIpc } from "./appearance-ipc.js"
import { createAppearanceService } from "./appearance-service.js"
import { createBackupExportService } from "./backup/backup-export-service.js"
import { createBackupExportSessionStore } from "./backup/backup-export-session-store.js"
import { createBackupImportService } from "./backup/backup-import-service.js"
import { createBackupNativeService } from "./backup/backup-native-service.js"
import { createBackupImportSessionStore } from "./backup/backup-session-store.js"
import { createBackupValidationService } from "./backup/backup-validation-service.js"
import { createEncryptedBackupImportSessionStore } from "./backup/encrypted-backup-import-session-store.js"
import { openPrompterDatabase, type PrompterDatabase } from "./db/connection.js"
import { APPEARANCE_CHANNELS, WINDOW_CLOSE_CHANNELS } from "./ipc-contract.js"
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
import {
  createWindowCloseCoordinator,
  createWindowCloseGuard,
  type WindowCloseGuard,
} from "./window-close-guard.js"
import { registerWindowCloseIpc } from "./window-close-ipc.js"
import { createWindowOptions, windowBackground } from "./window-options.js"

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
let disposeAppearance: (() => void) | undefined
let disposeWindowClose: (() => void) | undefined

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

function createMainWindow(
  appLock: ReturnType<typeof createAppLockService>,
  appearance: ReturnType<typeof createAppearanceService>,
  attachCloseGuard: (window: BrowserWindow) => void,
): BrowserWindow {
  const window = new BrowserWindow(
    createWindowOptions(preloadPath, appearance.getState().effectiveTheme),
  )
  installApplicationMenu(window, appLock)
  secureMainWindowNavigation(window.webContents, rendererUrl)
  attachCloseGuard(window)
  window.once("ready-to-show", () => window.show())
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
  const appearance = createAppearanceService({
    nativeTheme,
    settings: openedDatabase.services,
  })
  const trustedWebContents: WebContents[] = []
  const closeGuards = new Map<WebContents, WindowCloseGuard>()
  const closeCoordinator = createWindowCloseCoordinator({ quit: () => app.quit() })
  const attachCloseGuard = (window: BrowserWindow) => {
    const sender = window.webContents
    trustedWebContents.push(sender)
    const guard = createWindowCloseGuard({
      sender,
      isWindowDestroyed: () => window.isDestroyed(),
      closeWindow: () => window.close(),
      sendRequest: (request) => sender.send(WINDOW_CLOSE_CHANNELS.requested, request),
      getLockState: activeAppLock.getState,
      getLockRevision: activeAppLock.getStateRevision,
      cancelQuit: closeCoordinator.cancelQuit,
    })
    closeGuards.set(sender, guard)
    closeCoordinator.add(guard)
    window.on("close", guard.onClose)
    const onNavigation = (
      _event: unknown,
      _url: string,
      isInPlace: boolean,
      isMainFrame: boolean,
    ) => {
      if (isMainFrame && !isInPlace) guard.invalidate()
    }
    sender.on("did-start-navigation", onNavigation)
    sender.on("render-process-gone", guard.invalidate)
    sender.on("destroyed", guard.invalidate)
    window.once("closed", () => {
      window.removeListener("close", guard.onClose)
      sender.removeListener("did-start-navigation", onNavigation)
      sender.removeListener("render-process-gone", guard.invalidate)
      sender.removeListener("destroyed", guard.invalidate)
      closeGuards.delete(sender)
      const index = trustedWebContents.indexOf(sender)
      if (index >= 0) trustedWebContents.splice(index, 1)
      guard.dispose()
      closeCoordinator.remove(guard)
    })
  }
  const mainWindow = createMainWindow(activeAppLock, appearance, attachCloseGuard)
  const assertTrustedSender = createTrustedIpcSenderAssertion({
    getTrustedWebContents: () => trustedWebContents,
    trustedUrl: rendererUrl,
  })
  const unregisterAppearanceIpc = registerAppearanceIpc(appearance.getState, assertTrustedSender)
  const unregisterWindowCloseIpc = registerWindowCloseIpc(
    (event) => closeGuards.get(event.sender),
    assertTrustedSender,
  )
  app.on("before-quit", closeCoordinator.beforeQuit)
  disposeWindowClose = () => {
    app.removeListener("before-quit", closeCoordinator.beforeQuit)
    unregisterWindowCloseIpc()
    for (const guard of closeGuards.values()) guard.dispose()
    closeGuards.clear()
    trustedWebContents.length = 0
  }
  const unsubscribeAppearance = appearance.subscribe((state) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.setBackgroundColor(windowBackground(state.effectiveTheme))
      if (window.webContents.getURL() === rendererUrl) {
        window.webContents.send(APPEARANCE_CHANNELS.changed, state)
      }
    }
  })
  disposeAppearance = () => {
    unsubscribeAppearance()
    unregisterAppearanceIpc()
    appearance.dispose()
  }
  registerIpcHandlers(
    {
      ...openedDatabase.services,
      updateDefaults: appearance.updateDefaults,
      setSetting: appearance.setSetting,
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
    assertTrustedSender,
  )
  await loadMainWindow(mainWindow)

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const window = createMainWindow(activeAppLock, appearance, attachCloseGuard)
      void loadMainWindow(window)
    }
  })
}

app.on("will-quit", () => {
  disposeWindowClose?.()
  disposeWindowClose = undefined
  disposeAppearance?.()
  disposeAppearance = undefined
  database?.close()
  database = undefined
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

void start()
