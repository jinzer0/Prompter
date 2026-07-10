import { contextBridge, ipcRenderer } from "electron"
import { MENU_ACTION_CHANNEL, type MenuAction, menuActionSchema } from "./app-menu.js"
import { createElectronBridge } from "./bridge.js"
import type { IpcChannel } from "./ipc-contract.js"

async function invokeIpc(channel: IpcChannel, payload?: unknown): Promise<unknown> {
  return ipcRenderer.invoke(channel, payload)
}

function subscribeMenuAction(callback: (action: MenuAction) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, action: unknown) => {
    const parsed = menuActionSchema.safeParse(action)

    if (parsed.success) {
      callback(parsed.data)
    }
  }

  ipcRenderer.on(MENU_ACTION_CHANNEL, listener)
  return () => ipcRenderer.removeListener(MENU_ACTION_CHANNEL, listener)
}

contextBridge.exposeInMainWorld("prompter", createElectronBridge(invokeIpc, subscribeMenuAction))
