# Prompter QA Checklist

Use this checklist after Phase 10 and later release-candidate changes before packaging.

## Automated Gates

- [ ] `npm run typecheck` exits 0.
- [ ] `npm run lint` exits 0.
- [ ] `npm test` exits 0.
- [ ] `npm run build` exits 0.
- [ ] `npm run package` creates `release/Prompter-darwin-${process.arch}/Prompter.app`.
- [ ] `npm run package` creates `release/Prompter-0.1.1-mac-${process.arch}.zip`.
- [ ] Packaged `Prompter.app` opens without a missing-executable error.
- [ ] `npm run test:smoke` exits 0, or the exact blocker is recorded.

## Signed macOS Release Checks

Run the pre-release checks below before the maintainer signed command on ARM64 macOS. Run the
post-release checks only after `npm run package:release:macos` completes successfully.

Prepare local path variables without embedding secrets:

```bash
RELEASE_DIR="release/v0.1.1"
```

- [ ] The version-specific candidate directory is absent before the release starts:

  ```bash
  test ! -e "${RELEASE_DIR}"
  ```

- [ ] Full Xcode is selected and visible to the active shell:

  ```bash
  /usr/bin/xcode-select -p
  /usr/bin/xcodebuild -version
  ```

- [ ] Required release variables are present without printing their values:

  ```bash
  : "${PROMPTER_SIGNING_IDENTITY:?PROMPTER_SIGNING_IDENTITY is required}"
  : "${PROMPTER_NOTARY_PROFILE:?PROMPTER_NOTARY_PROFILE is required}"
  test -n "${PROMPTER_SIGNING_IDENTITY}"
  test -n "${PROMPTER_NOTARY_PROFILE}"
  ```

- [ ] The Keychain is unlocked and exactly one signing identity is available:

  ```bash
  /usr/bin/security show-keychain-info
  /usr/bin/security find-identity -v -p codesigning
  ```

- [ ] The named notary profile can complete its connectivity preflight:

  ```bash
  /usr/bin/xcrun notarytool history --keychain-profile "${PROMPTER_NOTARY_PROFILE}" --output-format json
  ```

- [ ] Unsigned local packaging and signed release scripts map to the approved commands:

  ```bash
  node --input-type=module <<'NODE'
  import { readFile } from "node:fs/promises"

  const { scripts } = JSON.parse(await readFile("package.json", "utf8"))
  const expected = {
    package: "npm run build && node scripts/package-macos.mjs",
    make: "npm run package",
    "package:release:macos": "node scripts/macos/release-version-preflight.mjs && npm run build && node scripts/release-macos.mjs",
  }
  for (const [name, command] of Object.entries(expected)) {
    if (scripts?.[name] !== command) throw new Error(`Unexpected script: ${name}`)
  }
  NODE
  ```

- [ ] Run the signed command only after the preceding absence and preflight checks pass:

  ```bash
  npm run package:release:macos
  ```

## Signed macOS Post-Release Checks

Prepare artifact paths only after the signed command succeeds:

```bash
ZIP_PATH="${RELEASE_DIR}/Prompter-0.1.1-mac-arm64.zip"
DMG_PATH="${RELEASE_DIR}/Prompter-0.1.1-mac-arm64.dmg"
CHECKSUM_PATH="${RELEASE_DIR}/SHA256SUMS"
EXTRACT_DIR="$(mktemp -d)"
MOUNT_DIR="$(mktemp -d)"
```

