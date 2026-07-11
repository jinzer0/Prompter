import type { ElectronBridge } from "../../electron/ipc-types"

declare global {
  interface Window {
    readonly prompter: ElectronBridge
  }
}
