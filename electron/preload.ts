import { contextBridge, ipcRenderer } from "electron"
import { MENU_ACTION_CHANNEL, type MenuAction, menuActionSchema } from "./app-menu.js"
import { createAppearanceBridge, createElectronBridge, createWindowCloseBridge } from "./bridge.js"
import {
  APPEARANCE_CHANNELS,
  appearanceStateSchema,
  type IpcChannel,
  WINDOW_CLOSE_CHANNELS,
  windowCloseRequestSchema,
} from "./ipc-contract.js"
import type { AppearanceState, ElectronBridge, WindowCloseRequest } from "./ipc-types.js"

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

const appearanceListeners = new Set<(state: unknown) => void>()
let appearanceState: AppearanceState

ipcRenderer.on(APPEARANCE_CHANNELS.changed, (_event, state: unknown) => {
  const parsed = appearanceStateSchema.safeParse(state)
  if (!parsed.success) return
  appearanceState = parsed.data
  for (const listener of appearanceListeners) listener(appearanceState)
})
appearanceState = appearanceStateSchema.parse(ipcRenderer.sendSync(APPEARANCE_CHANNELS.getState))

const closeListeners = new Set<(request: unknown) => void>()
let pendingCloseRequest: WindowCloseRequest | null = null
ipcRenderer.on(WINDOW_CLOSE_CHANNELS.requested, (_event, request: unknown) => {
  const parsed = windowCloseRequestSchema.safeParse(request)
  if (!parsed.success) return
  if (closeListeners.size === 0) pendingCloseRequest = parsed.data
  for (const listener of closeListeners) listener(parsed.data)
})

const bridge: ElectronBridge = {
  ...createElectronBridge(invokeIpc, subscribeMenuAction),
  windowClose: createWindowCloseBridge(invokeIpc, (callback) => {
    closeListeners.add(callback)
    if (pendingCloseRequest !== null) {
      const request = pendingCloseRequest
      pendingCloseRequest = null
      callback(request)
    }
    return () => {
      closeListeners.delete(callback)
    }
  }),
  appearance: createAppearanceBridge(
    () => appearanceState,
    (callback) => {
      appearanceListeners.add(callback)
      return () => {
        appearanceListeners.delete(callback)
      }
    },
  ),
}
contextBridge.exposeInMainWorld("prompter", bridge)