- [ ] The release candidate contains only the approved final files:

  ```bash
  node --input-type=module <<'NODE'
  import { readdir } from "node:fs/promises"

  const expected = [
    "Prompter-0.1.1-mac-arm64.dmg",
    "Prompter-0.1.1-mac-arm64.zip",
    "SHA256SUMS",
  ]
  const actual = (await readdir("release/v0.1.1")).sort()
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Unexpected release candidate allowlist: ${actual.join(",")}`)
  }
  NODE
  ```

  Expected files are `Prompter-0.1.1-mac-arm64.zip`,
  `Prompter-0.1.1-mac-arm64.dmg`, and `SHA256SUMS`.

- [ ] The app notarization evidence and DMG notarization evidence are separate, sanitized, and
       show `Accepted` plus warning-free and error-free log receipts:

  The shared validator verifies matching `submissionId`, `artifactKind`, and `artifactSha256`
  fields rather than duplicating the final-evidence schema in this checklist.

  ```bash
  node --input-type=module <<'NODE'
  import { validateFinalNotarizationEvidence } from "./scripts/macos/notarization-evidence.mjs"

  const roots = [
    [".omo/evidence/release-macos/v0.1.1/app", "app"],
    [".omo/evidence/release-macos/v0.1.1/dmg", "dmg"],
  ]

  for (const [root, artifactKind] of roots) {
    await validateFinalNotarizationEvidence({ evidenceDir: root, artifactKind })
  }
  NODE
  ```

- [ ] The final ZIP extracts cleanly and the contained app has a strict valid signature:

  ```bash
  /usr/bin/ditto -x -k "${ZIP_PATH}" "${EXTRACT_DIR}"
  /usr/bin/codesign --verify --deep --strict "${EXTRACT_DIR}/Prompter.app"
  ```

- [ ] The extracted app has a valid stapled ticket and passes Gatekeeper execute assessment:

  ```bash
  /usr/bin/xcrun stapler validate "${EXTRACT_DIR}/Prompter.app"
  /usr/sbin/spctl --assess --type execute --verbose=4 "${EXTRACT_DIR}/Prompter.app"
  ```

- [ ] The DMG image verifies, has a strict valid signature, has a valid stapled ticket, and passes
      Gatekeeper open assessment:

  ```bash
  /usr/bin/hdiutil verify "${DMG_PATH}"
  /usr/bin/codesign --verify --strict "${DMG_PATH}"
  /usr/bin/xcrun stapler validate "${DMG_PATH}"
  /usr/sbin/spctl --assess --type open --verbose=4 "${DMG_PATH}"
  ```

- [ ] The DMG mounts read-only and contains `Prompter.app`:

  ```bash
  /usr/bin/hdiutil attach -readonly -nobrowse -mountpoint "${MOUNT_DIR}" "${DMG_PATH}"
  test -d "${MOUNT_DIR}/Prompter.app"
  ```

- [ ] The app inside the mounted DMG has a strict valid signature and passes Gatekeeper execute
      assessment:

  ```bash
  /usr/bin/codesign --verify --deep --strict "${MOUNT_DIR}/Prompter.app"
  /usr/sbin/spctl --assess --type execute --verbose=4 "${MOUNT_DIR}/Prompter.app"
  /usr/bin/hdiutil detach "${MOUNT_DIR}"
  ```

- [ ] The packaged app plist maps to the expected bundle identity and version:

  ```bash
  /usr/bin/plutil -p "${EXTRACT_DIR}/Prompter.app/Contents/Info.plist"
  ```

  Confirm `CFBundleIdentifier` is `com.jinzer0.prompter`, `CFBundleShortVersionString` is
  `0.1.1`, and `CFBundleVersion` is `0.1.1`.

- [ ] The checksum file verifies after all signature, notary, staple, Gatekeeper, extract, and
      mount checks pass:

  ```bash
  (cd "${RELEASE_DIR}" && /usr/bin/shasum -a 256 -c "SHA256SUMS")
  ```

- [ ] The extracted app smoke-opens from the signed artifact:

  ```bash
  /usr/bin/open -n "${EXTRACT_DIR}/Prompter.app"
  ```

- [ ] If any signed release check fails, no GitHub Release, tag, upload, public README update, or
      partial asset allowlist is created. Immutable tags are never rewritten.

  ```bash
  if rg -n 'gh[[:space:]]+release|git[[:space:]]+tag|release create|release upload' \
    scripts/release-macos.mjs package.json
  then
    exit 1
  fi
  ```

## Manual App Flow

- [ ] App starts in development mode.
- [ ] Project can be created.
- [ ] Existing project can be selected.
- [ ] Prompt can be created manually.
- [ ] Static template compile produces compiled prompt content.
- [ ] LLM analyze shows clarification state when configured with a test client or valid key.
- [ ] LLM compile produces required compiled prompt sections when configured.
- [ ] Compiled prompt can be saved as a PromptAsset and PromptVersion.
- [ ] Existing prompt can receive a new version.
- [ ] Current version can be changed.
- [ ] Version diff displays added, removed, and unchanged lines.
- [ ] Search returns matching prompts.
- [ ] Empty search shows a no-results state.
- [ ] Tag can be created.
- [ ] Tag can be attached and detached.
- [ ] Suggested tags from compiler flow can be saved.
- [ ] Export preview, copy, and file save work for supported formats.
- [ ] Clipboard text can be imported into Prompt Compiler Original request from the button.
- [ ] Empty clipboard import leaves the existing draft unchanged and shows a clear message.
- [ ] Importing different clipboard text over an existing draft requires confirmation.
- [ ] Cancelling clipboard overwrite preserves the existing draft.
- [ ] Confirming clipboard overwrite replaces only Original request and resets stale compiled output.
- [ ] Very long clipboard text imports in full and shows the long-text warning.
- [ ] Settings defaults save and reload.
- [ ] OpenAI API key can be saved, masked, and deleted.
- [ ] App restart preserves projects, prompts, versions, tags, and settings.

## Keyboard And Menu

- [ ] CmdOrCtrl+N opens the new prompt flow when a project is selected.
- [ ] CmdOrCtrl+Shift+N opens the new project flow.
- [ ] CmdOrCtrl+F focuses the prompt search input when visible.
- [ ] CmdOrCtrl+S saves the current compiled prompt when available.
- [ ] CmdOrCtrl+Shift+C copies the current compiled prompt when available.
- [ ] CmdOrCtrl+Shift+V imports clipboard text through the app-focused quick capture flow.
- [ ] CmdOrCtrl+, focuses the settings panel.
- [ ] File -> Quick Capture from Clipboard follows the same import flow as the button.
- [ ] Esc or close action does not corrupt unsaved form state.
- [ ] Development-only Reload and Toggle Developer Tools are absent from production menu templates.

## Security And Scope

- [ ] Renderer does not import Electron, Node filesystem/path/process APIs, SQLite, Drizzle, or safeStorage.
- [ ] Renderer does not access `ipcRenderer` directly.
- [ ] Renderer does not access `navigator.clipboard`; clipboard import goes through the typed bridge.
- [ ] BrowserWindow keeps `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.
- [ ] Raw OpenAI API key is not visible in renderer state, logs, exports, settings rows, or screenshots.
- [ ] Clipboard import does not auto-run LLM analysis/compile, save prompts, export files, rebuild search, update settings, read secrets, or log clipboard content.
- [ ] Exported content does not include API keys or secret file paths.
- [ ] Packaged app uses Electron `userData` for `prompter.sqlite`.
- [ ] Packaged app can find Drizzle migration files.
- [ ] No `prompt_runs`, `agent_runs`, `execution_results`, `validation_results`, or `run_logs` table/data exists.
- [ ] No prompt execution, external-agent launch, cloud sync, account, vector search, embedding, plugin, or team-collaboration feature was added.
- [ ] Signed release docs and evidence name only `PROMPTER_SIGNING_IDENTITY` and
      `PROMPTER_NOTARY_PROFILE` as variable names and contain no credential values, private-key
      blocks, local key paths, Apple account values, password values, or full environment dumps.
- [ ] `.gitignore` contains exactly the narrow Apple secret artifact patterns `AuthKey_*.p8`,
      `*.p12`, and `*.mobileprovision`, with no broad key ignore.

## Attribution

Created with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent).
