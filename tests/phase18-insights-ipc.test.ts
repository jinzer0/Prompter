import { ipcMain } from "electron"
import { describe, expect, it, vi } from "vitest"

import { createAppLockService } from "../electron/app-lock/app-lock-service.js"
import { createElectronBridge } from "../electron/bridge"
import { APP_LOCK_CHANNELS, PERSISTENCE_CHANNELS, PING_CHANNEL } from "../electron/ipc-contract"
import { createPersistenceIpcHandlers, registerIpcHandlers } from "../electron/ipc-handlers"
import { createTrustedIpcSenderAssertion } from "../electron/ipc-trusted-sender"
import type { InsightsFilterInput } from "../electron/ipc-types"
import { createFailingServices } from "./electron-contract-service-fixture"

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}))

const insightsInput = {
  projectId: null,
  dateRange: "all",
} satisfies InsightsFilterInput

const insightsEndpoints = [
  {
    method: "getDashboardSummary",
    channel: PERSISTENCE_CHANNELS.getDashboardSummary,
  },
  {
    method: "getProjectHealth",
    channel: PERSISTENCE_CHANNELS.getProjectHealth,
  },
  {
    method: "getScenarioDistribution",
    channel: PERSISTENCE_CHANNELS.getScenarioDistribution,
  },
  {
    method: "getTargetAgentDistribution",
    channel: PERSISTENCE_CHANNELS.getTargetAgentDistribution,
  },
  {
    method: "getQualityInsights",
    channel: PERSISTENCE_CHANNELS.getQualityInsights,
  },
  {
    method: "getVersionActivity",
    channel: PERSISTENCE_CHANNELS.getVersionActivity,
  },
  {
    method: "getTagInsights",
    channel: PERSISTENCE_CHANNELS.getTagInsights,
  },
  {
    method: "getTemplateInsights",
    channel: PERSISTENCE_CHANNELS.getTemplateInsights,
  },
  {
    method: "getProjectContextInsights",
    channel: PERSISTENCE_CHANNELS.getProjectContextInsights,
  },
  {
    method: "getMaintenanceSnapshot",
    channel: PERSISTENCE_CHANNELS.getMaintenanceSnapshot,
  },
] as const

function registeredHandler(
  handlers: Map<string, Parameters<typeof ipcMain.handle>[1]>,
  channel: string,
): Parameters<typeof ipcMain.handle>[1] {
  const handler = handlers.get(channel)
  if (handler === undefined) {
    throw new TypeError(`Missing registered handler: ${channel}`)
  }
  return handler
}

