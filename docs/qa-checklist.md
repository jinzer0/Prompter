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

- [ ] The app and DMG evidence roots each retain a separate sanitized `notarization-final.json`
       receipt with `Accepted` plus warning-free and error-free issues. The validator reads these
       final receipts directly, so active resume, log, attempt, and claim files are not required:

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
  /usr/sbin/spctl --assess --type open --context context:primary-signature --verbose=4 "${DMG_PATH}"
  ```

- [ ] The DMG mounts read-only and contains `Prompter.app`:

  ```bash
  /usr/bin/hdiutil attach -readonly -nobrowse -mountpoint "${MOUNT_DIR}" "${DMG_PATH}"
  test -d "${MOUNT_DIR}/Prompter.app"
  ```

- [ ] The app inside the mounted DMG has a valid stapled ticket, a strict valid signature, and
       passes Gatekeeper execute assessment:

   ```bash
   /usr/bin/xcrun stapler validate "${MOUNT_DIR}/Prompter.app"
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

## 현재 소스의 작업 공간·편집 수동 점검

아래는 현재 소스를 대상으로 수행할 절차이며 Stage 5 결과나 공개 v0.1.1 배포본의 동작 증거가
아니다. 실행한 환경·관찰 결과·실패/차단 사유는 별도로 기록하고 수행하지 않은 항목은 체크하지 않는다.
시각·행동 판정 기준은 [DESIGN](../DESIGN.md)과 [EXPERIENCE](ux/EXPERIENCE.md)를 따른다.
실패 주입은 격리된 테스트 데이터와 환경에서 수행하고 실제 라이브러리는 변경하지 않는다.

- [ ] Settings의 ‘화면 및 기본값’에서 light와 dark를 각각 선택·저장한다. shell, 패널, 입력,
      버튼, 대화상자, 잠금 화면에 적용되고 텍스트·placeholder·선택·초점이 읽히는지 확인한다.
- [ ] 테마 선택만으로는 저장한 테마가 바뀌지 않는지 확인하고, 각 선택을 저장한 뒤 앱을 재시작해
      선택값과 실제 화면이 유지되는지 확인한다. system을 저장한 상태에서는 macOS 테마를 직접
      전환해 실행 중 화면과 재시작 후 화면이 OS를 따르는지 확인한다.
- [ ] 새 창의 기본 크기 1180×760과 축소 한계 1024×720을 실제 macOS 프레임에서 확인한다.
      두 크기·양 테마에서 Library 세 열과 본문 우선 배치가 유지되고 shell 가로 스크롤 없이
      복사·저장에 접근 가능한지 확인한다. 긴 제목·본문·컴파일 추가 옵션과 확대/축소를 사용해
      줄바꿈·내부 세로 스크롤·키보드 접근이 주요 조작을 가리지 않는지 확인한다.
- [ ] 제목 막대의 빈 드래그 영역으로 창을 이동하고 native traffic lights를 조작한다.
      검색·본문·컴파일 요청에서 텍스트를 드래그 선택하고 입력·버튼·select를 조작했을 때
      창이 이동하지 않는지 확인한다.
- [ ] 프로젝트→검색/태그 필터→행 선택 후 컴파일 없이 본문을 편집한다. 앞뒤 공백·탭·개행을
      포함한 미저장 텍스트를 ‘복사’하고 다른 편집기에 붙여 넣어 정확히 일치하는지 확인한다.
      복사 전후 저장된 본문과 버전 수가 바뀌지 않는지 확인한다.
- [ ] ‘새 버전 저장’과 Cmd+S를 각각 사용해 같은 프롬프트에 버전이 한 번 추가되고 current가
      갱신되는지 확인한다. 변경 없는 반복 저장과 저장 중 반복 제출이 중복 버전을 만들지 않는지,
      저장 중 추가 입력은 덮어쓰지 않고 미저장으로 남는지 확인한다.
