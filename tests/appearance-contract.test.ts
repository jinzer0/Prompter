import { contextBridge, ipcMain, ipcRenderer } from "electron"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { registerAppearanceIpc } from "../electron/appearance-ipc.js"
import { createAppearanceBridge, createElectronBridge } from "../electron/bridge.js"
import {
  APPEARANCE_CHANNELS,
  appearanceRequestSchema,
  appearanceStateSchema,
  updateDefaultsInputSchema,
} from "../electron/ipc-contract.js"
import { createTrustedIpcSenderAssertion } from "../electron/ipc-trusted-sender.js"
import type { AppearanceState, ElectronBridge } from "../electron/ipc-types.js"

vi.mock("electron", () => ({
  ipcMain: { on: vi.fn(), removeListener: vi.fn() },
  ipcRenderer: { on: vi.fn(), removeListener: vi.fn(), sendSync: vi.fn(), invoke: vi.fn() },
  contextBridge: { exposeInMainWorld: vi.fn() },
}))

const initial: AppearanceState = { preference: "system", effectiveTheme: "light" }

beforeEach(() => vi.clearAllMocks())

describe("appearance contract", () => {
  it.each([
    "auto",
    "LIGHT",
    "",
    null,
    1,
  ])("rejects invalid preference %s before invocation", async (value) => {
    const invoke = vi.fn()
    const bridge = createElectronBridge(invoke)
    const input = { appTheme: value }
    expect(updateDefaultsInputSchema.safeParse(input).success).toBe(false)
    await expect(
      Reflect.apply(bridge.settings.updateDefaults, undefined, [input]),
    ).rejects.toThrow()
    expect(invoke).not.toHaveBeenCalled()
  })

  it("rejects unknown effective themes, extra state and request payloads", () => {
    expect(appearanceStateSchema.safeParse({ ...initial, effectiveTheme: "system" }).success).toBe(
      false,
    )
    expect(appearanceStateSchema.safeParse({ ...initial, rawKey: "not-allowed" }).success).toBe(
      false,
    )
    expect(appearanceRequestSchema.safeParse({ preference: "dark" }).success).toBe(false)
    const bridge = createAppearanceBridge(
      () => ({ ...initial, preference: "auto" }),
      () => () => undefined,
    )
    expect(() => bridge.getState()).toThrow()
  })

  it("validates notifications and removes the exact subscription on cleanup", () => {
    const listeners = new Set<(state: unknown) => void>()
    let state: AppearanceState = initial
    const bridge = createAppearanceBridge(
      () => state,
      (listener) => {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
    )
    const changed = vi.fn()
    const cleanup = bridge.onChanged(changed)
    expect(bridge.getState()).toEqual(initial)
    for (const listener of listeners) listener({ ...initial, effectiveTheme: "system" })
    expect(changed).not.toHaveBeenCalled()
    state = { preference: "dark", effectiveTheme: "dark" }
    for (const listener of listeners) listener(state)
    expect(changed).toHaveBeenCalledExactlyOnceWith(state)
    expect(bridge.getState()).toEqual(state)
    cleanup()
    expect(listeners.size).toBe(0)
  })

  it("allows only the trusted main frame to read non-sensitive initial state", () => {
    const frame = { url: "app://prompter/index.html" }
    const sender = { mainFrame: frame }
    const getState = vi.fn(() => initial)
    const cleanup = registerAppearanceIpc(
      getState,
      createTrustedIpcSenderAssertion({
        getTrustedWebContents: () => [sender],
        trustedUrl: frame.url,
      }),
    )
    const registration = vi.mocked(ipcMain.on).mock.calls[0]
    if (registration === undefined) throw new Error("Missing appearance registration")
    const [channel, listener] = registration
    expect(channel).toBe(APPEARANCE_CHANNELS.getState)
    const event = { sender, senderFrame: frame, returnValue: undefined as unknown }
    Reflect.apply(listener, undefined, [event, undefined])
    expect(event.returnValue).toEqual(initial)
    expect(getState).toHaveBeenCalledTimes(1)

    const rejected = [
      { sender: { mainFrame: frame }, senderFrame: frame, returnValue: undefined as unknown },
      { sender, senderFrame: { url: frame.url }, returnValue: undefined as unknown },
      { sender, senderFrame: null, returnValue: undefined as unknown },
    ]
    for (const untrusted of rejected) {
      Reflect.apply(listener, undefined, [untrusted, undefined])
      expect(untrusted.returnValue).toBeNull()
    }
    Reflect.apply(listener, undefined, [event, { preference: "dark" }])
    expect(event.returnValue).toBeNull()
    frame.url = "https://untrusted.example/"
    Reflect.apply(listener, undefined, [event, undefined])
    expect(event.returnValue).toBeNull()
    expect(getState).toHaveBeenCalledTimes(1)
    cleanup()
    expect(ipcMain.removeListener).toHaveBeenCalledWith(channel, listener)
  })

  it("preload subscribes before its initial snapshot and exposes only typed appearance access", async () => {
    vi.resetModules()
    vi.mocked(ipcRenderer.sendSync).mockReturnValue(initial)
    await import("../electron/preload.js")
    const exposure = vi.mocked(contextBridge.exposeInMainWorld).mock.calls[0]
    if (exposure === undefined) throw new Error("Missing preload bridge")
    expect(exposure[0]).toBe("prompter")
    const bridge = exposure[1] as ElectronBridge
    expect(Object.keys(bridge.appearance)).toEqual(["getState", "onChanged"])
    expect(bridge.appearance.getState()).toEqual(initial)
    expect(ipcRenderer.sendSync).toHaveBeenCalledExactlyOnceWith(APPEARANCE_CHANNELS.getState)
    const onOrder = vi.mocked(ipcRenderer.on).mock.invocationCallOrder[0]
    const readOrder = vi.mocked(ipcRenderer.sendSync).mock.invocationCallOrder[0]
    expect(onOrder).toBeLessThan(readOrder ?? 0)
    const registration = vi
      .mocked(ipcRenderer.on)
      .mock.calls.find(([channel]) => channel === APPEARANCE_CHANNELS.changed)
    if (registration === undefined) throw new Error("Missing appearance listener")
    const changed = vi.fn()
    const cleanup = bridge.appearance.onChanged(changed)
    const state: AppearanceState = { preference: "system", effectiveTheme: "dark" }
    Reflect.apply(registration[1], undefined, [{}, state])
    expect(bridge.appearance.getState()).toEqual(state)
    expect(changed).toHaveBeenCalledExactlyOnceWith(state)
    cleanup()
    Reflect.apply(registration[1], undefined, [{}, initial])
    expect(changed).toHaveBeenCalledTimes(1)
    expect(bridge.appearance.getState()).toEqual(initial)
    Reflect.apply(registration[1], undefined, [{}, { ...initial, preference: "bad" }])
    expect(bridge.appearance.getState()).toEqual(initial)
  })
})
