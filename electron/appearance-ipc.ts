import { type IpcMainEvent, ipcMain } from "electron"

import {
  APPEARANCE_CHANNELS,
  appearanceRequestSchema,
  appearanceStateSchema,
} from "./ipc-contract.js"
import type { AppearanceState } from "./ipc-types.js"

// Appearance contains no library data or secrets and is needed by the locked screen too.
// This is the only synchronous request: preload takes a snapshot before renderer startup.
export function registerAppearanceIpc(
  getState: () => AppearanceState,
  assertTrustedSender: (event: IpcMainEvent) => void,
): () => void {
  const listener = (event: IpcMainEvent, payload: unknown) => {
    try {
      assertTrustedSender(event)
      appearanceRequestSchema.parse(payload)
      event.returnValue = appearanceStateSchema.parse(getState())
    } catch {
      // Always release a synchronous sender, but never disclose state on rejected requests.
      event.returnValue = null
    }
  }
  ipcMain.on(APPEARANCE_CHANNELS.getState, listener)
  return () => ipcMain.removeListener(APPEARANCE_CHANNELS.getState, listener)
}
