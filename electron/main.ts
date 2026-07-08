import { join } from "node:path"
import { app, BrowserWindow } from "electron"

import { openPrompterDatabase, type PrompterDatabase } from "./db/connection.js"
import { registerIpcHandlers } from "./ipc-handlers.js"
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
  return openPrompterDatabase({
    databasePath: join(app.getPath("userData"), "prompter.sqlite"),
    migrationsFolder: join(app.getAppPath(), "drizzle"),
  })
}

async function createMainWindow(): Promise<void> {
  const window = new BrowserWindow(createWindowOptions(preloadPath))

  if (rendererDevServerUrl === undefined || rendererDevServerUrl.length === 0) {
    await window.loadFile(join(electronDirectory, "../dist/renderer/index.html"))
    return
  }

  await window.loadURL(rendererDevServerUrl)
}

async function start(): Promise<void> {
  await app.whenReady()
  database = openMainDatabase()
  registerIpcHandlers(database.services)
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
