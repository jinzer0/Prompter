import { type IpcMainInvokeEvent, ipcMain } from "electron"
import {
  WINDOW_CLOSE_CHANNELS,
  windowCloseConfirmationInputSchema,
  windowCloseConfirmationResultSchema,
  windowCloseStateInputSchema,
} from "./ipc-contract.js"
import type { WindowCloseGuard } from "./window-close-guard.js"

export function registerWindowCloseIpc(
  getGuard: (event: IpcMainInvokeEvent) => WindowCloseGuard | undefined,
  assertTrustedSender: (event: IpcMainInvokeEvent) => void,
): () => void {
  ipcMain.handle(WINDOW_CLOSE_CHANNELS.updateState, (event, payload: unknown) => {
    assertTrustedSender(event)
    const input = windowCloseStateInputSchema.parse(payload)
    const guard = getGuard(event)
    if (guard === undefined) throw new Error("Window close controller is unavailable")
    guard.updateState(event, input)
  })
  ipcMain.handle(WINDOW_CLOSE_CHANNELS.confirm, (event, payload: unknown) => {
    assertTrustedSender(event)
    const input = windowCloseConfirmationInputSchema.parse(payload)
    const guard = getGuard(event)
    return windowCloseConfirmationResultSchema.parse(
      guard === undefined ? { status: "stale" } : guard.confirm(event, input),
    )
  })
  return () => {
    ipcMain.removeHandler(WINDOW_CLOSE_CHANNELS.updateState)
    ipcMain.removeHandler(WINDOW_CLOSE_CHANNELS.confirm)
  }
}
