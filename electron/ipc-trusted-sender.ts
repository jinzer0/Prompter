import type { IpcMainInvokeEvent } from "electron"

export class UntrustedIpcSenderError extends Error {
  readonly name = "UntrustedIpcSenderError"

  constructor() {
    super("Untrusted IPC sender")
  }
}

export type TrustedIpcFrame = { readonly url: string }

export type TrustedIpcWebContents = {
  readonly mainFrame: TrustedIpcFrame
}

export type TrustedIpcSenderConfig = {
  readonly getTrustedWebContents: () => readonly TrustedIpcWebContents[]
  readonly trustedUrl: string
}

export function createTrustedIpcSenderAssertion(config: TrustedIpcSenderConfig) {
  return (event: IpcMainInvokeEvent): void => {
    if (
      !config.getTrustedWebContents().includes(event.sender) ||
      event.senderFrame !== event.sender.mainFrame ||
      event.senderFrame.url !== config.trustedUrl
    ) {
      throw new UntrustedIpcSenderError()
    }
  }
}
