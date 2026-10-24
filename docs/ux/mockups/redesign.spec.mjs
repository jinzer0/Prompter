import assert from "node:assert/strict"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

// Run from the browser tool: verifyMockups(page, absoluteEvidenceDir, () => tab.observe()).
// This verifies the isolated HTML presentation, never the Electron product or native frame.
export async function verifyMockups(page, evidenceDir, observe) {
  assert(evidenceDir.startsWith("/"), "Use an absolute external evidence directory")
  await mkdir(evidenceDir, { recursive: true })
  const directory = dirname(fileURLToPath(import.meta.url))
  const steps = []
  const errors = []
  const requests = []
  const onError = (error) => errors.push(String(error))
  const onRequest = (request) => requests.push(request.url())
  page.on("pageerror", onError)
  page.on("request", onRequest)
  const step = (action, result) => steps.push({ action, status: "passed", result })
  const select = async (id, value) => {
    await page.select(id, value)
    assert.equal(await page.$eval(id, (el) => el.value), value)
  }
  const compactLayout = () =>
    page.evaluate(() => {
      const properties = {
        ".app": ["gridTemplateColumns"],
        ".library": ["gridTemplateColumns", "gap", "padding"],
        ".editor-surface": ["padding"],
        ".editor-heading h1": ["fontSize"],
        ".windowbar": ["padding"],
        ".supporting": ["padding"],
      }
      return Object.fromEntries(
        Object.entries(properties).map(([selector, keys]) => {
          const element = document.querySelector(selector)
          const style = element && getComputedStyle(element)
          return [selector, style ? keys.map((key) => style[key]) : null]
        }),
      )
    })
  const capture = async (name, selector = ".app") => {
    await observe()
    const element = await page.$(selector)
    assert(element)
    const path = join(evidenceDir, `${name}.png`)
    await element.screenshot({ path })
    step("screenshot", { path, selector })
  }
  const color = (value) =>
    value
      .match(/[\d.]+/g)
      .slice(0, 3)
      .map(Number)
  const luminance = (rgb) =>
    rgb
      .map((v) => {
        const s = v / 255
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
      })
      .reduce((v, c, i) => v + c * [0.2126, 0.7152, 0.0722][i], 0)
  const ratio = (a, b) => {
    const l = [luminance(color(a)), luminance(color(b))].sort((x, y) => y - x)
    return (l[0] + 0.05) / (l[1] + 0.05)
  }
  try {
    for (const view of ["library", "settings"]) {
      for (const theme of ["light", "dark"]) {
        for (const [size, width, height] of [
          ["default", 1180, 760],
          ["minimum", 1024, 720],
        ]) {
          await page.setViewport({ width, height: height + 130, deviceScaleFactor: 1 })
          const url = `${pathToFileURL(join(directory, `redesign-${view}.html`))}?theme=${theme}&size=${size}`
          await page.goto(url, { waitUntil: "load" })
          await page.waitForSelector(".app")
          const layout = await page.evaluate(() => {
            const app = document.querySelector(".app")
            const bounds = app.getBoundingClientRect()
            const nodes = [".sidebar", ".prompt-list", ".editor-surface", ".compiler-surface"]
            return {
              width: bounds.width,
              height: bounds.height,
              overflow: app.scrollWidth > app.clientWidth,
              pageOverflow: document.documentElement.scrollWidth > innerWidth,
              theme: document.documentElement.dataset.theme,
              panels: nodes.map((s) => {
                const el = document.querySelector(s)
                const r = el?.getBoundingClientRect()
                return {
                  selector: s,
                  visible: Boolean(r?.width && r?.height),
                  within: r ? r.right <= bounds.right + 1 && r.bottom <= bounds.bottom + 1 : false,
                  height: r?.height,
                }
              }),
              editorFont: document.querySelector(".editor-text")
                ? getComputedStyle(document.querySelector(".editor-text")).fontSize
                : null,
            }
          })
          assert.equal(layout.width, width)
          assert.equal(layout.height, height)
          assert.equal(layout.theme, theme)
          assert.equal(layout.overflow, false)
          assert.equal(layout.pageOverflow, false)
          if (view === "library") {
            assert(layout.panels.every((p) => p.visible && p.within))
            assert(layout.panels[2].height > layout.panels[3].height)
            assert.equal(layout.editorFont, "14px")
          }
          if (size === "minimum") {
            const narrowMinimum = await compactLayout()
            await select("#review-size", "default")
            assert.deepEqual(await compactLayout(), narrowMinimum)
            await page.setViewport({ width: 1400, height: height + 130, deviceScaleFactor: 1 })
            await select("#review-size", "minimum")
            assert.equal(await page.evaluate(() => innerWidth), 1400)
            assert.equal(await page.$eval(".app", (el) => el.getBoundingClientRect().width), 1024)
            assert.deepEqual(await compactLayout(), narrowMinimum)
            assert.equal(await page.$eval(".app", (el) => el.scrollWidth > el.clientWidth), false)
            assert.equal(
              await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
              false,
            )
            await page.setViewport({ width, height: height + 130, deviceScaleFactor: 1 })
          }
          const pairs = await page.evaluate(() => {
            const resolve = (variable) => {
              const s = document.createElement("span")
              s.style.color = `var(${variable})`
              document.body.append(s)
              const c = getComputedStyle(s).color
              s.remove()
              return c
            }
            return [
              ["--ink", "--surface"],
              ["--secondary", "--surface"],
              ["--secondary", "--sidebar"],
              ["--accent", "--on-accent"],
              ["--accent", "--tint"],
              ["--danger", "--surface"],
            ].map(([a, b]) => ({ a, b, foreground: resolve(a), background: resolve(b) }))
          })
          const contrast = pairs.map((p) => ({ ...p, ratio: ratio(p.foreground, p.background) }))
          assert(
            contrast.every((p) => p.ratio >= 4.5),
            JSON.stringify(contrast),
          )
          step("layout-and-contrast", { view, size, theme, layout, contrast })
          await capture(`${view}-${theme}-${size}`)
        }
      }
    }
    // Back at the smallest view: preserve textarea values across supporting navigation.
    await page.click('[data-action="navigate"][data-view="library"]')
    await page.$eval("#prompt-body", (el) => {
      el.value += "\n검증용 초안"
      el.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await page.$eval("#compiler-request", (el) => {
      el.value = "검증용 별도 요청"
      el.dispatchEvent(new Event("input", { bubbles: true }))
    })
    for (const view of ["settings", "insights", "privacy", "managers", "library"]) {
      await page.click(`[data-action="navigate"][data-view="${view}"]`)
      assert(await page.$(".sidebar"))
    }
    assert((await page.$eval("#prompt-body", (el) => el.value)).includes("검증용 초안"))
    assert.equal(await page.$eval("#compiler-request", (el) => el.value), "검증용 별도 요청")
    step("draft-roundtrip", {
      views: ["settings", "insights", "privacy", "managers", "library"],
      bodyAndRequestPreserved: true,
    })
    // More menu: named destinations, arrow navigation, escape and focus restoration.
    await page.click('[data-action="more"]')
    const menuNames = ["복제하여 저장", "버전 이력 · 비교", "태그 관리", "내보내기", "품질 검토"]
    assert.deepEqual(
      await page.$$eval('#more-menu [role="menuitem"]', (items) =>
        items.map((el) => el.textContent),
      ),
      menuNames,
    )
    assert.equal(
      await page.$eval('[data-action="more"]', (el) => el.getAttribute("aria-expanded")),
      "true",
    )
    await page.keyboard.press("ArrowDown")
    assert.equal(await page.evaluate(() => document.activeElement.textContent), menuNames[1])
    await page.keyboard.press("ArrowUp")
    assert.equal(await page.evaluate(() => document.activeElement.textContent), menuNames[0])
    await page.keyboard.press("ArrowUp")
    assert.equal(await page.evaluate(() => document.activeElement.textContent), menuNames[4])
    await page.keyboard.press("Home")
    assert.equal(await page.evaluate(() => document.activeElement.textContent), menuNames[0])
    await page.keyboard.press("End")
    assert.equal(await page.evaluate(() => document.activeElement.textContent), "품질 검토")
    await capture("library-more-menu")
    await page.keyboard.press("Escape")
    assert.equal(await page.$eval("#more-menu", (el) => el.hidden), true)
    assert.equal(await page.evaluate(() => document.activeElement.dataset.action), "more")
    const assertMenuClosed = async () => {
      assert.equal(await page.$eval("#more-menu", (el) => el.hidden), true)
      assert.equal(
        await page.$eval('[data-action="more"]', (el) => el.getAttribute("aria-expanded")),
        "false",
      )
    }
    await assertMenuClosed()
    for (const leave of ["click", "focus", "tab"]) {
      await page.click('[data-action="more"]')
      if (leave === "click") await page.click("#prompt-body")
      else if (leave === "focus") await page.focus("#prompt-body")
      else await page.keyboard.press("Tab")
      await assertMenuClosed()
      assert.equal(await page.evaluate(() => document.activeElement.id), "prompt-body")
      for (const key of ["ArrowDown", "ArrowUp", "Home", "End"]) {
        await page.keyboard.press(key)
        assert.equal(await page.evaluate(() => document.activeElement.id), "prompt-body")
      }
    }
    await page.click('[data-action="more"]')
    await page.click(".editor-heading h1")
    await assertMenuClosed()
    await page.click('[data-action="more"]')
    await page.click('[data-action="more"]')
    await assertMenuClosed()
    await page.click('[data-action="more"]')
    await page.focus("#review-state")
    await assertMenuClosed()
    await page.keyboard.press("Home")
    assert.equal(await page.evaluate(() => document.activeElement.id), "review-state")
    await page.click('[data-action="more"]')
    await page.click('#more-menu [role="menuitem"]')
    await assertMenuClosed()
    assert.equal(await page.$eval("#mock-dialog", (el) => el.open), true)
    await page.keyboard.press("Home")
    assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest("dialog"))), true)
    await page.keyboard.press("Escape")
    step("menu-keyboard", {
      destinations: menuNames.length,
      names: menuNames,
      endKey: "품질 검토",
      escapeRestoresFocus: true,
      outsideClickAndFocusDismiss: true,
      editorSelectAndDialogKeysNotCaptured: true,
    })
    // Long input remains internal, including characters that must never become HTML.
    const adversarial = `<img src=x onerror="alert(1)">\n${"긴본문 ".repeat(4000)}`
    await page.$eval(
      "#prompt-body",
      (el, text) => {
        el.value = text
        el.dispatchEvent(new Event("input", { bubbles: true }))
      },
      adversarial,
    )
    await page.click('[data-action="navigate"][data-view="settings"]')
    await page.click('[data-action="navigate"][data-view="library"]')
    assert.equal(await page.$eval("#prompt-body", (el) => el.value), adversarial)
    assert.equal(await page.$eval(".app", (el) => el.scrollWidth > el.clientWidth), false)
    assert.equal(await page.$$("img").then((els) => els.length), 0)
    step("long-untrusted-text", {
      characters: adversarial.length,
      retainedAsText: true,
      noHorizontalOverflow: true,
    })
    await page.click(".compiler-options summary")
    assert.equal(await page.$eval(".compiler-options", (el) => el.open), true)
    await page.click('[data-action="preview"]')
    assert.equal(await page.$eval("#mock-dialog", (el) => el.open), true)
    await page.click('[data-action="apply-example"]')
    assert.equal(await page.$eval("#dialog-title", (el) => el.textContent), "편집 내용을 바꿀까요?")
    await page.keyboard.press("Escape")
    assert.equal(await page.$eval("#prompt-body", (el) => el.value), adversarial)
    step("dirty-preview-cancel", { confirmationVisible: true, originalRetained: true })
    await select("#review-state", "unsaved")
    assert.equal(await page.evaluate(() => document.activeElement.textContent), "취소")
    await capture("unsaved-dialog", "body")
    await page.keyboard.press("Tab")
    await page.keyboard.press("Tab")
    await page.keyboard.press("Tab")
    assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest("dialog"))), true)
    await page.keyboard.press("Escape")
    assert.equal(await page.evaluate(() => document.activeElement.id), "review-state")
    step("dialog-keyboard", {
      cancelInitialFocus: true,
      tabContained: true,
      escapeRestoredFocus: true,
    })
    for (const sample of ["empty", "loading", "error"]) {
      await select("#review-state", sample)
      assert(await page.$(".empty-state"))
      assert(await page.$(".compiler-surface"))
      assert.equal(await page.$eval(".app", (el) => el.scrollWidth > el.clientWidth), false)
      await capture(`library-state-${sample}`)
      step("common-state", { sample, compilerRetained: true })
    }
    await select("#review-state", "locked")
    assert(await page.$(".lock-screen"))
    assert.equal(await page.$(".sidebar"), null)
    assert.equal(await page.$("#prompt-body"), null)
    await capture("locked-state")
    step("locked-concealment", { sidebarAbsent: true, bodyAbsent: true })
    await select("#review-state", "default")
    await page.$eval(".list-search", (el) => {
      el.value = "결과없는입력<script>"
      el.dispatchEvent(new Event("input", { bubbles: true }))
    })
    assert.equal(await page.$eval(".search-empty", (el) => el.hidden), false)
    step("no-search-results", { visibleMessage: true })
    await page.click('[data-action="board"]')
    assert.equal(await page.$eval("#reference-board", (el) => el.hidden), false)
    const coverage = await page.$eval("#reference-board table", (table) =>
      [...table.tBodies[0].rows].map((row) => row.cells[0].textContent),
    )
    assert.deepEqual(coverage, [
      "창 · 탐색",
      "Library · 본문 · 더보기",
      "컴파일러",
      "Settings",
      "프로젝트·컨텍스트·템플릿·하네스",
      "버전 · 태그 · 내보내기 · 품질",
      "Insights",
      "Privacy Center",
      "잠금",
      "대화상자 · 공통 상태",
    ])
    step("coverage-and-tokens", {
      coverageRows: coverage.length,
      surfaces: coverage,
      boardVisible: true,
    })
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }])
    await select("#review-theme", "system")
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark")
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }])
    await page.waitForFunction(() => document.documentElement.dataset.theme === "light")
    step("system-theme", { darkAndLightFollowed: true })
    assert.equal(errors.length, 0, errors.join("\n"))
    assert(
      requests.every((url) => url.startsWith("file:") || url.startsWith("data:")),
      JSON.stringify(requests),
    )
    step("isolation", {
      pageErrors: errors.length,
      externalRequests: 0,
      productExecution: "not tested/not implemented",
    })
    const transcript = {
      schemaVersion: 1,
      kind: "browser-automation",
      tool: "Chromium/Puppeteer",
      surface: "web",
      status: "passed",
      steps,
      errors,
      requests,
    }
    const transcriptPath = join(evidenceDir, "automation-transcript.json")
    await writeFile(transcriptPath, JSON.stringify(transcript, null, 2))
    return {
      status: "passed",
      checks: steps.length,
      transcriptPath,
      evidenceDir,
      note: "Static mockups only, not native Electron validation or user design approval",
    }
  } finally {
    page.off("pageerror", onError)
    page.off("request", onRequest)
    await page.emulateMediaFeatures([])
  }
}