describe("Phase 18 Insights IPC", () => {
  it("registers a handler for every declared persistence channel", () => {
    const handle = vi.mocked(ipcMain.handle)
    handle.mockClear()

    registerIpcHandlers(createFailingServices(() => undefined))

    const registeredChannels = new Set(handle.mock.calls.map(([channel]) => channel))
    expect(registeredChannels).toEqual(
      new Set([PING_CHANNEL, ...Object.values(PERSISTENCE_CHANNELS)]),
    )
  })

  it("registers a handler for every declared app-lock channel", async () => {
    let metadata: string | null = null
    const appLock = createAppLockService({
      metadataStore: {
        getAppLockMetadata: () => metadata,
        setAppLockMetadata: (value) => {
          metadata = value
        },
        deleteAppLockMetadata: () => {
          metadata = null
        },
      },
    })
    const handle = vi.mocked(ipcMain.handle)
    handle.mockClear()

    registerIpcHandlers(
      createFailingServices(() => undefined),
      appLock,
    )

    const registeredChannels = new Set(handle.mock.calls.map(([channel]) => channel))
    expect(registeredChannels).toEqual(
      new Set([
        PING_CHANNEL,
        ...Object.values(PERSISTENCE_CHANNELS),
        ...Object.values(APP_LOCK_CHANNELS),
      ]),
    )
  })

  it("rejects foreign senders, subframes, and unexpected URLs before dispatch", async () => {
    const trustedFrame = { url: "app://prompter/index.html" }
    const trustedSender = { mainFrame: trustedFrame }
    const foreignFrame = { url: "app://prompter/index.html" }
    const foreignSender = { mainFrame: foreignFrame }
    const unexpectedFrame = { url: "https://untrusted.example/" }
    const subframe = { url: "app://prompter/index.html" }
    const assertTrustedSender = createTrustedIpcSenderAssertion({
      getTrustedWebContents: () => [trustedSender],
      trustedUrl: trustedFrame.url,
    })
    let metadata: string | null = null
    const appLock = createAppLockService({
      metadataStore: {
        getAppLockMetadata: () => metadata,
        setAppLockMetadata: (value) => {
          metadata = value
        },
        deleteAppLockMetadata: () => {
          metadata = null
        },
      },
    })
    const handle = vi.mocked(ipcMain.handle)
    handle.mockClear()
    registerIpcHandlers(
      createFailingServices(() => undefined),
      appLock,
      undefined,
      assertTrustedSender,
    )
    const handlers = new Map(handle.mock.calls)
    const events = [
      { sender: foreignSender, senderFrame: foreignFrame },
      { sender: trustedSender, senderFrame: subframe },
      { sender: trustedSender, senderFrame: unexpectedFrame },
    ]

    for (const event of events) {
      await expect(
        Promise.resolve().then(() =>
          Reflect.apply(registeredHandler(handlers, PING_CHANNEL), undefined, [event, undefined]),
        ),
      ).rejects.toThrow("Untrusted IPC sender")
      await expect(
        Promise.resolve().then(() =>
          Reflect.apply(registeredHandler(handlers, PERSISTENCE_CHANNELS.listProjects), undefined, [
            event,
            undefined,
          ]),
        ),
      ).rejects.toThrow("Untrusted IPC sender")
      await expect(
        Promise.resolve().then(() =>
          Reflect.apply(registeredHandler(handlers, APP_LOCK_CHANNELS.getState), undefined, [
            event,
            undefined,
          ]),
        ),
      ).rejects.toThrow("Untrusted IPC sender")
    }

    expect(
      Reflect.apply(registeredHandler(handlers, PING_CHANNEL), undefined, [
        { sender: trustedSender, senderFrame: trustedFrame },
        undefined,
      ]),
    ).toBe("pong")
  })

  it("blocks every persistence channel before payload parsing while locked", async () => {
    // Given: a fully registered IPC registry with a locked authoritative service.
    let metadata: string | null = null
    const appLock = createAppLockService({
      metadataStore: {
        getAppLockMetadata: () => metadata,
        setAppLockMetadata: (value) => {
          metadata = value
        },
        deleteAppLockMetadata: () => {
          metadata = null
        },
      },
    })
    const passphrase = "correct horse battery staple"
    await appLock.setup({ passphrase, confirmation: passphrase })
    appLock.lock()
    const handle = vi.mocked(ipcMain.handle)
    handle.mockClear()
    registerIpcHandlers(
      createFailingServices(() => undefined),
      appLock,
    )
    const handlers = new Map(handle.mock.calls)

    // When: every declared persistence endpoint receives an intentionally malformed payload.
    const results = await Promise.all(
      Object.values(PERSISTENCE_CHANNELS).map(async (channel) => {
        const handler = registeredHandler(handlers, channel)
        return expect(
          Promise.resolve().then(() => Reflect.apply(handler, undefined, [{}, undefined])),
        ).rejects.toThrow("Prompter is locked")
      }),
    )

    // Then: no sensitive endpoint parses or reaches a service while the lock is active.
    expect(results).toHaveLength(Object.values(PERSISTENCE_CHANNELS).length)
    expect(
      Reflect.apply(registeredHandler(handlers, APP_LOCK_CHANNELS.getState), undefined, [
        {},
        undefined,
      ]),
    ).toMatchObject({ enabled: true, locked: true })
    await expect(
      Reflect.apply(registeredHandler(handlers, APP_LOCK_CHANNELS.unlock), undefined, [
        {},
        { passphrase },
      ]),
    ).resolves.toBe(true)
  })

  it("routes every Insights bridge method through its exact channel and validated payload", async () => {
    // Given: a renderer invoke boundary that records every call.
    const invoke = vi.fn(async () => {
      throw new TypeError("Planned invoke failure")
    })
    const bridge = createElectronBridge(invoke)

    // When: every read-only Insights method receives the shared valid filter.
    for (const { method } of insightsEndpoints) {
      await expect(bridge.insights[method](insightsInput)).rejects.toThrow("Planned invoke failure")
    }

    // Then: each endpoint uses only its declared IPC channel and exact parsed filter.
    for (const [index, { channel }] of insightsEndpoints.entries()) {
      expect(invoke).toHaveBeenNthCalledWith(index + 1, channel, insightsInput)
    }
    expect(Object.keys(bridge.insights).sort()).toEqual(
      insightsEndpoints.map(({ method }) => method).sort(),
    )
  })

  it("rejects invalid main-process payloads before dispatch and malformed service results after dispatch", () => {
    // Given: a service whose dashboard result is invalid at the IPC boundary.
    const dashboardSummary = vi.fn(() => ({}))
    const services = createFailingServices(() => {
      throw new TypeError("Unexpected service call")
    })
    const installed = Reflect.set(services, "getDashboardSummary", dashboardSummary)
    if (!installed) {
      throw new TypeError("Expected dashboard service to install")
    }
    const handlers = createPersistenceIpcHandlers(services)
    const dashboardHandler = Reflect.get(handlers, "getDashboardSummary")
    if (typeof dashboardHandler !== "function") {
      throw new TypeError("Expected dashboard IPC handler")
    }

    // When: malformed input reaches the main process, then valid input produces an invalid result.
    expect(() => dashboardHandler({ projectId: "invalid", dateRange: "all" })).toThrow()
    expect(() => dashboardHandler(insightsInput)).toThrow()

    // Then: parsing prevents the invalid dispatch and rejects the malformed service response.
    expect(dashboardSummary).toHaveBeenCalledTimes(1)
    expect(dashboardSummary).toHaveBeenCalledWith(insightsInput)
  })

  it("rejects malformed responses from the main process before returning to the renderer", async () => {
    // Given: an invoke boundary that returns a malformed dashboard result.
    const bridge = createElectronBridge(async () => ({}))

    // When: the renderer requests a dashboard summary.
    const response = bridge.insights.getDashboardSummary(insightsInput)

    // Then: the bridge response schema rejects the malformed result.
    await expect(response).rejects.toThrow()
  })

  it("registers all and only the declared Insights IPC channels", () => {
    // Given: the central handler registry and a complete failing service fixture.
    const handle = vi.mocked(ipcMain.handle)
    handle.mockClear()

    // When: main-process handlers are registered.
    registerIpcHandlers(
      createFailingServices(() => {
        throw new TypeError("Unexpected service call")
      }),
    )

    // Then: every Insights channel is registered exactly once.
    const channels = handle.mock.calls.map(([channel]) => channel)
    for (const { channel } of insightsEndpoints) {
      expect(channels.filter((registeredChannel) => registeredChannel === channel)).toHaveLength(1)
    }
  })
})
