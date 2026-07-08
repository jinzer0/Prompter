import type { ElectronBridge } from "../../electron/bridge"

declare global {
  interface Window {
    readonly prompter: ElectronBridge
  }
}