- [ ] 본문을 수정한 뒤 ‘복제하여 저장’에서 제목을 입력한다. 독립 프롬프트에 편집 스냅샷이
      저장되고 원본 본문·버전 이력이 그대로인지 확인한다. 생성 실패 시 원본 선택·초안 유지,
      저장 중 추가 입력 시 해당 초안을 잃지 않는지도 확인한다.
- [ ] 컴파일 결과를 생성해도 편집 본문·저장 버전이 바뀌지 않는지 확인한다. ‘편집에 적용’의
      dirty 교체 확인에서 취소하면 본문·preview가 유지되고, 적용하면 미저장 본문만 바뀌는지
      확인한다. 별도 저장 전까지 버전이 추가되지 않는지 확인한다.
- [ ] 미저장 본문으로 다른 프로젝트·프롬프트·이력을 각각 선택한다. Save/Discard/Cancel을
      각각 실행해 저장 성공 후 한 번만 이동, 현재 변경만 폐기 후 이동, 취소 후 기존 선택·초안
      유지를 확인한다. 초기 초점은 Cancel이고 Escape·취소 후 초점이 편집 위치로 복귀하는지 확인한다.
- [ ] 미저장 상태에서 native 빨간 닫기 버튼으로 같은 Save/Discard/Cancel 절차를 반복한다.
      Cancel/Escape는 창과 초안을 유지하고, Save 후 재시작하면 저장 본문이 남는지 확인한다.
- [ ] 격리 환경에서 저장 실패를 유도한 뒤 선택 전환·닫기의 Save를 실행한다. 오류·재시도·취소가
      남고 선택·초안·창이 유지되는지 확인한다. DB 저장 성공 후 목록/검색 갱신만 실패하는 경우에는
      저장 성공과 갱신 실패가 구분되고 갱신 재시도가 버전을 다시 만들지 않는지 확인한다.
- [ ] 미저장 본문을 남기고 앱을 잠근 뒤 native 닫기를 요청한다. 본문은 노출되지 않고
      Save/Discard가 차단되는지 확인한다. 취소·잠금 해제 후 같은 선택·초안이 돌아오는지 확인한다.
- [ ] 미저장 상태에서 Cmd+Q와 앱 메뉴의 Quit를 각각 실행하고 Cancel/Escape를 선택한다.
      앱이 종료되지 않고 창·초안이 유지되며 다시 종료를 요청해도 확인을 우회하지 않는지 확인한다.
      잠긴 상태에서도 종료 취소와 저장/버리기 차단을 확인한다.
- [ ] 선택·검색/필터·편집 본문·컴파일 요청/결과를 준비하고 Settings, Insights, Privacy Center,
      컨텍스트/템플릿/하네스 관리자를 열었다가 Library로 돌아온다. 단순 진입에는 저장 확인이 없고
      기존 맥락이 유지되는지 확인한다. 진입·복귀만으로 저장·적용·LLM·백업·검사·정리·파일/저장소
      스캔이 실행되지 않는지 확인한다. Insights 정보 순서는 유지하고 Privacy 검사는 명시적으로만 실행한다.
- [ ] 위 작업 공간에 미저장 본문을 보존한 채 native 닫기·Quit를 요청해 동일한 보호가 적용되는지
      확인한다. finding에서 다른 편집 대상으로 이동할 때는 선택 전환 보호를 확인한다.

## Keyboard And Menu

- [ ] CmdOrCtrl+N opens the new prompt flow when a project is selected.
- [ ] CmdOrCtrl+Shift+N opens the new project flow.
- [ ] CmdOrCtrl+F focuses the prompt search input when visible.
- [ ] CmdOrCtrl+S는 현재 Library 편집 대상의 변경을 새 current 버전으로 저장한다. 컴파일·복제를
      실행하지 않으며 대상이 없거나 변경이 없으면 새 버전을 만들지 않는다.
- [ ] CmdOrCtrl+Shift+C copies the current compiled prompt when available.
- [ ] CmdOrCtrl+Shift+V imports clipboard text through the app-focused quick capture flow.
- [ ] CmdOrCtrl+,로 별도 Settings 작업 공간을 열고 설정 영역에 초점이 가는지 확인한다.
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
