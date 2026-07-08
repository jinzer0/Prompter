import { contextBridge, ipcRenderer } from "electron"
import { createElectronBridge } from "./bridge.js"
import type { IpcChannel } from "./ipc-contract.js"

async function invokeIpc(channel: IpcChannel, payload?: unknown): Promise<unknown> {
  return ipcRenderer.invoke(channel, payload)
}

contextBridge.exposeInMainWorld("prompter", createElectronBridge(invokeIpc))
