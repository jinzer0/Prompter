import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import type { AppLockSettings, AppLockState } from "../electron/ipc-types"
import { AppLockSettingsPanelView } from "../renderer/src/components/app-lock/app-lock-settings-panel"
import { LockScreen } from "../renderer/src/components/app-lock/lock-screen"

const lockedState = {
  enabled: true,
  locked: true,
  lockOnStart: true,
  timeoutMinutes: 15,
  lastUnlockedAt: null,
} satisfies AppLockState

const settings = {
  enabled: true,
  lockOnStart: true,
  timeoutMinutes: 15,
  requireForExport: true,
  requireForBackup: true,
  requireForLlm: true,
} satisfies AppLockSettings

describe("Phase 20 app-lock renderer UI", () => {
  it("renders LockScreen as one labelled application surface without workspace content", () => {
    // Given: a locked state and passive unlock controller.
    // When: the lock screen renders without interaction.
    const markup = renderToStaticMarkup(
      createElement(LockScreen, {
        phase: { kind: "locked", state: lockedState },
        onRefresh: vi.fn<() => Promise<void>>(),
        onUnlock: vi.fn<(passphrase: string) => Promise<boolean>>(),
      }),
    )

    // Then: one accessible app surface requests a passphrase and explains its security scope.
    expect(markup).toContain('data-testid="lock-screen"')
    expect(markup).toContain('aria-label="Prompter locked"')
    expect(markup).toContain('type="password"')
    expect(markup).toContain('autoComplete="current-password"')
    expect(markup).toContain("SQLite file")
    expect(markup).toContain("screen capture")
    expect(markup).not.toContain('data-testid="app-shell"')
  })

  it("renders retry-only protected state when lock status cannot be loaded", () => {
    // Given: a failed state lookup.
    // When: the protected screen renders.
    const markup = renderToStaticMarkup(
      createElement(LockScreen, {
        phase: { kind: "protected_error" },
        onRefresh: vi.fn<() => Promise<void>>(),
        onUnlock: vi.fn<(passphrase: string) => Promise<boolean>>(),
      }),
    )

    // Then: no passphrase form or workspace escape is available before retry succeeds.
    expect(markup).toContain("Prompter remains locked")
    expect(markup).toContain("Retry status check")
    expect(markup).not.toContain('type="password"')
  })

  it("renders enabled settings controls, security scope, and no reset path", () => {
    // Given: an enabled app-lock settings controller.
    // When: its panel renders without interaction.
    const markup = renderToStaticMarkup(
      createElement(AppLockSettingsPanelView, {
        controller: {
          phase: "ready",
          settings,
          message: null,
          setSetting: vi.fn(),
          setup: vi.fn(),
          lockNow: vi.fn(),
          saveSettings: vi.fn(),
          changePassphrase: vi.fn(),
          disable: vi.fn(),
          reload: vi.fn(),
        },
      }),
    )

    // Then: all required actions and limitations are visible without exposing reset/recovery.
    expect(markup).toContain("App lock")
    expect(markup).toContain("Lock Prompter now")
    expect(markup).toContain("Lock on start")
    expect(markup).toContain("Inactivity timeout")
    expect(markup).toContain("Change passphrase")
    expect(markup).toContain("Disable app lock")
    expect(markup).toContain("cannot be recovered")
    expect(markup).toContain("SQLite")
    expect(markup).not.toMatch(/Reset passphrase|Recover passphrase/)
  })
})
