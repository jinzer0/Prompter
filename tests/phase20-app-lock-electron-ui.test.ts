import { mkdir, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"

import { closePrompter, launchPrompter } from "./electron-playwright-helpers"

const passphrase = "phase20 lock passphrase"
const changedPassphrase = "phase20 changed passphrase"

test("protects and restores the live renderer workspace", async ({
  browserName: _browserName,
}, testInfo) => {
  const userDataDirectory = await mkdtemp(join(tmpdir(), "prompter-phase20-renderer-"))
  const desktopScreenshot = "test-results/phase20-app-lock-desktop.png"
  const constrainedScreenshot = "test-results/phase20-app-lock-constrained.png"

  try {
    await mkdir("test-results", { recursive: true })
    const running = await launchPrompter(userDataDirectory)
    const { app, page } = running
    const draft = page.getByRole("textbox", { name: "Original request" })
    await draft.fill("Unsaved Phase 20 draft must survive locking exactly.  ")

    await page.getByRole("heading", { name: "App lock", exact: true }).scrollIntoViewIfNeeded()
    await page.getByRole("checkbox", { name: "Lock on start" }).check()
    await page.getByRole("spinbutton", { name: "Inactivity timeout" }).fill("2")
    await page.getByRole("button", { name: "Enable app lock" }).click()
    await page.getByRole("textbox", { name: "New passphrase", exact: true }).fill(passphrase)
    await page
      .getByRole("textbox", { name: "Confirm new passphrase", exact: true })
      .fill(passphrase)
    await page.getByRole("button", { name: "Enable app lock" }).click()
    await page.getByRole("button", { name: "Lock Prompter now" }).click()

    await page.getByRole("main", { name: "Prompter locked" }).waitFor()
    await expect(page.locator('[data-testid="app-shell"]')).toHaveCount(0)
    await page.screenshot({ path: desktopScreenshot, fullPage: true })

    await page.setViewportSize({ width: 760, height: 640 })
    await page.screenshot({ path: constrainedScreenshot, fullPage: true })
    await page.getByLabel("App-lock passphrase").fill("incorrect passphrase")
    await page.getByRole("button", { name: "Unlock Prompter" }).click()
    await page.getByRole("alert").filter({ hasText: "not accepted" }).waitFor()
    await expect(page.locator("#app-lock-passphrase")).toBeFocused()
    await expect(page.locator('[data-testid="app-shell"]')).toHaveCount(0)
    await page.getByLabel("App-lock passphrase").fill(passphrase)
    await page.getByRole("button", { name: "Unlock Prompter" }).click()

    await page.locator('[data-testid="app-shell"]').waitFor({ state: "visible" })
    await draft.waitFor()
    await expect(draft).toHaveValue("Unsaved Phase 20 draft must survive locking exactly.  ")

    await page.getByRole("heading", { name: "App lock", exact: true }).scrollIntoViewIfNeeded()
    await page.getByRole("checkbox", { name: "Lock on start" }).uncheck()
    await page.getByRole("spinbutton", { name: "Inactivity timeout" }).fill("3")
    await page.getByRole("button", { name: "Save lock settings" }).click()
    await expect(page.getByText("App-lock settings saved.")).toBeVisible()
    await page.getByRole("button", { name: "Change passphrase" }).click()
    await page.getByRole("textbox", { name: "Current passphrase", exact: true }).fill(passphrase)
    await page.getByRole("textbox", { name: "New passphrase", exact: true }).fill(changedPassphrase)
    await page
      .getByRole("textbox", { name: "Confirm new passphrase", exact: true })
      .fill(changedPassphrase)
    await page.getByRole("button", { name: "Change passphrase", exact: true }).click()
    await expect(page.getByText("Passphrase changed.")).toBeVisible()

    const menuItem = await app.evaluate(({ BrowserWindow, Menu }) => {
      const item = Menu.getApplicationMenu()
        ?.items.flatMap((entry) => entry.submenu?.items ?? [])
        .find((entry) => entry.label === "Lock Prompter")
      item?.click?.(item, BrowserWindow.getAllWindows()[0], {})
      return item?.label ?? null
    })
    expect(menuItem).toBe("Lock Prompter")
    await page.getByRole("main", { name: "Prompter locked" }).waitFor()
    await expect(page.locator('[data-testid="app-shell"]')).toHaveCount(0)
    await page.getByLabel("App-lock passphrase").fill(passphrase)
    await page.getByRole("button", { name: "Unlock Prompter" }).click()
    await page.getByRole("alert").filter({ hasText: "not accepted" }).waitFor()
    await page.getByLabel("App-lock passphrase").fill(changedPassphrase)
    await page.getByRole("button", { name: "Unlock Prompter" }).click()
    await page.locator('[data-testid="app-shell"]').waitFor({ state: "visible" })

    await page.getByRole("heading", { name: "App lock", exact: true }).scrollIntoViewIfNeeded()
    await page.getByRole("button", { name: "Disable app lock" }).click()
    await page
      .getByRole("textbox", { name: "Current passphrase", exact: true })
      .fill(changedPassphrase)
    await page.getByRole("button", { name: "Disable app lock", exact: true }).click()
    await expect(page.getByRole("heading", { name: "Enable app lock" })).toBeVisible()

    await testInfo.attach("phase20-app-lock-desktop", {
      path: desktopScreenshot,
      contentType: "image/png",
    })
    await testInfo.attach("phase20-app-lock-constrained", {
      path: constrainedScreenshot,
      contentType: "image/png",
    })
    await closePrompter(app)
  } finally {
    await rm(userDataDirectory, { recursive: true, force: true })
  }
})

test("mounted auto-lock listeners reset deadlines, restore protection, and clean up", async () => {
  const userDataDirectory = await mkdtemp(join(tmpdir(), "prompter-phase20-listeners-"))

  try {
    const { app, page } = await launchPrompter(userDataDirectory)
    await page.clock.install({ time: new Date("2026-08-12T12:00:00Z") })
    await page.addInitScript(`(() => {
      const tracked = new Set(["keydown", "pointerdown", "mousemove", "focus", "visibilitychange"])
      const audit = { records: [] }
      const wrappers = new WeakMap()
      const add = EventTarget.prototype.addEventListener
      const remove = EventTarget.prototype.removeEventListener
      const publish = () => {
        document.documentElement.dataset["autoLockAudit"] = JSON.stringify(audit)
      }
      EventTarget.prototype.addEventListener = function(type, listener, options) {
        if ((this === window || this === document) && tracked.has(type) && listener !== null) {
          const record = {
            target: this === window ? "window" : "document",
            type,
            invoked: 0,
            removed: false,
          }
          audit.records.push(record)
          publish()
          const wrapped = function(event) {
            record.invoked += 1
            publish()
            if (typeof listener === "function") listener.call(this, event)
            else listener.handleEvent(event)
          }
          const listenerWrappers = wrappers.get(listener) ?? {}
          listenerWrappers[record.target + ":" + type] = { record, wrapped }
          wrappers.set(listener, listenerWrappers)
          return add.call(this, type, wrapped, options)
        }
        return add.call(this, type, listener, options)
      }
      EventTarget.prototype.removeEventListener = function(type, listener, options) {
        if ((this === window || this === document) && tracked.has(type) && listener !== null) {
          const listenerWrappers = wrappers.get(listener)
          const key = (this === window ? "window:" : "document:") + type
          const trackedListener = listenerWrappers?.[key]
          if (trackedListener !== undefined) trackedListener.record.removed = true
          publish()
          return remove.call(this, type, trackedListener?.wrapped ?? listener, options)
        }
        return remove.call(this, type, listener, options)
      }
      publish()
    })()`)
    await page.reload()
    await page.locator('[data-testid="app-shell"]').waitFor({ state: "visible" })

    await page.getByRole("heading", { name: "App lock", exact: true }).scrollIntoViewIfNeeded()
    await page.getByRole("spinbutton", { name: "Inactivity timeout" }).fill("1")
    await page.getByRole("button", { name: "Enable app lock" }).click()
    await page.getByRole("textbox", { name: "New passphrase", exact: true }).fill(passphrase)
    await page
      .getByRole("textbox", { name: "Confirm new passphrase", exact: true })
      .fill(passphrase)
    await page.getByRole("button", { name: "Enable app lock" }).click()
    await expect(page.getByText("App lock enabled.")).toBeVisible()

    await expect
      .poll(() =>
        page.evaluate(() => {
          const audit = JSON.parse(document.documentElement.dataset["autoLockAudit"] ?? "{}")
          return audit.records.map(
            (record: { readonly target: string; readonly type: string }) =>
              `${record.target}:${record.type}`,
          )
        }),
      )
      .toEqual(
        expect.arrayContaining([
          "window:keydown",
          "window:pointerdown",
          "window:mousemove",
          "window:focus",
          "document:visibilitychange",
        ]),
      )

    await page.clock.fastForward("00:30")
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" })))
    await page.clock.fastForward("00:30")
    await page.evaluate(() => window.dispatchEvent(new PointerEvent("pointerdown")))
    await page.clock.fastForward("00:30")
    await page.evaluate(() => window.dispatchEvent(new MouseEvent("mousemove")))
    await page.clock.fastForward("00:59")
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible()
    await page.clock.fastForward("00:01")
    await page.getByRole("main", { name: "Prompter locked" }).waitFor()

    await page.getByLabel("App-lock passphrase").fill(passphrase)
    await page.getByRole("button", { name: "Unlock Prompter" }).click()
    await page.locator('[data-testid="app-shell"]').waitFor({ state: "visible" })
    const focusDeadline = await page.evaluate(() => Date.now() + 61_000)
    await page.clock.setFixedTime(focusDeadline)
    await page.evaluate(() => window.dispatchEvent(new FocusEvent("focus")))
    await page.getByRole("main", { name: "Prompter locked" }).waitFor()

    await page.getByLabel("App-lock passphrase").fill(passphrase)
    await page.getByRole("button", { name: "Unlock Prompter" }).click()
    await page.locator('[data-testid="app-shell"]').waitFor({ state: "visible" })
    const visibilityDeadline = await page.evaluate(() => Date.now() + 61_000)
    await page.clock.setFixedTime(visibilityDeadline)
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")))
    await page.getByRole("main", { name: "Prompter locked" }).waitFor()

    const beforeCleanupEvents = await page.evaluate(() => {
      const audit = JSON.parse(document.documentElement.dataset["autoLockAudit"] ?? "{}")
      return audit.records.filter((record: { readonly removed: boolean }) => record.removed)
    })
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }))
      window.dispatchEvent(new PointerEvent("pointerdown"))
      window.dispatchEvent(new MouseEvent("mousemove"))
      window.dispatchEvent(new FocusEvent("focus"))
      document.dispatchEvent(new Event("visibilitychange"))
    })
    await page.clock.runFor(20)
    const removedListeners = await page.evaluate(() => {
      const audit = JSON.parse(document.documentElement.dataset["autoLockAudit"] ?? "{}")
      return audit.records.filter((record: { readonly removed: boolean }) => record.removed)
    })
    expect(removedListeners).toEqual(beforeCleanupEvents)
    expect(removedListeners).toMatchObject([
      { target: "window", type: "keydown" },
      { target: "window", type: "pointerdown" },
      { target: "window", type: "mousemove" },
      { target: "window", type: "focus" },
      { target: "document", type: "visibilitychange" },
      { target: "window", type: "keydown" },
      { target: "window", type: "pointerdown" },
      { target: "window", type: "mousemove" },
      { target: "window", type: "focus" },
      { target: "document", type: "visibilitychange" },
      { target: "window", type: "keydown" },
      { target: "window", type: "pointerdown" },
      { target: "window", type: "mousemove" },
      { target: "window", type: "focus" },
      { target: "document", type: "visibilitychange" },
    ])

    await closePrompter(app)
  } finally {
    await rm(userDataDirectory, { recursive: true, force: true })
  }
})
