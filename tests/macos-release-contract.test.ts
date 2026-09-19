import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"

import { listFiles } from "./electron-contract-helpers"

describe("Electron shell contract", () => {
  it("defines macOS packaging scripts with native and migration safeguards", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
      readonly scripts?: Record<string, string>
      readonly version?: string
    }
    const [packageScript, releaseGuide, qaChecklist] = await Promise.all([
      readFile("scripts/package-macos.mjs", "utf8"),
      readFile("docs/release-macos.md", "utf8"),
      readFile("docs/qa-checklist.md", "utf8"),
    ])
    const zipTemplate = ["$", "{appName}-", "$", "{version}-mac-", "$", "{architecture}.zip"].join(
      "",
    )

    expect(packageJson.scripts?.["package"]).toBe("npm run build && node scripts/package-macos.mjs")
    expect(packageJson.scripts?.["make"]).toBe("npm run package")
    expect(packageJson.version).toBe("0.1.1")
    expect(packageJson.scripts?.["package:release:macos"]).toBe(
      "node scripts/macos/release-version-preflight.mjs && npm run build && node scripts/release-macos.mjs",
    )
    expect(releaseGuide).toContain("release-version-preflight.mjs")
    expect(releaseGuide).toContain("not trusted alone")
    expect(qaChecklist).toContain("submissionId")
    expect(qaChecklist).toContain("artifactKind")
    expect(qaChecklist).toContain("artifactSha256")
    expect(packageScript).toContain("com.jinzer0.prompter")
    expect(packageScript).toContain("Prompter.app")
    expect(packageScript).toContain(zipTemplate)
    expect(packageScript).toContain("CFBundleExecutable")
    expect(packageScript).toContain('join(appPath, "Contents", "MacOS", appName)')
    expect(packageScript).toContain("better-sqlite3")
    expect(packageScript).toContain("drizzle")
    expect(packageScript).toContain("unsigned")
    expect(packageScript).toContain("Missing required release input")
    expect(packageScript).not.toContain('replaceAll("Electron", appName)')
  })

  it("keeps Apple release credentials outside renderer, preload, and IPC surfaces", async () => {
    const rendererFiles = await listFiles("renderer/src")
    const rendererSource = (
      await Promise.all(rendererFiles.map((path) => readFile(path, "utf8")))
    ).join("\n")
    const bridgeAndContract = await Promise.all([
      readFile("electron/bridge.ts", "utf8"),
      readFile("electron/bridge-types.ts", "utf8"),
      readFile("electron/ipc-contract.ts", "utf8"),
      readFile("electron/preload.ts", "utf8"),
    ])
    const appleIdFlag = ["--apple", "-id"].join("")
    const forbidden = new RegExp(
      `PROMPTER_(SIGNING_IDENTITY|NOTARY_PROFILE)|notarytool|keychain-profile|${appleIdFlag}|codesign`,
      "u",
    )

    expect(rendererSource).not.toMatch(forbidden)
    expect(bridgeAndContract.join("\n")).not.toMatch(forbidden)
    expect(bridgeAndContract.join("\n")).not.toContain("appleCredentials")
  })
})
