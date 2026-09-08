# Prompter v0.1.1 Developer ID 서명 및 Notarization 구현계획서

수행계획서: [`task_m011_6.md`](task_m011_6.md)
GitHub Issue: [#6](https://github.com/jinzer0/Prompter/issues/6)
종속 릴리스 Issue: [#7](https://github.com/jinzer0/Prompter/issues/7)
마일스톤: M011
기준 소스: `origin/master`의 `85aef3c17731d4653d673edd18391610f5491943`

## 단계 개요

| Stage | Prometheus Todo | 제목 | 주요 산출 | 검증 |
|---|---|---|---|---|
| 1 | 2 | v0.1.1 패키징 정체성과 unsigned 경계 확립 | `package.json`, `package-lock.json`, `scripts/package-macos.mjs` | 기존 테스트, ESM 구문, unsigned 경로와 이름 계약 |
| 2 | 3–4 | Developer ID 서명과 Keychain Notarization 기반 구현 | `scripts/macos/entitlements.plist`, `scripts/macos/signing.mjs`, `scripts/macos/notarization.mjs` | plist, export/import, fake runner, fail-closed 및 redaction |
| 3 | 5 | 이중 제출 릴리스 코디네이터 통합 | `scripts/release-macos.mjs` | injected full trace, 선행 검사, 순서, cleanup, 게시 명령 부재 |
| 4 | 6–7 | tests-after 회귀 테스트와 유지관리자 문서 확정 | 패키징/서명/Notarization 테스트, `.gitignore`, `docs/`, `README.md` | focused Vitest, secret/protected-path 및 문서-명령 대응 검사 |
| 5 | 8 | 통합 검증, 보고, 리뷰와 구현 병합 | Stage 보고서, 최종 보고서, orders, implementation PR | 전체 품질 게이트, unsigned 실사용, signed fail-closed, 원격 PR 검증 |
| 6 | 8 | pre-PR review blocker 교정과 재검증 | macOS release scripts, focused tests, Stage 6 보고서, 최종 보고서 갱신 | blocker 7건 교정, full validation, fresh review 통과 전 PR 차단 |
| 6.2 | 8 | failed fresh review blocker 교정 addendum | Stage 6.2 governance, release pre-build validator, helper ownership, tests/docs/evidence 갱신 | fresh blocker 전건 교정, checked-in regression matrix, five-lane PASS 전 closure 차단 |
| 6.3 | 8 | latest fresh-review failure 교정 addendum | Stage 6.3 governance, alias provenance, candidate ownership, state-machine/schema regressions | code-quality blocker 2건과 regression gap 전건 교정, fresh five-lane PASS 전 closure 차단 |
| 6.4 | 8 | latest failed fresh-review 교정 addendum | Stage 6.4 governance, Electron 43 alias/version binding, preflight-before-candidate ordering, pending-state/schema regressions | five-lane FAIL blocker 전건 교정, direct security review 포함 fresh five-lane PASS 전 closure 차단 |
| 6.5 | 8 | latest fresh review blocker 교정 addendum | Stage 6.5 governance, arbitrary framework alias rejection, Notarization severity fail-closed regressions | blocker 2건 교정, fresh five-lane direct reproduction PASS 전 closure 차단 |

## 구현 전 공통 기준

### 승인 및 baseline characterization

이 구현계획서가 명시적으로 승인된 뒤에만 다음 순서로 진행한다.

1. 현재 governance 산출물을 먼저 고정한다.
   - `mydocs/orders/20260908.md`와 `mydocs/plans/task_m011_6.md`를
     `Task #6: 수행 계획서 작성과 오늘할일 갱신`으로 커밋한다.
   - `mydocs/plans/task_m011_6_impl.md`를 `Task #6: 구현 계획서 작성`으로 커밋한다.
2. 아래 baseline 명령의 결과를 Stage 1 evidence에 보존한 뒤 제품 파일을 수정한다.

```bash
GIT_MASTER=1 git status --short --branch
GIT_MASTER=1 git rev-parse HEAD
GIT_MASTER=1 git rev-parse origin/master
npm test -- tests/package-macos.test.mjs tests/electron-contract.test.ts
npm run typecheck
GIT_MASTER=1 git diff --check
```

- baseline 실패는 기존 실패인지 현재 task 영향인지 분류하고, 원인이 불명확하면 Stage 1을
  시작하지 않는다.
- Prometheus의 tests-after 지시에 따라 Stage 1–3에서는 제품 모듈과 runner seam을 먼저
  구현하되 기존 테스트와 import/fixture smoke로 회귀를 막는다. 신규 및 확장 회귀 테스트는
  Stage 4에서 추가하며, 실패하는 새 테스트를 삭제하거나 완화하지 않는다.
- 각 Stage는 검증 통과 후 `mydocs/working/task_m011_6_stage{N}.md`를 작성하고 해당 Stage
  산출물과 함께 커밋한다. 다음 Stage는 단계 보고서 검토와 명시적 승인 후에만 시작한다.

### 공통 injected-runner 계약

- 새 운영 모듈의 모든 외부 프로세스 호출은 shell 문자열이 아니라
  `runFile(command, args, options)` seam을 사용한다.
- `command`는 실행 파일 이름, `args`는 문자열 배열, `options`는 최소 `cwd`, `timeoutMs`,
  `signal`을 선택적으로 갖는 객체다. 기본 adapter는 `node:child_process.execFile` 기반으로
  구현하고 shell을 사용하지 않는다.
- 성공 결과는 `{ stdout, stderr }`, 실패는 exit code/signal과 정제된 메시지를 가진
  `Error`로 통일한다. raw 환경 객체, Keychain profile 값, identity 원문을 로그나 evidence에
  직렬화하지 않는다.
- 테스트는 같은 seam에 deterministic fake runner를 주입해 호출 순서, argv, 반환 JSON,
  delay, signal, throw 지점을 제어한다. 실제 `codesign`, `security`, `xcrun`, `hdiutil`,
  `spctl`, Apple endpoint, GitHub release API는 구현 이슈 #6 테스트에서 호출하지 않는다.
- 파일시스템 cleanup 검증은 task가 만든 임시 루트와 version-specific candidate 경로만
  대상으로 하고 사용자 경로나 기존 산출물을 삭제하지 않는다.

### 공통 보안 및 보호 경계

- 허용되는 설정 이름은 `PROMPTER_SIGNING_IDENTITY`와 `PROMPTER_NOTARY_PROFILE`뿐이며,
  값, 인증서 식별 세부, key path/content, Apple ID/password/API key를 출력하거나 추적하지 않는다.
- Notarization은 `--keychain-profile`만 허용하고 Apple ID/password/API-key argv와 plaintext
  credential 파일 입력을 받지 않는다.
- `.gitignore`에는 `AuthKey_*.p8`, `*.p12`, `*.mobileprovision`만 추가하고 broad `*.key`는
  추가하지 않는다.
- `docs/plan/**`, `docs/draft/**`, `.omo/boulder.json`, Prometheus 계획 체크박스는 보호
  대상으로 모든 Stage에서 수정 금지다.
- generated app, ZIP, DMG, mount, submission archive, Notarization log와 `.omo/evidence/**`는
  커밋하지 않는다.
- 실제 서명, Notarization 제출, `git tag`, `gh release`, public/draft release 생성 및 게시,
  release asset 업로드는 구현 이슈 #6에서 제외하고 이슈 #7의 별도 승인 뒤에만 실행한다.

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| 유지관리자 릴리스 문서 | `docs/` | `docs/release-macos.md` | OK | 제품별 공식 릴리스 운영 계약 |
| 릴리스 QA 기준 | `docs/` | `docs/qa-checklist.md` | OK | 반복 실행하는 공식 QA 기준 |
| 사용자/기여자 안내 | 저장소 루트 | `README.md` | OK | 기존 설치 및 패키징 진실 원천 유지 |
| 구현계획서 | `mydocs/` | `mydocs/plans/task_m011_6_impl.md` | OK | 내부 승인 산출물 |
| 단계 보고서 | `mydocs/` | `mydocs/working/task_m011_6_stage{1..6}.md` | OK | Stage별 내부 증거와 승인 경계 |
| 최종 보고서 | `mydocs/` | `mydocs/report/task_m011_6_report.md` | OK | PR 전 최종 승인 산출물 |
| 보호 계획/초안 | 수정 금지 | `docs/plan/**`, `docs/draft/**` | OK | 읽기 전용 근거로만 사용 |

## Stage 1 — v0.1.1 패키징 정체성과 unsigned 경계 확립

Prometheus Todo 2를 수행한다.

### 산출물

신규:

- `mydocs/working/task_m011_6_stage1.md` (검증 통과 후)

수정:

- `package.json`
- `package-lock.json`
- `scripts/package-macos.mjs`

Evidence:

- `.omo/evidence/task-2-apple-developer-id-notarization-release.txt` (ignored, sanitized)

### 변경 내용

- `package.json`과 `package-lock.json` root package version을 정확히 `0.1.1`로 맞춘다.
- `scripts/package-macos.mjs`에서 `assembleMacOSApp`, injected-runner를 받는
  `createZipArchive`, 기존 `createDmgArchive`를 export한다.
- 메인 plist의 `CFBundleIdentifier`를 `com.jinzer0.prompter`로 두고 helper 식별자는 기존
  suffix를 이 값에 파생한다.
- 메인과 helper plist의 `CFBundleShortVersionString`, `CFBundleVersion`을 package version
  `0.1.1`에서 기록한다.
- 최종 ZIP 이름을 `Prompter-${version}-mac-${arch}.zip`으로 고정한다. Notarization용 임시
  ZIP은 OS temp 아래에서만 만들고 `release/`에 두지 않는다.
- `npm run package`와 `make`는 기존 unsigned 로컬 경로를 유지하고 로그에 `unsigned local`을
  명시한다. `package:release:macos`는 Stage 3의 coordinator를 가리키되 Apple 입력을 unsigned
  명령에서 조회하지 않는다.
- generic local helper의 x64 지원은 제거하지 않는다. ARM64 제한은 signed release
  coordinator의 preflight에만 적용한다.
- malformed/missing package version 또는 지원하지 않는 release architecture는 candidate
  경로 생성 전에 설명 가능한 오류로 중단한다.

### 검증

```bash
node --check scripts/package-macos.mjs
npm test -- tests/package-macos.test.mjs tests/electron-contract.test.ts
npm run typecheck
rg -n '"version": "0\.1\.1"|com\.jinzer0\.prompter|CFBundleShortVersionString|CFBundleVersion|unsigned local|package:release:macos' package.json package-lock.json scripts/package-macos.mjs
GIT_MASTER=1 git status --short
GIT_MASTER=1 git diff --check
GIT_MASTER=1 git diff --exit-code origin/master -- docs/plan docs/draft .omo/boulder.json
```

- 신규 계약의 exhaustive tests는 Stage 4에서 추가한다. 이 Stage에서는 baseline 테스트가
  계속 통과하고 package/plist assembly helper import가 side effect 없이 가능한지 확인한다.
- malformed version과 unsupported release arch는 temp fixture와 injected runner로 호출해
  candidate 파일 생성 전 실패함을 evidence에 기록한다.

### 커밋

```text
Task #6 Stage 1: v0.1.1 패키징 정체성과 로컬 패키지 경계 추가
```

Stage 1 제품 산출물과 `mydocs/working/task_m011_6_stage1.md`를 함께 커밋한다.

## Stage 2 — Developer ID 서명과 Keychain Notarization 기반 구현

Prometheus Todos 3–4를 수행한다. Stage 1 보고서 승인 후 두 lane을 병렬로 진행할 수 있다.

### 병렬 lane

- **Lane 2A — signing (Todo 3)**: `scripts/macos/entitlements.plist`와
  `scripts/macos/signing.mjs`만 소유한다.
- **Lane 2B — notarization (Todo 4)**: `scripts/macos/notarization.mjs`만 소유한다.
- 두 lane은 공통 `runFile(command, args, options) -> { stdout, stderr }` 계약만 공유하고
  서로의 파일을 수정하지 않는다. lane 결과를 합친 뒤 Stage 2 통합 import/fake-runner 검증과
  단일 단계 보고를 수행한다.

### 산출물

신규:

- `scripts/macos/entitlements.plist`
- `scripts/macos/signing.mjs`
- `scripts/macos/notarization.mjs`
- `mydocs/working/task_m011_6_stage2.md` (검증 통과 후)

Evidence:

- `.omo/evidence/task-3-apple-developer-id-notarization-release.json`
- `.omo/evidence/task-4-apple-developer-id-notarization-release.json`

### 변경 내용 — Lane 2A

- `entitlements.plist`는 ASCII XML이며 `com.apple.security.cs.allow-jit=true`만 포함한다.
  `allow-unsigned-executable-memory`, `disable-library-validation`, `get-task-allow`는 금지한다.
- `scripts/macos/signing.mjs`는 다음 object-argument API를 export한다.
  - `discoverSignableCode({ appPath, runFile })`
  - `signAppBundle({ appPath, identity, entitlementsPath, runFile })`
  - `verifyAppSignature({ appPath, runFile })`
  - `verifyDmgSignature({ dmgPath, runFile })`
- discovery는 전체 app assembly 완료 뒤에만 실행하며 realpath가 app root 밖인 항목,
  canonical duplicate, symlink escape를 거부한다.
- executable Mach-O, `.node`, dylib/framework, XPC, helper app을 분류하고 canonical path의
  depth 내림차순과 path 오름차순으로 안정 정렬한다.
- nested raw code/bundle을 먼저, helper app을 그다음, outer app을 마지막에 서명한다.
  모든 signing call은 exact identity, `--force`, `--timestamp`, `--options runtime`을 사용한다.
- entitlement는 executable host/helper app signature에만 적용하고 raw library에는 적용하지
  않는다. signing argv에 `--deep`를 사용하지 않으며 검증에만 `--deep --strict`를 허용한다.
- nested signing 또는 post-sign discovery가 하나라도 실패하면 outer signing과 모든 후속
  Notarization을 호출하지 않는다. copied dependency를 prune하거나 미확인 executable을
  묵시적으로 skip하지 않는다.

### 변경 내용 — Lane 2B

- `scripts/macos/notarization.mjs`는 다음 object-argument API를 export한다.
  - `preflightNotaryProfile({ profile, runFile })`
  - `submitAndWait({ artifactPath, profile, evidenceDir, runFile })`
  - `fetchNotaryLog({ submissionId, profile, evidenceDir, runFile })`
  - `stapleAndValidate({ artifactPath, artifactKind, runFile })`
  - `assessGatekeeper({ artifactPath, artifactKind, runFile })`
- `xcrun notarytool`은 `--keychain-profile`, `--wait`, `--output-format json`만 사용한다.
  `.app` 직접 upload를 거부하고 submission archive 또는 DMG만 허용하며 ZIP staple을 거부한다.
- 응답은 exit code 0만으로 성공 처리하지 않고 JSON schema, submission ID, status를 검사한다.
  `Accepted`가 아니면 중단하고 Accepted여도 log를 항상 받아 error 0개, warning 0개일 때만
  staple 단계로 진행한다.
- timeout/interrupt는 `unknown` 상태와 sanitized submission ID만 기록한다. 같은 bytes를
  자동 재제출하지 않고 `notarytool info`와 `log`로 재개한다.
- stapler retry는 동일 artifact에 한정한 bounded retry이며 Notarization resubmit을 유발하지
  않는다.
- evidence에는 submission ID, status, sanitized log path만 저장하고 profile 값, raw argv,
  환경 객체, password/key path를 쓰지 않는다.

### 검증

```bash
plutil -lint scripts/macos/entitlements.plist
node --check scripts/macos/signing.mjs
node --check scripts/macos/notarization.mjs
node --input-type=module -e 'const s=await import("./scripts/macos/signing.mjs"); const n=await import("./scripts/macos/notarization.mjs"); for (const name of ["discoverSignableCode","signAppBundle","verifyAppSignature","verifyDmgSignature"]) if (typeof s[name] !== "function") throw new Error(name); for (const name of ["preflightNotaryProfile","submitAndWait","fetchNotaryLog","stapleAndValidate","assessGatekeeper"]) if (typeof n[name] !== "function") throw new Error(name);'
rg -n 'allow-unsigned-executable-memory|disable-library-validation|get-task-allow|--apple-id|--password|--deep' scripts/macos
GIT_MASTER=1 git status --short
GIT_MASTER=1 git diff --check
GIT_MASTER=1 git diff --exit-code origin/master -- docs/plan docs/draft .omo/boulder.json
```

- forbidden-pattern `rg`는 `--deep`가 검증 argv에만 존재하는지 문맥을 검토하며, 다른 금지
  문자열은 0건이어야 한다.
- Stage 4 전에 temporary fake runner smoke로 nested failure가 outer signing을 막고,
  non-Accepted/invalid JSON/warning/timeout이 staple과 downstream archive를 막는지 기록한다.

### 커밋

```text
Task #6 Stage 2: Developer ID 서명과 Keychain Notarization 기반 추가
```

두 lane 산출물과 `mydocs/working/task_m011_6_stage2.md`를 검증 후 함께 커밋한다.

## Stage 3 — 이중 제출 릴리스 코디네이터 통합

Prometheus Todo 5를 수행한다. Stage 2의 signing/notarization API와 보고서 승인에 의존한다.

### 산출물

신규:

- `scripts/release-macos.mjs`
- `mydocs/working/task_m011_6_stage3.md` (검증 통과 후)

수정:

- `package.json` (`package:release:macos`가 coordinator를 실행하는지 최종 확인에 필요한 경우만)

Evidence:

- `.omo/evidence/task-5-apple-developer-id-notarization-release.json`

### 변경 내용

- `scripts/release-macos.mjs`는 CLI entry와 테스트 가능한
  `runMacOSRelease({ runFile, platform, arch, paths, signingIdentity, notaryProfile })`를
  분리한다. CLI만 non-secret 환경 이름을 읽고 값은 출력하지 않는다.
- candidate mutation 전에 macOS/ARM64, full selected Xcode tools, clean worktree,
  version-specific `release/v0.1.1/` 미존재/빈 상태, exact Developer ID Application identity와
  private key availability, unlocked Keychain, valid notary profile, Apple endpoint connectivity를
  모두 확인한다.
- identity는 0개 또는 복수 match이면 실패하며 임의 선택하지 않는다. stale/partial final
  artifact가 있으면 overwrite 또는 merge하지 않고 실패한다.
- 성공 순서를 정확히 고정한다.
  1. npm script에서 build 완료
  2. complete app assembly와 plist identity/version 기록
  3. nested sign, helper sign, outer sign
  4. strict app signature와 Gatekeeper 확인
  5. OS temp의 submission ZIP 생성
  6. app submit/wait, log fetch/review, app staple/validate
  7. final versioned ZIP 생성, clean extraction, extracted app 재검증
  8. stapled app으로 DMG 생성, `hdiutil verify`, DMG sign/verify
  9. DMG submit/wait, log fetch/review, DMG staple/validate/Gatekeeper
  10. read-only mount, contained app 확인, unmount
  11. final ZIP과 DMG의 SHA-256을 마지막에 생성
- final allowlist는 `Prompter-0.1.1-mac-arm64.zip`,
  `Prompter-0.1.1-mac-arm64.dmg`, `SHA256SUMS`뿐이다. local `.app`은 명시적 non-uploadable
  구성일 때만 final directory 밖 또는 별도 로컬 경로에 둔다.
- rejected/unknown candidate는 final allowlist에 넣지 않는다. 모든 성공/실패/interrupt 경로는
  `finally`에서 temp ZIP, extraction, mount/staging, partial final artifact를 정리하고 unknown
  Notarization의 sanitized resume evidence만 보존한다.
- coordinator에는 `gh`, `git tag`, release create/upload/publish 호출을 두지 않는다.

### 검증

```bash
node --check scripts/release-macos.mjs
node --input-type=module -e 'const m=await import("./scripts/release-macos.mjs"); if (typeof m.runMacOSRelease !== "function") throw new Error("runMacOSRelease")'
rg -n 'gh[[:space:]]+release|git[[:space:]]+tag|release create|release upload' scripts/release-macos.mjs
npm run typecheck
GIT_MASTER=1 git status --short
GIT_MASTER=1 git diff --check
GIT_MASTER=1 git diff --exit-code origin/master -- docs/plan docs/draft .omo/boulder.json
```

- injected fake runner full trace는 위 11개 순서를 정확히 비교하고, 각 호출 지점에서 throw를
  주입해 후속 mutation 0건과 cleanup 완료를 확인한다.
- dirty-worktree fake output, stale version directory, existing final asset, wrong arch, missing/multiple
  identity, locked Keychain, invalid profile, endpoint failure는 assembly 전 실패해야 한다.
- 실제 Apple 및 GitHub release 명령은 실행하지 않는다.

### 커밋

```text
Task #6 Stage 3: 서명과 이중 Notarization 릴리스 오케스트레이션 추가
```

coordinator와 `mydocs/working/task_m011_6_stage3.md`를 함께 커밋한다.

## Stage 4 — tests-after 회귀 테스트와 유지관리자 문서 확정

Prometheus Todos 6–7을 수행한다. Stage 3 API와 순서가 고정된 뒤 두 lane을 병렬로 진행한다.

### 병렬 lane

- **Lane 4A — tests-after (Todo 6)**: `tests/package-macos.test.mjs`,
  `tests/package-macos-signing.test.mjs`, `tests/package-macos-notarization.test.mjs`,
  `tests/electron-contract.test.ts`만 소유한다.
- **Lane 4B — docs/security (Todo 7)**: `.gitignore`, `docs/release-macos.md`,
  `docs/qa-checklist.md`, `README.md`만 소유한다.
- Lane 4B는 Stage 3에서 확정된 command/export/env 이름을 문서화하며 제품 script를 수정하지
  않는다. Lane 4A는 문서를 수정하지 않는다. 두 lane 완료 뒤 focused test와 문서-명령 대응을
  함께 검증한다.

### 산출물

신규:

- `tests/package-macos-signing.test.mjs`
- `tests/package-macos-notarization.test.mjs`
- `docs/release-macos.md`
- `mydocs/working/task_m011_6_stage4.md` (검증 통과 후)

수정:

- `tests/package-macos.test.mjs`
- `tests/electron-contract.test.ts`
- `.gitignore`
- `docs/qa-checklist.md`
- `README.md`

Evidence:

- `.omo/evidence/task-6-apple-developer-id-notarization-release.txt`
- `.omo/evidence/task-7-apple-developer-id-notarization-release.md`

### 변경 내용 — Lane 4A

- `tests/package-macos.test.mjs`에 version/bundle/plist/helper suffix/versioned ZIP,
  unsigned local 경로, temp/final cleanup과 coordinator order 계약을 추가한다.
- `tests/package-macos-signing.test.mjs`는 temp app fixture에 helper app, framework, dylib,
  `.node`, XPC, executable Mach-O, symlink duplicate를 만들고 canonical deterministic
  nested-before-outer trace와 entitlement 대상 구분을 검증한다.
- `tests/package-macos-notarization.test.mjs`는 profile preflight, JSON parse, Accepted+log,
  warning/error 차단, timeout unknown/resume, bounded staple retry, app/DMG two-submission order,
  downstream suppression, interruption cleanup과 sentinel redaction을 검증한다.
- `tests/electron-contract.test.ts`는 unchanged unsigned `package`/`make`, fail-closed
  `package:release:macos`, renderer/IPC credential surface 부재를 검증한다.
- 모든 runner는 fake이며 live Keychain, Apple network, `codesign`, `notarytool`, `stapler`,
  `spctl`, `hdiutil`, GitHub를 호출하지 않는다. fixture secret은 명백한 sentinel만 사용하고
  실제 credential 형식 값을 쓰지 않는다.

### 변경 내용 — Lane 4B

- `.gitignore`에 `AuthKey_*.p8`, `*.p12`, `*.mobileprovision`만 좁게 추가한다.
- `docs/release-macos.md`에 full Xcode 선택, 준비된 Developer ID identity, Keychain profile,
  두 non-secret env 이름, unsigned/release 명령 분리, app/DMG 두 제출, sanitized evidence,
  timeout resume/no-resubmit, fail-closed/no-publication을 설명한다.
- `docs/qa-checklist.md`에 app/ZIP/DMG/checksum/signature/notary log/staple/Gatekeeper/
  read-only mount/extract/smoke를 실제 명령에 매핑한다.
- `README.md`는 유지관리자용 signed release 명령만 설명한다. 공개 전에는 v0.1.0 설치명과
  현재 unsigned 사용자 안내를 truthful하게 유지한다. v0.1.1 설치 링크와 signed 사용자
  문구 변경은 이슈 #7로 미룬다.
- secret 값, identity 예시 값, key path, raw command environment를 문서화하지 않는다.

### 검증

```bash
npm test -- tests/package-macos.test.mjs tests/package-macos-signing.test.mjs tests/package-macos-notarization.test.mjs tests/electron-contract.test.ts
npm run typecheck
npm run lint
rg -n 'PROMPTER_SIGNING_IDENTITY|PROMPTER_NOTARY_PROFILE|npm run package|npm run package:release:macos|notarytool|stapler|spctl|hdiutil|SHA256SUMS' docs/release-macos.md docs/qa-checklist.md README.md package.json scripts
rg -n 'AuthKey_\*\.p8|\*\.p12|\*\.mobileprovision' .gitignore
rg -n '^\*\.key$|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|--apple-id|--password' .gitignore docs README.md scripts tests
GIT_MASTER=1 git diff --exit-code origin/master -- docs/plan docs/draft .omo/boulder.json
GIT_MASTER=1 git status --short
GIT_MASTER=1 git diff --check
```

- 첫 번째 `rg`는 명령/문서 대응을 사람이 검토한다. secret scan은 금지값 0건이어야 한다.
- Stage 4 완료 조건은 Metis failure class 전체, exact trace order, failure downstream 0건,
  temp cleanup, sentinel 비노출, protected path 빈 diff가 focused Vitest와 scan에서 모두
  확인되는 것이다.

### 커밋

```text
Task #6 Stage 4: macOS 서명 회귀 테스트와 릴리스 운영 문서 추가
```

두 lane 산출물과 `mydocs/working/task_m011_6_stage4.md`를 검증 후 함께 커밋한다. 이 Stage는
Prometheus가 명시한 tests-after와 문서 계약을 같은 승인 경계로 고정하므로 하나의 Stage
커밋으로 관리한다.

## Stage 5 — 통합 검증, 보고, 리뷰와 구현 병합

Prometheus Todo 8을 수행한다. Stage 4 보고서 승인과 모든 제품/테스트/문서 변경 완료에
의존한다.

### 산출물

신규:

- `mydocs/working/task_m011_6_stage5.md`
- `mydocs/report/task_m011_6_report.md`

수정:

- `mydocs/orders/20260908.md` (실제 완료 일자의 orders 파일이 달라지면 해당 날짜 파일)

Evidence:

- `.omo/evidence/task-8-apple-developer-id-notarization-release.md`

### 변경 내용

- focused 테스트부터 typecheck, lint, 전체 테스트, build, unsigned package, Electron smoke
  순서로 실행하고 각각의 exit code와 핵심 결과를 sanitized evidence에 기록한다.
- Apple 입력을 제공하지 않은 실제 `npm run package`가 성공하고 `unsigned local`을 표시하는지
  확인한다. 같은 조건의 signed command는 candidate mutation 전에 nonzero로 실패해야 한다.
- private-key/credential pattern, renderer/IPC secret surface, protected docs, unresolved unsigned
  claim, generated artifact와 final allowlist 오염을 검사한다.
- 각 승인된 Stage의 보고서와 커밋을 확인하고 최종 보고서에 수용 기준별 OK/MISS,
  변경 파일, 잔여 위험, 이슈 #7 진입 조건을 기록한다.
- 최종 보고서/PR 승인을 받은 뒤에만 `publish/task6`으로 push하고 `master` 대상 PR을 만든다.
  PR review/merge는 별도 명시 승인과 원격 상태 확인을 거친다.
- 구현 branch에서는 live Notarization, tag/release create/upload/publish를 실행하지 않는다.

### 검증

```bash
npm test -- tests/package-macos.test.mjs tests/package-macos-signing.test.mjs tests/package-macos-notarization.test.mjs tests/electron-contract.test.ts
npm run typecheck
npm run lint
npm test
npm run build
env -u PROMPTER_SIGNING_IDENTITY -u PROMPTER_NOTARY_PROFILE npm run package
env -u PROMPTER_SIGNING_IDENTITY -u PROMPTER_NOTARY_PROFILE npm run package:release:macos
npm run test:smoke
rg -n 'BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|--apple-id|--password' . --glob '!node_modules/**' --glob '!release/**' --glob '!.git/**' --glob '!.omo/**'
rg -n 'getOpenAIKey|PROMPTER_SIGNING_IDENTITY|PROMPTER_NOTARY_PROFILE' electron renderer tests
GIT_MASTER=1 git diff --exit-code origin/master -- docs/plan docs/draft .omo/boulder.json
GIT_MASTER=1 git status --short
GIT_MASTER=1 git diff --check
```

- signed command는 **의도된 nonzero**가 성공 조건이다. 실행 전후 `release/v0.1.1/`과 status를
  비교해 candidate mutation이 없음을 증명한다. shell에서 nonzero를 삼키지 말고 exit code와
  변경 없음 결과를 evidence에 별도로 기록한다.
- unsigned package가 만든 task-owned 산출물은 검증 뒤 hash/path를 기록하고, 다른 작업자의
  산출물과 구분해 cleanup한다. tracked status에 app/ZIP/DMG/log가 나타나면 실패다.
- PR 생성 전 `task-final-report` 절차에 따라 최종 보고서와 orders 변경을 제시하고 명시적
  승인을 받는다. push/PR/merge 후 원격 검증은 별도 evidence에 기록한다.

### 커밋

Stage 5 검증 및 보고서 승인 뒤 마지막 Stage 보고와 최종 보고를 함께 고정한다.

```text
Task #6 Stage 5 + 최종 보고서: 서명 릴리스 파이프라인 검증 완료
```

최종 보고서/PR 승인 전에는 이 커밋, push, PR 생성을 실행하지 않는다.

## Stage 6 - pre-PR review blocker 교정과 재검증

Prometheus Todo 8은 완료로 바꾸지 않는다. Stage 5 이후 pre-PR review가 fail 판정을 냈으므로,
PR publication과 Issue #7 진입은 Stage 6 교정, 보고서 갱신, fresh review 통과 전까지 차단한다.
이번 Stage는 기존 Stage 1-5 보고서와 commit을 고치지 않고, 관찰된 blocker를 새 교정 Stage로
투명하게 formalize한다.

### pre-PR review 판정과 blocker 매핑

| Lane | 판정 | Stage 6 의미 |
|---|---|---|
| QA | PASS | Stage 5 offline validation은 근거로 보존하되 blocker 교정 뒤 전체 surface를 다시 실행한다. |
| Goal | FAIL | exact v0.1.1 gate, artifact-bound resume, file ownership variance formalization을 교정한다. |
| Code quality | FAIL | Electron framework alias, detach failure propagation, timeout/abort, DMG signing argv를 교정한다. |
| Context | FAIL | prior Stage ownership variance를 승인/관찰 이력으로 기록하고 Stage 6 ownership을 고정한다. |
| Security | INCONCLUSIVE | reviewer infrastructure 한계로 inconclusive다. Stage 6은 credential redaction, protected path, secret scan을 다시 요구한다. |

| Confirmed blocker | 필수 교정 | 소유 파일 | 필수 테스트 |
|---|---|---|---|
| Electron framework aliases | real Electron framework layout에서 duplicate signable path가 생기지 않아야 하며 symlink escape와 ambiguous alias는 계속 거부한다. | `scripts/macos/signing.mjs` | `tests/package-macos-signing.test.mjs`에 real Electron framework layout 회귀, duplicate canonical path 거부, symlink escape 거부, ambiguous alias 거부를 추가한다. |
| suppressed detach failure | read-only mount 검증 뒤 detach-before-remove를 순차 실행하고 detach 실패를 sanitized error로 전파 또는 보존한다. | `scripts/release-macos.mjs`, `scripts/macos/release-support.mjs` | `tests/package-macos.test.mjs`에 detach 실패 시 remove 선행 금지, sanitized failure propagation, caller-owned evidence 보존을 추가한다. |
| exact v0.1.1 gate | signed release path는 preflight와 candidate mutation 전에 package version이 정확히 `0.1.1`인지 확인한다. | `scripts/release-macos.mjs`, `scripts/macos/release-support.mjs` | `tests/package-macos.test.mjs`에 wrong version, missing version, mutation-zero expected failure를 추가한다. |
| artifact-bound resume | Notarization resume record는 artifact kind와 artifact SHA-256 bytes에 묶고 mismatch는 재사용하지 않는다. | `scripts/macos/notarization.mjs`, `scripts/release-macos.mjs` | `tests/package-macos-notarization.test.mjs`와 `tests/package-macos.test.mjs`에 app/DMG kind mismatch, byte hash mismatch, no resubmit before accepted log를 추가한다. |
| production timeout/abort | long Apple command는 bounded production timeout과 abort/signal handling을 갖고 secret value를 stdout, stderr, error, evidence에 남기지 않는다. | `scripts/macos/notarization.mjs`, `scripts/macos/release-support.mjs` | `tests/package-macos-notarization.test.mjs`에 timeout, AbortError, valid signal, invalid signal, secret sentinel redaction을 추가한다. |
| DMG runtime option | DMG signing은 승인된 `--force`, `--timestamp`, `--options runtime` argv를 포함한다. | `scripts/macos/signing.mjs`, `scripts/release-macos.mjs` | `tests/package-macos-signing.test.mjs`와 `tests/package-macos.test.mjs`에 DMG signing argv exact assertion을 추가한다. |
| formal ownership variance | Stage 1 contract tests, Stage 3 release-support split, Stage 4 Biome-only source formatting을 prior approved/observed history로 기록한다. | `mydocs/plans/task_m011_6_impl.md`, `mydocs/working/task_m011_6_stage6.md`, `mydocs/report/task_m011_6_report.md` | governance diff review와 Stage 6 report review에서 prior Stage 보고서를 rewrite하지 않았음을 확인한다. |

### prior ownership variance 기록

- Stage 1은 계획상 product packaging identity stage였지만 `tests/package-macos.test.mjs`와
  `tests/electron-contract.test.ts`의 직접 contract assertions도 함께 고쳤다. Stage 1 보고서와
  commit에 이미 보고되고 고정된 승인/관찰 이력이며, Stage 6은 이를 숨기거나 rewrite하지 않는다.
- Stage 3은 계획상 coordinator가 `scripts/release-macos.mjs` 중심이었지만 Biome와 LOC 상한 때문에
  `scripts/macos/release-support.mjs`를 내부 support helper로 분리했다. Stage 3 보고서와 commit에
  이미 보고되고 고정된 승인/관찰 이력이며, Stage 6은 helper ownership을 정식 소유 파일로 포함한다.
- Stage 4는 tests/docs stage였지만 lint gate를 위해 `scripts/macos/signing.mjs`와
  `scripts/macos/notarization.mjs`에 Biome-only source formatting을 적용했다. Stage 4 보고서와
  commit에 이미 보고되고 고정된 승인/관찰 이력이며, Stage 6은 runtime 교정과 formatter-only 이력을
  분리해 기록한다.

### 산출물

수정:

- `scripts/macos/signing.mjs`
- `scripts/macos/notarization.mjs`
- `scripts/macos/release-support.mjs`
- `scripts/release-macos.mjs`
- `tests/package-macos-signing.test.mjs`
- `tests/package-macos-notarization.test.mjs`
- `tests/package-macos.test.mjs`
- `vitest.config.ts`는 focused suite include가 실제로 추가로 필요할 때만 수정한다.
- `mydocs/report/task_m011_6_report.md`

신규:

- `mydocs/working/task_m011_6_stage6.md`

Evidence:

- `.omo/evidence/task-8-stage6-pre-pr-review-remediation.md` (ignored, sanitized)

### 변경 내용

- signing discovery는 real Electron framework layout의 executable, framework binary, symlink alias,
  version alias를 fixture로 재현하고 duplicate signable path를 정확히 거부한다. 정상 framework layout은
  한 canonical owner만 처리하며 app root 밖 realpath, symlink escape, ambiguous aliases는 계속
  fail closed다.
- cleanup은 mounted DMG verification에서 detach를 먼저 시도하고 detach state와 failure를 별도 보존한다.
  detach 실패 뒤에는 mount path remove를 먼저 실행하지 않으며, 사용자에게 전파되는 오류와 evidence는
  profile, identity, password, key path, raw argv를 포함하지 않는다.
- release coordinator는 package version이 정확히 `0.1.1`인지 signed preflight와 mutation 전에 확인한다.
  mismatch는 signed preflight, build, app assembly, signing, Notarization, final directory mutation 전에
  nonzero로 끝난다.
- Notarization resume은 artifact kind와 SHA-256 bytes를 포함한다. app ZIP resume은 DMG에 재사용할 수
  없고, 같은 path라도 bytes가 바뀌면 재사용하지 않는다. Accepted log와 warning-free receipt 전에는
  downstream signing, archive, staple, checksum이 진행되지 않는다.
- Apple 장시간 명령은 production default timeout을 명시하고 injected runner의 `timeoutMs`와 `signal`을
  모두 연결한다. timeout, AbortError, 실제 signal recovery는 sanitized unknown으로 남기며 invalid signal,
  일반 실패, credential sentinel은 resume/evidence가 되지 않는다.
- DMG signing은 app signing과 같은 approved runtime hardening argv인 `--force`, `--timestamp`,
  `--options runtime`을 포함한다. 검증에서만 `--deep --strict`를 허용한다.
- 기존 Stage reports, final report의 historical statements, protected docs, `.omo/boulder.json`, release
  artifacts, live Apple/GitHub state는 수정하지 않는다. 최종 보고서는 Stage 6 결과와 PR 차단 해제 조건만
  갱신한다.

### 검증

```bash
node --check scripts/macos/signing.mjs
node --check scripts/macos/notarization.mjs
node --check scripts/macos/release-support.mjs
node --check scripts/release-macos.mjs
npm test -- tests/package-macos.test.mjs tests/package-macos-signing.test.mjs tests/package-macos-notarization.test.mjs tests/electron-contract.test.ts
npm run typecheck
npm run lint
npm test
npm run build
env -u PROMPTER_SIGNING_IDENTITY -u PROMPTER_NOTARY_PROFILE npm run package
env -u PROMPTER_SIGNING_IDENTITY -u PROMPTER_NOTARY_PROFILE npm run package:release:macos
npm run test:smoke
rg -n 'BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|--apple-id|--password' . --glob '!node_modules/**' --glob '!release/**' --glob '!.git/**' --glob '!.omo/**'
rg -n 'getOpenAIKey|PROMPTER_SIGNING_IDENTITY|PROMPTER_NOTARY_PROFILE' electron renderer tests
rg -n 'Duplicate signable code path is not allowed|Frameworks|Versions|Current|--options|runtime|timeoutMs|AbortError|sha256|artifactKind|detach' scripts tests mydocs
GIT_MASTER=1 git diff --exit-code origin/master -- docs/plan docs/draft .omo/boulder.json
GIT_MASTER=1 git status --short
GIT_MASTER=1 git diff --check
```

- Focused tests must cover the seven blocker rows above. Real Electron framework discovery must use a
  fixture that reproduces the observed `Duplicate signable code path is not allowed` class without
  calling live `codesign`.
- Syntax/import checks must prove exact exports remain side effect free. Config ownership is allowed only
  if focused tests are otherwise unreachable from the checked-in test command.
- Typecheck, lint, full test, build, unsigned package, expected signed missing-input mutation-zero,
  Electron smoke, security scan, protected-path diff, artifact cleanup, and real Electron discovery checks
  all run again after corrections.
- The expected signed missing-input command must fail nonzero before preflight mutation and must show
  unchanged `release/v0.1.1/`, unchanged release evidence path, and clean tracked status.
- No Apple, Keychain, signing, Notarization, Gatekeeper, tag, release, upload, push, PR, or merge operation
  may run in Stage 6.

### 보고서와 evidence

- Stage 6 report path: `mydocs/working/task_m011_6_stage6.md`.
- Stage 6 evidence path: `.omo/evidence/task-8-stage6-pre-pr-review-remediation.md`.
- The report records each blocker, exact corrected files, focused test names, validation commands, fresh
  review outcome, residual risks, and PR publication gate.
- The final report is updated only after validation to state that Stage 6 supersedes the failed pre-PR
  review. It must not erase Stage 1-5 report history.

### 커밋

먼저 이 governance amendment와 orders 재개만 별도 커밋으로 고정한다.

```text
Task #6: Stage 6 교정 계획과 오늘할일 재개
```

그 뒤 제품 교정은 새 atomic correction commit으로 고정한다.

```text
Task #6 Stage 6: pre-PR blocker 교정
```

검증, Stage 6 보고서, 최종 보고서 갱신, orders 상태 갱신은 fresh review 통과 뒤 별도 closure
commit으로 고정한다.

```text
Task #6 Stage 6 + 최종 보고서: pre-PR blocker 교정 검증 완료
```

Stage 6 review가 PASS하기 전에는 `publish/task6` push, `master` 대상 PR 생성, Issue #7 시작,
tag/release/publication을 실행하지 않는다.

## Stage 6.2 - failed fresh review blocker 교정 addendum

Fresh five-lane review 결과는 QA PASS, Goal FAIL, Code quality FAIL, Context FAIL, Security FAIL이다.
Stage 6 report와 final report draft는 현재 작업 이력으로 보존하되, closure 근거로 사용하지 않는다.
Stage 6.2는 product code를 수정하기 전 governance로 먼저 고정하며, 아래 blocker를 모두 교정하고
새 five-lane review가 전부 PASS하기 전까지 Stage 6 closure report commit, orders 완료 처리,
`publish/task6` push, PR, Issue #7 진입을 차단한다.

### fresh review blocker 매핑

| Lane | Blocking finding | 필수 교정 | 소유 파일 | 필수 테스트와 증거 |
|---|---|---|---|---|
| Goal | 실제 `npm run package:release:macos`가 exact `0.1.1` 검증 전에 `npm run build`를 실행한다. | signed npm entrypoint가 `npm run build` 또는 candidate mutation, native rebuild, bundling, Apple preflight 같은 외부 작업 전에 exact `0.1.1`을 검증한다. | `scripts/macos/release-version-preflight.mjs` 신규, `package.json`, `tests/electron-contract.test.ts`, `docs/release-macos.md`, `docs/qa-checklist.md` | checked-in wrong-version 및 missing-version entrypoint tests가 build, downstream runner, candidate/evidence mutation 0건을 증명한다. Evidence에는 실제 entrypoint와 zero mutation 결과만 기록한다. |
| Code quality | framework alias 허용이 traversal order에 의존해 invalid alias가 canonical entry보다 먼저 오면 bypass된다. | alias owner를 first encounter에서 검증하고, conventional framework root alias와 canonical version binary만 허용한다. invalid alias가 canonical 또는 conventional entry보다 lexical sort상 먼저 와도 실패한다. | `scripts/macos/framework-alias.mjs`, `scripts/macos/signing.mjs`, `tests/package-macos-signing.test.mjs` | invalid alias sorting-before-canonical, sorting-before-conventional, duplicate canonical, symlink escape regression을 checked-in tests로 고정한다. |
| Code quality | `Accepted` submit 뒤 log fetch가 실패하면 accepted state가 저장되지 않아 다음 invocation이 재제출한다. | submission이 `Accepted`를 반환하는 즉시 artifact kind/hash-bound state를 저장하고, log retrieval은 저장 뒤 수행한다. 다음 invocation은 `info`와 `log` refresh만 실행하고 submit total은 1이어야 한다. | `scripts/macos/notarization.mjs`, `scripts/macos/notarization-evidence.mjs`, `scripts/macos/notarization-command.mjs`, `tests/package-macos-notarization.test.mjs` | two-invocation accepted-log-failure regression이 submit 1회, info/log refresh, downstream 0건을 증명한다. |
| Context | `58c9d4e`가 승인된 Stage 6 ownership 밖의 helper 5개를 추가했다. | Stage 6.1 helper ownership을 정식 승인 범위로 추가하고 기존 report draft는 rewrite하지 않는다. | `scripts/macos/framework-alias.mjs`, `scripts/macos/notarization-command.mjs`, `scripts/macos/notarization-contract.mjs`, `scripts/macos/notarization-evidence.mjs`, `scripts/macos/release-lifecycle.mjs`, `mydocs/plans/task_m011_6_impl.md` | governance diff에서 helper 5개가 Stage 6.1 소유 파일로 명시되어야 한다. Stage 6.2 report는 `67ec682`, `58c9d4e`, Stage 6.2 implementation commit을 구분한다. |
| Context | checked-in regression matrix가 incomplete다. | missing-version, kind-only mismatch, hash-only mismatch, valid production AbortSignal recovery, exact app signing prefix, docs evidence-field validation을 모두 checked-in tests/docs로 추가한다. | `tests/package-macos.test.mjs`, `tests/package-macos-signing.test.mjs`, `tests/package-macos-notarization.test.mjs`, `tests/electron-contract.test.ts`, `docs/release-macos.md`, `docs/qa-checklist.md` | 각 테스트 이름과 증거를 Stage 6.2 report에 파일별로 기록한다. ignored temp driver만으로 통과 처리하지 않는다. |
| Security | Apple trust tools가 bare `xcrun`과 `spctl`로 실행되어 inherited `PATH` hijack으로 Apple gates가 우회된다. | production runner는 `/usr/bin/xcrun`과 `/usr/sbin/spctl` 절대 경로만 사용한다. relevant environment/search path를 감사하고, fake earlier `PATH` entry가 실행되지 않는 regression을 추가한다. | `scripts/macos/notarization-command.mjs`, `scripts/release-macos.mjs`, `scripts/macos/release-support.mjs`, `tests/package-macos-notarization.test.mjs`, `tests/package-macos.test.mjs` | path-hijack regression이 fake `xcrun`/`spctl` 실행 0건, absolute command 호출, downstream gate 유지, secret redaction을 증명한다. |
| Security | local cached accepted receipt만 신뢰하면 forged log로 status/log refresh를 우회할 수 있다. | accepted cache는 evidence로만 취급하고, release 진행 시 accepted status와 log를 항상 refresh한다. final PASS를 위한 필수 hardening이다. | `scripts/macos/notarization.mjs`, `scripts/macos/notarization-evidence.mjs`, `tests/package-macos-notarization.test.mjs`, `docs/release-macos.md`, `docs/qa-checklist.md` | forged accepted receipt regression은 submit 없이 `info`와 `log` refresh가 일어나고 warning/error receipt가 downstream을 차단함을 증명한다. |

### Stage 6.1 helper ownership formalization

`58c9d4e`의 helper split은 Stage 6.2에서 정식 소유 범위로 승인한다. 목적은 기존 public export와
runtime behavior를 유지하면서 Stage 6 LOC, parsing, evidence, lifecycle 책임을 분리하는 것이다.

| Helper | 공식 소유 목적 | 연결 동작 | 연결 테스트 |
|---|---|---|---|
| `scripts/macos/framework-alias.mjs` | Electron framework canonical alias 판정 | traversal-order-independent alias validation | `tests/package-macos-signing.test.mjs` |
| `scripts/macos/notarization-command.mjs` | absolute Apple command path, timeout, AbortSignal, log/status parsing | `/usr/bin/xcrun`, `/usr/sbin/spctl`, accepted status/log refresh | `tests/package-macos-notarization.test.mjs`, `tests/package-macos.test.mjs` |
| `scripts/macos/notarization-contract.mjs` | strict input/result/error contract | kind/hash fields, signal validation, sanitized failures | `tests/package-macos-notarization.test.mjs` |
| `scripts/macos/notarization-evidence.mjs` | artifact-bound resume and receipt persistence | `artifactKind`, `artifactSha256`, accepted-before-log state save | `tests/package-macos-notarization.test.mjs`, `docs/qa-checklist.md` |
| `scripts/macos/release-lifecycle.mjs` | candidate lifecycle and cleanup ownership | detach-before-remove, cleanup aggregation, preserved mount on detach failure | `tests/package-macos.test.mjs` |

### release-version preflight ownership

- Stage 6.2 approves a minimal `scripts/macos/release-version-preflight.mjs` file. It reads the root
  `package.json`, requires exact `0.1.1`, prints no secret values, and performs no build, native
  rebuild, bundling, signing, Notarization, Gatekeeper, candidate directory, or evidence mutation.
- `package.json` signed release script must become preflight-first:

```text
node scripts/macos/release-version-preflight.mjs && npm run build && node scripts/release-macos.mjs
```

- `scripts/release-macos.mjs` keeps its internal exact-version check as defense in depth. The new
  preflight only closes the actual npm entrypoint ordering gap.
- `tests/electron-contract.test.ts` owns the package script contract. `tests/package-macos.test.mjs`
  owns wrong-version and missing-version entrypoint regressions that prove zero build invocation,
  zero downstream command invocation, zero candidate mutation, and zero evidence mutation.

### 추가 checked-in regression requirements

- `tests/package-macos-signing.test.mjs` must assert the exact app signing prefix on every mutating
  `codesign` call: `/usr/bin/codesign`, `--force`, `--timestamp`, `--options`, `runtime`, `--sign`,
  identity, target. Verification-only `--deep --strict` remains separate.
- `tests/package-macos-notarization.test.mjs` must split resume mismatch tests into kind-only and
  hash-only cases. Each case proves no submit, no staple, no downstream archive, and sanitized error.
- `tests/package-macos-notarization.test.mjs` must add valid child-process AbortSignal recovery through
  the production runner, not only a fake runner or invalid signal rejection.
- `tests/package-macos-notarization.test.mjs` must add accepted-before-log persistence and two-invocation
  log-failure retry coverage with exactly one total submit.
- `tests/package-macos-notarization.test.mjs` must add forged accepted receipt coverage requiring fresh
  accepted status/log retrieval before release continuation.
- `tests/package-macos.test.mjs` must add PATH-hijack coverage for signed flow integration and absolute
  Apple tool commands.
- `tests/electron-contract.test.ts`, `docs/release-macos.md`, and `docs/qa-checklist.md` must reflect
  preflight-first signed script order plus resume/receipt `artifactKind` and `artifactSha256` checks.

### evidence와 docs wording correction

- Stage 6 evidence wording must claim only validation that is checked in or separately recorded in
  ignored evidence with exact command, fixture, and result. Temporary driver-only proof is not enough
  unless it is named as separate, non-checked-in evidence and repeated after Stage 6.2.
- QA checklist must parse both app and DMG `notarization-resume.json` and receipt JSON for matching
  `submissionId`, `artifactKind`, `artifactSha256`, accepted status, and warning/error-free issues.
- Release guide must state that accepted local receipts are not trusted alone. Maintainers refresh
  accepted status and log through Apple before any staple, Gatekeeper, final archive, checksum, or
  publication-adjacent step.
- Optional no-follow evidence write hardening may be adopted if implementation chooses it. If adopted,
  record `lstat`, canonical containment, restrictive permissions, atomic write, and no-follow behavior
  in source, tests, evidence, and docs. If not adopted, do not treat it as an unplanned Stage 6.2 blocker.

### Stage 6.2 validation matrix

| Check class | Required commands or proof | PASS condition |
|---|---|---|
| targeted | exact new tests for version preflight, alias order, accepted-log retry, PATH hijack, kind/hash mismatch, AbortSignal, app signing prefix | all named tests pass and fail for the intended reason before fix |
| focused | `npm test -- tests/package-macos.test.mjs tests/package-macos-signing.test.mjs tests/package-macos-notarization.test.mjs tests/electron-contract.test.ts` | full focused suite passes with checked-in regressions |
| full | `npm test` plus `npm run typecheck` and `npm run lint` | all exit 0 or pre-existing environment limits are classified |
| build | `npm run build` | exit 0 after preflight-first contract is installed |
| package | `env -u PROMPTER_SIGNING_IDENTITY -u PROMPTER_NOTARY_PROFILE npm run package` and signed missing-input expected failure | unsigned succeeds; signed path fails before mutation when inputs are absent |
| smoke | `npm run test:smoke` | Electron smoke passes before closure |
| security | secret/private-key scan, renderer/IPC surface scan, no publication command scan | no product secret leakage, no plaintext key bridge, no release/tag/upload command |
| path-hijack | fake earlier `PATH` entries for `xcrun` and `spctl` | fake tools are never executed; absolute Apple commands are used |
| artifact | release/dist/build/smoke output and mount/process cleanup review | only task-owned generated outputs are removed; no tracked artifact remains |
| protected | `GIT_MASTER=1 git diff --exit-code origin/master -- docs/plan docs/draft .omo/boulder.json` and `GIT_MASTER=1 git diff --check` | protected diff and whitespace check are clean |
| fresh review | five lanes: QA, goal, code quality, context, security | all five lanes PASS before closure report commit |

### Stage 6.2 산출물

수정:

- `package.json`
- `scripts/macos/framework-alias.mjs`
- `scripts/macos/signing.mjs`
- `scripts/macos/notarization-command.mjs`
- `scripts/macos/notarization-contract.mjs` if strict schema changes are needed
- `scripts/macos/notarization-evidence.mjs`
- `scripts/macos/notarization.mjs`
- `scripts/macos/release-support.mjs` if runner environment handling changes are needed
- `scripts/macos/release-lifecycle.mjs` if lifecycle evidence wording requires behavior support
- `scripts/release-macos.mjs`
- `tests/package-macos.test.mjs`
- `tests/package-macos-signing.test.mjs`
- `tests/package-macos-notarization.test.mjs`
- `tests/electron-contract.test.ts`
- `docs/release-macos.md`
- `docs/qa-checklist.md`
- `mydocs/working/task_m011_6_stage6.md` only after Stage 6.2 validation
- `mydocs/report/task_m011_6_report.md` only after fresh five-lane PASS and closure approval
- `mydocs/orders/20260908.md` remains `진행중` until closure approval

신규:

- `scripts/macos/release-version-preflight.mjs`

Evidence:

- `.omo/evidence/task-8-stage6-2-fresh-review-remediation.md` (ignored, sanitized)

### Stage 6.2 커밋 경계

이 addendum과 orders fresh-review remediation note만 먼저 고정한다.

```text
Task #6: Stage 6.2 재검토 교정 계획
```

제품, 테스트, 공식 문서 교정은 다음 implementation commit으로만 고정한다.

```text
Task #6 [Stage 6.2]: fresh review blocker 교정
```

Stage 6 report, final report, orders 완료 처리, closure report commit은 fresh five-lane review가 모두
PASS하고 작업지시자가 별도 승인하기 전까지 차단한다. 기존 Stage 6 report draft와 final report draft는
현재 uncommitted 상태로 보존하며 이 governance commit에 포함하지 않는다.

## Stage 6.3 - latest fresh-review failure 교정 addendum

최신 fresh five-lane review 결과는 Goal PASS, QA PASS, Code quality FAIL, Context PASS,
Security INCONCLUSIVE다. Security lane은 team-mode 전용 `security-review` skill이 현재 사용할 수
없어 독립 판정을 내리지 못했다. 이 기록은 숨기지 않으며 PASS로 간주하지 않는다. Stage 6 report와
final report draft는 byte-preserved draft로 보존하고, Stage 6.3은 product code 수정 전 governance와
orders note만 먼저 고정한다. 아래 blocker와 regression gap을 모두 교정하고 fresh five-lane review가
전부 PASS하기 전까지 Stage 6 closure report commit, orders 완료 처리, `publish/task6` push, PR,
Issue #7 진입을 차단한다.

### latest fresh-review lane 판정

| Lane | 판정 | Stage 6.3 의미 |
|---|---|---|
| Goal | PASS | Stage 6.2의 목표 범위는 충족됐지만 새 code-quality blocker가 closure를 차단한다. |
| QA | PASS | 검증 증거는 보존하되 Stage 6.3 교정 뒤 전체 surface를 다시 실행한다. |
| Code quality | FAIL | parent-directory framework alias provenance와 candidate pre-reservation race를 교정한다. |
| Context | PASS | Stage 6.2 ownership과 preserved draft 경계는 통과로 보존한다. |
| Security | INCONCLUSIVE | team-mode-only skill unavailable 때문에 판정 불가다. Stage 6.3은 team-mode skill 없이 fresh security lane을 다시 요구한다. |

### code-quality blocker 매핑

| Blocking finding | 재현된 동작 | 소유 파일 | 필수 테스트 | 필수 검증 |
|---|---|---|---|---|
| parent-directory framework alias provenance bypass | `Kit.framework/Aliases -> Versions/A`가 있으면 `Aliases/Kit`이 canonical `Versions/A/Kit` binary에 도달한다. 현재 discovery는 `realpath` 뒤 lexical provenance를 잃어 non-conventional parent directory alias를 conventional binary alias처럼 통과시킬 수 있다. | `scripts/macos/framework-alias.mjs`, `scripts/macos/signing.mjs` | `tests/package-macos-signing.test.mjs`에 invalid parent directory alias가 root binary alias보다 먼저 정렬되는 경우, `Versions`보다 먼저 정렬되는 경우, real Electron framework compatibility를 checked-in regression으로 추가한다. | targeted alias tests, focused signing suite, installed Electron discovery, syntax/import/export, typecheck, lint, protected diff, five-lane review |
| pre-reservation duplicate Apple submission race | 현재 candidate ownership이 first app notarization 뒤에 잡히므로 병렬 invocation 둘이 모두 app staging, assembly, signing, temp ZIP, evidence write, Apple submit에 도달하고 shared evidence를 race할 수 있다. | `scripts/release-macos.mjs`, `scripts/macos/release-lifecycle.mjs` | `tests/package-macos.test.mjs`에 deterministic concurrent 또는 two-invocation regression을 추가해 loser가 assembly, submit, evidence write, downstream mutation을 0건 수행하고 winner만 candidate ownership을 유지함을 증명한다. | targeted concurrency test, focused coordinator suite, unsigned package, signed missing-input mutation-zero, cleanup/protected/artifact checks, five-lane review |

### framework alias provenance fail-closed 요구사항

- signing discovery는 `realpath` 전에 `lstat` 또는 동등한 directory entry inspection을 수행하고,
  candidate entry의 lexical provenance를 보존해야 한다.
- signable object가 non-conventional parent directory alias를 통해 도달하면 canonical target이 app root
  내부이고 Mach-O여도 fail closed한다.
- 허용 alias는 좁은 allowlist로 제한한다. 표준 framework directory alias인 `Versions/Current`, root의
  `Resources`, `Headers`, `Modules`, root binary alias만 허용 후보이며, 모두 같은 framework와 같은
  version layout으로 해소될 때만 허용한다.
- canonical traversal은 real target을 정확히 한 번만 inspect한다. 허용 alias는 같은 canonical owner로
  coalesce할 수 있지만, alias provenance 검증 자체를 생략할 수 없다.
- invalid parent directory aliases는 `Kit.framework/Aliases -> Versions/A`, `Kit.framework/Aliases/Kit`,
  `Kit.framework/AAAA -> Versions/A`, `Kit.framework/AAAA/Kit` 같은 lexical-before-root-binary와
  lexical-before-`Versions` fixtures로 재현한다.
- real Electron framework fixture는 `Electron Framework.framework/Versions/Current`, root binary alias,
  root resources/header/module aliases가 기존 compatible layout에서 계속 통과함을 증명한다.

### candidate ownership concurrency 요구사항

- release coordinator는 모든 non-mutating preflight가 끝난 직후, app staging, app assembly, signing,
  temp ZIP, evidence write, Notarization submit, final archive, checksum보다 먼저 candidate ownership을
  atomic and exclusive하게 예약해야 한다.
- 기존 candidate directory는 empty directory여도 fail closed한다. 더 안전한 explicit lock design을
  선택하려면 구현계획서에 owner token, lifetime, stale 처리, cleanup 권한, crash recovery를 먼저
  명시해야 하며 ambiguous shared ownership은 허용하지 않는다.
- 실패 cleanup은 task가 만든 empty 또는 partial candidate만 제거한다. user-owned 또는 caller-owned
  candidate path, evidence root, release root, preserved reports는 삭제하지 않는다.
- deterministic concurrent 또는 two-invocation regression은 loser가 app assembly, signing, temp ZIP,
  app submit, log/info, evidence write, DMG create/sign/submit, checksum, final asset mutation을 하나도
  수행하지 않음을 확인해야 한다. winner는 ownership을 유지하고 성공 또는 의도된 failure path를 독립
  소유로 끝내야 한다.
- official docs는 candidate-absence semantics가 바뀌면 같이 갱신한다. Empty directory가 더 이상
  available candidate가 아니라면 `docs/release-macos.md`와 `docs/qa-checklist.md`에 그대로 적는다.

### 추가 state-machine, runner, QA schema regression 요구사항

- `tests/package-macos-notarization.test.mjs`는 accepted-pending state 뒤 `info -> In Progress` 흐름과
  `info -> Rejected` 흐름을 추가한다. 두 흐름 모두 total submit은 1회여야 하며 downstream operation은
  0건이어야 한다.
- accepted-pending `In Progress`는 unresolved로 남고 staple, Gatekeeper, final archive, checksum으로
  진행하지 않는다. accepted-pending `Rejected`는 terminal failure로 끝나며 재제출하지 않는다.
- notarization test runner의 stateful failure callback은 command 하나당 한 번만 호출해야 한다. 현재처럼
  같은 command에서 predicate/effect를 두 번 평가할 수 있으면 test가 실제 state machine을 왜곡하므로
  helper를 교정하고 회귀로 고정한다.
- QA evidence validation은 app evidence root가 `artifactKind: app`, DMG evidence root가
  `artifactKind: dmg`임을 엄격히 확인해야 한다.
- resume schema와 receipt schema는 예상 밖 field를 reject해야 하며 required fields는 정확히 유지한다.
  Required fields는 resume의 `submissionId`, `status`, `artifactKind`, `artifactSha256`, accepted 상태의
  `logPath`, receipt의 `submissionId`, `artifactKind`, `artifactSha256`, `issues`다.

### 유지해야 할 Stage 6.2 동작

- signed npm entrypoint preflight-first order는 유지한다.
- Apple trust tool absolute command path와 signing prefix는 유지한다.
- accepted status/log refresh와 no-local-receipt-trust behavior는 유지한다.
- artifact kind/hash binding, AbortSignal handling, timeout redaction, secret redaction, protected path,
  no-publication scans, helper ownership formalization은 유지한다.

### Stage 6.3 validation matrix

| Check class | Required commands or proof | PASS condition |
|---|---|---|
| targeted | exact new tests for parent-directory alias provenance, real Electron framework compatibility, candidate ownership race, accepted-pending `In Progress`, accepted-pending `Rejected`, single failure-callback evaluation, exact QA schema rejection | all named regressions pass and prove fail-closed behavior |
| focused | `npm test -- tests/package-macos.test.mjs tests/package-macos-signing.test.mjs tests/package-macos-notarization.test.mjs tests/electron-contract.test.ts` | full focused suite passes with checked-in regressions |
| full | `npm test` | all tests exit 0 or pre-existing environment limits are classified |
| typecheck | `npm run typecheck` | TypeScript exits 0 |
| lint | `npm run lint` | Biome exits 0 |
| build | `npm run build` | build exits 0 after Stage 6.3 corrections |
| unsigned package | `env -u PROMPTER_SIGNING_IDENTITY -u PROMPTER_NOTARY_PROFILE npm run package` | unsigned local package succeeds and task-owned outputs are cleaned after evidence capture |
| signed missing-input | `env -u PROMPTER_SIGNING_IDENTITY -u PROMPTER_NOTARY_PROFILE npm run package:release:macos` | expected nonzero occurs before mutation, candidate, evidence, app assembly, and submit remain 0 |
| smoke | `npm run test:smoke` | Electron smoke exits 0 before closure |
| cleanup | generated release, dist, build, smoke, temp, mount, and candidate ownership paths are reviewed | only task-owned empty/partial paths are removed; caller-owned paths and drafts are preserved |
| protected | `GIT_MASTER=1 git diff --exit-code origin/master -- docs/plan docs/draft .omo/boulder.json` and `GIT_MASTER=1 git diff --check` | protected diff and whitespace check are clean |
| secret | private-key, Apple credential, renderer/IPC secret surface, raw argv/env scans | no secret value leakage and no plaintext key bridge |
| five-lane review | fresh Goal, QA, Code quality, Context, Security lanes | all five lanes PASS; Security must not load the team-mode-only security skill and must return PASS or FAIL independently |

### Stage 6.3 산출물

수정:

- `scripts/macos/framework-alias.mjs`
- `scripts/macos/signing.mjs`
- `scripts/release-macos.mjs`
- `scripts/macos/release-lifecycle.mjs`
- `scripts/macos/notarization.mjs`
- `scripts/macos/notarization-command.mjs` only if runner helper evaluation changes are needed
- `scripts/macos/notarization-contract.mjs` only if schema rejection changes are needed
- `scripts/macos/notarization-evidence.mjs` only if resume or receipt schema changes are needed
- `tests/package-macos-signing.test.mjs`
- `tests/package-macos.test.mjs`
- `tests/package-macos-notarization.test.mjs`
- `docs/release-macos.md` only if candidate-absence semantics or evidence schema wording changes
- `docs/qa-checklist.md` for exact app/DMG artifact kind and unexpected-field validation
- `mydocs/working/task_m011_6_stage6.md` only after Stage 6.3 validation
- `mydocs/report/task_m011_6_report.md` only after fresh five-lane PASS and closure approval
- `mydocs/orders/20260908.md` remains `진행중` until closure approval

Evidence:

- `.omo/evidence/task-8-stage6-3-fresh-review-remediation.md` (ignored, sanitized)

### Stage 6.3 커밋 경계

이 addendum과 orders latest fresh-review remediation note만 먼저 고정한다.

```text
Task #6: Stage 6.3 재검토 교정 계획
```

제품, 테스트, 공식 문서 교정은 다음 implementation commit으로만 고정한다.

```text
Task #6 [Stage 6.3]: 동시 실행과 alias provenance 교정
```

Stage 6 closure report commit, final report commit, orders 완료 처리, `publish/task6` push, PR,
Issue #7 진입은 fresh Goal, QA, Code quality, Context, Security lanes가 모두 PASS하고 작업지시자가
별도 승인하기 전까지 차단한다. 기존 Stage 6/final report drafts는 uncommitted 상태로 byte-preserved
보존하며 이 governance commit에 포함하지 않는다.

## Stage 6.4 - latest failed fresh-review 교정 addendum

최신 fresh five-lane review 결과는 Security PASS, Code quality FAIL, Goal FAIL, Context FAIL,
QA FAIL이다. Security PASS는 same-user evidence/candidate race hardening을 medium note로 남겼지만
closure를 허용하지 않는다. Stage 6.4는 product code, tests, official docs, evidence, preserved report
draft를 수정하기 전 governance와 orders note만 먼저 고정한다. 아래 blocker를 모두 교정하고 direct
security review와 installed Electron probe를 포함한 fresh five-lane review가 전부 PASS하기 전까지 Stage
6 closure report commit, final report commit, orders 완료 처리, `publish/task6` push, PR, Todo 8 완료,
Issue #7 진입을 차단한다.

### latest failed fresh-review lane 판정

| Lane | 판정 | Stage 6.4 의미 |
|---|---|---|
| Security | PASS | Same-user race hardening note는 잔여 위험으로 보존하되 release boundary 차단 사유는 아니다. Fresh closure 전 direct security review를 다시 요구한다. |
| Code quality | FAIL | real Electron 43 `Helpers`/`Libraries` alias rejection, mixed-version alias binding gap, alias descendant traversal, helper error taxonomy를 교정한다. |
| Goal | FAIL | root `Versions/Current`와 root binary 및 conventional root directory aliases가 같은 canonical version에 묶이지 않아 목표 계약을 충족하지 못했다. |
| Context | FAIL | Stage 6.3의 concurrency 언어가 root Todo 5의 preflight-before-candidate-mutation 계약보다 앞서 해석될 수 있어 정정한다. |
| QA | FAIL | accepted-pending coordinator boundary와 executable final-evidence schema regression이 부족하고 QA checklist temporal wording이 맞지 않는다. |

### Stage 6.4 blocker 매핑

| Blocking finding | 재현된 동작 또는 결함 | 소유 파일 | 필수 테스트와 증거 |
|---|---|---|---|
| Electron 43 framework compatibility | 실제 Electron 43 framework root에는 `Versions/Current`, root framework binary, `Resources`, `Headers`, `Modules`, `Helpers`, `Libraries` aliases가 있을 수 있다. 현재 allowlist는 `Helpers`와 `Libraries`를 막아 설치된 번들을 거부한다. | `scripts/macos/framework-alias.mjs`, `scripts/macos/signing.mjs`, `tests/package-macos-signing.test.mjs` | complete conventional-layout fixture가 Current, root binary, Resources, Headers, Modules, Helpers, Libraries, nested executable/Mach-O descendants, one-time canonical inspection, installed Electron 43 discovery regression을 고정한다. Runtime evidence는 observed target count와 layout을 별도로 기록한다. |
| mixed-version alias binding | `Versions/Current -> A`인데 root binary 또는 root directory alias가 `Versions/B`로 향해도 같은 framework 내부라는 이유로 통과할 수 있다. | `scripts/macos/framework-alias.mjs`, `tests/package-macos-signing.test.mjs` | root framework binary alias와 모든 conventional root directory alias는 같은 framework의 same `Versions/Current` canonical version에 묶인다. Current -> A, root binary/resources -> B 같은 mixed-version layout은 reject한다. |
| allowed-alias nested descendants | 허용된 directory alias 자체는 검증되지만 traversal이 lexical alias path를 유지하면 nested signable descendant가 arbitrary alias처럼 오분류될 수 있다. | `scripts/macos/signing.mjs`, `scripts/macos/framework-alias.mjs` | directory alias provenance를 검증한 뒤 canonical `targetPath`로 descendant traversal을 진행한다. `Helpers`와 `Libraries` 내부 nested executable/Mach-O가 arbitrary alias가 아니라 same-current-version accepted alias descendant로 분류됨을 증명한다. |
| preflight ordering conflict | Stage 6.3은 candidate ownership을 모든 non-mutating preflight 직후로 썼지만 실제 plan text와 code flow가 notary profile preflight보다 reservation을 앞세웠다. 이는 root Todo 5의 preflight-before-candidate-mutation 계약과 충돌한다. | `scripts/release-macos.mjs`, `scripts/macos/release-lifecycle.mjs`, `tests/package-macos.test.mjs`, `docs/release-macos.md`, `docs/qa-checklist.md` | identity, Keychain, notary profile, connectivity preflight가 모두 candidate mutation 전에 끝난다. Atomic candidate reservation은 그 직후, staging, assembly, signing, evidence, submit, archive 전에 실행된다. Docs는 candidate가 absent여야 한다고 쓰고 notary connectivity가 candidate mutation 전에 온다고 정확히 말한다. |
| concurrent loser scope | Stage 6.3 loser-zero-profile assertion은 higher-priority preflight contract와 충돌한다. | `tests/package-macos.test.mjs`, `scripts/release-macos.mjs` | Stage 6.3의 loser-zero-profile assertion만 명시적으로 supersede한다. concurrent loser는 required non-mutating notary profile preflight를 수행할 수 있지만 candidate ownership, staging, assembly, signing, evidence writes, submit/info/log for artifact recovery, staple, archive, DMG, checksum은 0건이어야 한다. |
| accepted-pending coordinator boundary | module-level pending tests는 있으나 `acceptNotarization` 또는 full coordinator boundary에서 In Progress/Rejected가 downstream을 막는지 부족하다. | `scripts/macos/release-lifecycle.mjs`, `scripts/release-macos.mjs`, `tests/package-macos.test.mjs`, `tests/package-macos-notarization.test.mjs` | accepted-pending In Progress와 Rejected를 `acceptNotarization` 또는 full coordinator boundary로 통과시켜 no staple, no Gatekeeper, no archive, no DMG, no checksum, no resubmit을 증명한다. |
| executable final-evidence schema | QA evidence validator가 docs snippet 또는 unexecuted duplicated logic에 머물 수 있고 wrong root kind, missing/extra/mismatch fields, warning/error issues를 충분히 fail closed로 고정하지 않는다. | `scripts/macos/notarization-evidence.mjs`, `docs/qa-checklist.md`, `tests/package-macos-notarization.test.mjs` | wrong root kind, missing field, extra field, mismatched field, warning issue, error issue, valid app, valid DMG cases를 checked-in executable tests로 검증한다. 구현이 선택하면 strict final-evidence validator를 `scripts/macos/notarization-evidence.mjs`에서 reusable export로 빼고 docs와 tests가 같은 코드를 호출한다. |
| helper error taxonomy and LOC | alias helper가 generic `Error`를 던져 signing domain error와 일관되지 않을 수 있다. | `scripts/macos/framework-alias.mjs`, `scripts/macos/signing.mjs` | 250 production pure LOC 상한을 유지하면서 가능하면 alias helper가 decision을 return하거나 signing domain error를 일관되게 throw하게 한다. 불가하면 Stage report에 LOC와 error taxonomy tradeoff를 명시한다. |

### Stage 6.3 concurrency language 정정

- Root Todo 5 계약이 우선한다. 모든 identity, Keychain, notary profile, connectivity preflight는 candidate
  mutation 전에 끝나야 한다.
- Atomic exclusive candidate ownership은 위 preflight가 끝난 즉시 예약한다. 그 뒤에만 staging, app
  assembly, signing, evidence write, app submit, archive, DMG, checksum이 가능하다.
- Stage 6.3의 loser-zero-profile assertion만 supersede한다. concurrent loser는 non-mutating notary profile
  preflight를 수행할 수 있다.
- concurrent loser는 candidate ownership, staging, assembly, signing, evidence writes, submit/info/log for
  artifact recovery, staple, archive, DMG, checksum을 수행할 수 없다.
- Atomic exclusive candidate ownership과 caller-owned candidate cleanup guarantee는 유지한다. 실패 cleanup은
  owner token 또는 동등한 ownership proof가 있는 task-created candidate만 제거한다.

### Stage 6.4 산출물

수정:

- `scripts/macos/framework-alias.mjs`
- `scripts/macos/signing.mjs`
- `scripts/release-macos.mjs`
- `scripts/macos/release-lifecycle.mjs`
- `scripts/macos/notarization-evidence.mjs` if reusable strict final-evidence validator is chosen
- `tests/package-macos-signing.test.mjs`
- `tests/package-macos.test.mjs`
- `tests/package-macos-notarization.test.mjs`
- `docs/release-macos.md`
- `docs/qa-checklist.md`
- `mydocs/working/task_m011_6_stage6.md` only after Stage 6.4 validation
- `mydocs/report/task_m011_6_report.md` only after fresh five-lane PASS and closure approval
- `mydocs/orders/20260908.md` remains `진행중` until closure approval

Evidence:

- `.omo/evidence/task-8-stage6-4-fresh-review-remediation.md` (ignored, sanitized)

Preserved drafts:

- `mydocs/report/task_m011_6_report.md` and `mydocs/working/task_m011_6_stage6.md` must remain
  byte-for-byte unchanged by the governance commit. They are not Stage 6.4 closure evidence yet.

### Stage 6.4 validation matrix

| Check class | Required commands or proof | PASS condition |
|---|---|---|
| targeted alias | checked-in tests for Current, root binary, Resources, Headers, Modules, Helpers, Libraries, nested executable/Mach-O descendants, one-time canonical inspection, mixed-version rejection | valid Electron 43 conventional aliases pass, arbitrary aliases fail closed, mixed versions fail closed |
| installed Electron probe | checked-in discovery regression when dev dependency is installed, using fake read-only file runner and zero codesign calls | installed Electron 43 layout is accepted and target count/layout are recorded in ignored runtime evidence |
| preflight ordering | coordinator tests for identity, Keychain, notary profile and connectivity before candidate reservation | candidate directory is absent before preflight, then atomically reserved before staging, assembly, signing, evidence, submit, archive, DMG, checksum |
| concurrent loser | deterministic concurrent or two-invocation test | loser may complete non-mutating profile preflight but has zero ownership, staging, assembly, signing, evidence writes, submit/info/log for artifact recovery, staple, archive, DMG, checksum |
| accepted-pending coordinator | `acceptNotarization` or full coordinator boundary tests for In Progress and Rejected | no staple, no Gatekeeper, no archive, no DMG, no checksum, no resubmit |
| evidence schema | executable checked-in final-evidence validator tests | wrong root kind, missing field, extra field, mismatched field, warning issue, error issue reject; valid app and DMG pass |
| docs wording | `docs/release-macos.md` and `docs/qa-checklist.md` review | docs say absent candidate, not empty; notary connectivity before candidate mutation; pre-release absence/preflight checks occur before signed command, post-release checks occur after success |
| focused | `npm test -- tests/package-macos.test.mjs tests/package-macos-signing.test.mjs tests/package-macos-notarization.test.mjs tests/electron-contract.test.ts` | focused suite passes with checked-in regressions |
| full | `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` | all exit 0 or pre-existing environment limits are classified |
| package and smoke | unsigned package, signed missing-input expected failure, Electron smoke | unsigned succeeds; signed path fails before mutation when inputs are absent; smoke passes |
| protected | protected-path diff, whitespace, artifact cleanup, secret and publication scans | no protected diff, no whitespace issue, no tracked generated artifact, no secret leakage, no publication command |
| five-lane review | fresh Goal, QA, Code quality, Context, direct Security lanes plus installed Electron probe | all five lanes PASS before closure report, orders completion, push, PR, Todo 8, or Issue #7 |

### Stage 6.4 커밋 경계

이 addendum과 orders latest failed fresh-review remediation note만 먼저 고정한다.

```text
Task #6: Stage 6.4 재검토 교정 계획
```

제품, 테스트, 공식 문서 교정은 다음 implementation commit으로만 고정한다.

```text
Task #6 [Stage 6.4]: Electron alias와 preflight 계약 교정
```

Stage 6.2와 Stage 6.3에서 고정한 fixes와 250 production pure LOC 상한은 유지한다. Fresh five-lane
review가 모두 PASS하고 작업지시자가 별도 승인하기 전까지 Stage 6 closure reports, orders completion,
`publish/task6` push, PR, Todo 8 completion, Issue #7 entry는 blocked 상태다.

## Stage 6.5 - latest fresh review blocker 교정 addendum

최신 fresh five-lane review 결과는 Goal FAIL, QA PASS, Code quality FAIL, Context PASS, Security FAIL이다.
QA와 Context의 PASS는 Stage 6.4 검증 성공과 historical review 보존 경계가 유지됨을 뜻한다. Goal,
Code quality, Security는 두 concrete blocker를 직접 재현했으므로 Stage 6.5를 product code, tests,
official docs, evidence, report draft 수정 전에 governance와 orders note만 먼저 고정한다. 아래 blocker를
모두 교정하고 fresh reviewers가 두 direct reproduction을 테스트에만 의존하지 않고 다시 실행해 전부 PASS하기
전까지 closure reports, orders completion, `publish/task6` push, PR, Todo 8 completion, Issue #7 entry는
blocked 상태다. Stage 6.4의 focused/full/static/build/package/smoke 성공과 모든 historical review record는
그대로 보존한다. `mydocs/report/task_m011_6_report.md`와 `mydocs/working/task_m011_6_stage6.md` draft는
byte-for-byte 보존하고 이번 governance commit에 포함하지 않는다.

### latest fresh review lane 판정

| Lane | 판정 | Stage 6.5 의미 |
|---|---|---|
| Goal | FAIL | arbitrary `Versions/<non-current>/<FrameworkBinary>` symlink acceptance가 목표 계약을 막는다. |
| QA | PASS | Stage 6.4 validation success는 보존하되 Stage 6.5 교정 뒤 전체 surface를 다시 실행한다. |
| Code quality | FAIL | framework binary alias predicate와 Notarization severity validation이 fail-open이다. |
| Context | PASS | Stage 6.4 success, preserved drafts, historical review record 경계는 계속 유효하다. |
| Security | FAIL | unknown/malformed Notarization issue severity acceptance가 release gate를 fail-open한다. |

### Stage 6.5 blocker 매핑

| Blocking finding | 재현된 동작 | 필수 교정 | 소유 파일 | 필수 테스트와 증거 |
|---|---|---|---|---|
| arbitrary framework binary alias acceptance | `Versions/Current -> A`이고 symlink `Versions/B/Kit -> ../A/Kit`가 있으면 현재 `Versions/<name>/Kit` 3-segment candidate가 conventional로 간주되어 accepted된다. | 허용 framework binary alias는 conventional root framework binary symlink가 Current version binary를 가리키는 경우뿐이다. Canonical regular version binaries는 계속 traversable이지만, `Versions/*` 아래 arbitrary symlink alias는 fail closed한다. | `scripts/macos/framework-alias.mjs`, `tests/package-macos-signing.test.mjs` | checked-in filesystem regression으로 `Versions/B/Kit -> ../A/Kit`와 최소 하나의 arbitrary `Versions/A/<binary alias>` variant를 만들고 discovery/signing이 codesign/notary 전에 중단됨을 증명한다. Valid installed Electron 43 discovery, Current root binary, conventional directory aliases, canonical descendant traversal, mixed-version root rejection, one-time inspection은 유지한다. |
| Notarization issue severity fail-open | live-log review와 final-evidence validator가 exact lowercase `warning` 또는 `error` 이외의 arbitrary string을 허용한다. Empty string, uppercase, `critical`, unknown values가 모두 통과할 수 있다. | safe issue severity taxonomy는 lowercase `info` 하나뿐이다. Empty issues array는 valid이며, 그 밖의 모든 severity value는 fail closed한다. Live Apple log review와 final-evidence validation은 하나의 shared severity predicate 또는 parser를 사용해 drift를 막는다. | `scripts/macos/notarization-command.mjs`, `scripts/macos/notarization-evidence.mjs`, `tests/package-macos-notarization.test.mjs`, `tests/package-macos.test.mjs` only if coordinator downstream proof requires it | checked-in regressions은 `info` acceptance와 empty string, uppercase `INFO`, `Warning`, `ERROR`, `critical`, arbitrary strings, non-string values, extra issue fields, malformed issue objects rejection을 모두 포함한다. Coordinator-level proof는 unknown live severity가 staple, Gatekeeper, final archive, DMG, checksum, publication-adjacent work를 차단함을 보여야 한다. |

### Stage 6.5 ownership and source policy

- Approved implementation ownership is narrow: `scripts/macos/framework-alias.mjs`,
  `scripts/macos/notarization-command.mjs`, `scripts/macos/notarization-evidence.mjs`,
  `tests/package-macos-signing.test.mjs`, `tests/package-macos-notarization.test.mjs`, and
  `tests/package-macos.test.mjs` only if coordinator downstream proof requires it.
- Do not edit source, tests, official docs, reports, stage reports, README, package metadata, protected paths,
  evidence, Boulder, or report drafts in this governance task.
- Do not change docs unless current docs need one sentence clarifying that only informational issues are allowed.
  If needed, the docs change belongs to the later Stage 6.5 implementation commit, not this governance commit.
- Do not weaken Current binding, arbitrary alias rejection, preflight order, candidate ownership, no-resubmit,
  strict evidence, secret, or publication contracts.
- Every production module must remain at or below 250 pure nonblank, non-comment LOC.

### Stage 6.5 validation matrix

| Check class | Required commands or proof | PASS condition |
|---|---|---|
| targeted alias | checked-in filesystem tests for `Versions/B/Kit -> ../A/Kit` and an arbitrary `Versions/A/<binary alias>` variant | arbitrary aliases stop discovery/signing before codesign/notary; valid Electron 43, Current root binary, conventional directory aliases, canonical descendants, mixed-version rejection, one-time inspection remain intact |
| targeted severity | shared severity parser tests for `info`, empty issues array, malformed values, extra fields, malformed issue objects | only lowercase `info` and empty issues array pass; every other issue object or severity value fails closed |
| coordinator severity | coordinator-level proof using unknown live severity | staple, Gatekeeper, final archive, DMG, checksum, and publication-adjacent work are not reached |
| focused | `npm test -- tests/package-macos.test.mjs tests/package-macos-signing.test.mjs tests/package-macos-notarization.test.mjs tests/electron-contract.test.ts` | focused suite passes with checked-in regressions |
| full | `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` | all exit 0 or pre-existing environment limits are classified |
| package and smoke | unsigned package, signed missing-input mutation-zero, Electron smoke | unsigned succeeds; signed path fails before mutation when inputs are absent; smoke passes |
| cleanup | generated release, dist, build, smoke, temp, mount, and candidate ownership paths are reviewed | only task-owned generated outputs are removed; report drafts stay byte-for-byte unchanged |
| protected and secret | protected-path diff, whitespace, artifact scan, secret scan, publication scan | no protected diff, no whitespace issue, no tracked generated artifact, no secret leakage, no publication command |
| fresh review | Goal, QA, Code quality, Context, Security lanes rerun the two direct reproductions | all five lanes PASS before closure report, orders completion, push, PR, Todo 8, or Issue #7 |

### Stage 6.5 커밋 경계

이 addendum과 orders latest fresh review blocker note만 먼저 고정한다.

```text
Task #6: Stage 6.5 재검토 교정 계획
```

제품과 테스트 교정은 다음 implementation commit으로만 고정한다.

```text
Task #6 [Stage 6.5]: alias와 Notarization severity fail-closed 교정
```

Stage 6.5 implementation, fresh reviews, closure reports, orders completion, `publish/task6` push,
`master` PR, Todo 8 completion, Issue #7 entry는 이 governance commit 뒤에도 순차적으로 blocked다.

## UltraQA trigger 매핑

| 실패 클래스 | 주입/관찰 방법 | 필수 fail-closed 결과 | Stage/Evidence |
|---|---|---|---|
| malformed inputs | malformed/missing package version, malformed plist, invalid notary JSON/status fixture | candidate 생성 전 descriptive failure, downstream 호출 0건 | Stage 1–2, task-2/3/4 evidence |
| stale artifacts | non-empty `release/v0.1.1/`, 기존 final ZIP/DMG/SHA256SUMS fixture | overwrite/merge 없이 preflight 실패 | Stage 3–4, task-5/6 evidence |
| dirty worktree | fake runner의 `git status --porcelain`에 tracked/untracked product change 반환 | assembly/sign/submit 0건 | Stage 3–5, task-5/8 evidence |
| long Apple commands | delayed fake `notarytool --wait`, signal/timeout 주입, bounded stapler retry | premature success 없음, timeout은 unknown, 동일 bytes 자동 재제출 0건 | Stage 2/4, task-4/6 evidence |
| misleading success | exit 0 + malformed JSON, non-Accepted status, warning-bearing log, missing submission ID | success로 간주하지 않고 staple/archive/hash 차단 | Stage 2/4, task-4/6 evidence |
| timeout/resume | submit timeout 후 saved submission ID로 `info`/`log` fake trace 실행 | 새 submit 0건, Accepted+warning-free log 전 진행 0건 | Stage 2/4, task-4/6 evidence |
| interruption cleanup | coordinator 각 호출 지점에서 throw/signal 주입 | temp ZIP/extract/mount/partial final 제거, sanitized resume state만 보존 | Stage 3/4, task-5/6 evidence |
| symlink/path escape | app 밖 canonical target와 duplicate symlink fixture | discovery/signing 즉시 실패, outer sign/notary 0건 | Stage 2/4, task-3/6 evidence |
| credential leakage | sentinel profile/password/key path를 fake runner 반환/오류에 삽입 | stdout/stderr/error/evidence snapshot 어디에도 sentinel 없음 | Stage 2/4/5, task-4/6/8 evidence |
| forbidden publication | fake trace와 static scan에서 `gh release`, `git tag`, upload/publish 탐지 | 구현 이슈 실패 처리, 원격 ref/release 변경 0건 | Stage 3/5, task-5/8 evidence |
| pre-PR review blockers | Electron framework layout, detach failure, exact version, artifact-bound resume, timeout/abort, DMG runtime signing, ownership variance fixture와 review 재실행 | blocker 7건 교정, Stage 6 report 작성, fresh review PASS 전 PR 0건 | Stage 6, task-8-stage6 evidence |
| failed fresh review blockers | pre-build version entrypoint, traversal-order alias, accepted-log retry, absolute Apple tools, helper ownership, checked-in regression gaps, docs/evidence wording을 재현 | blocker 전건 교정, Stage 6.2 report 작성, five-lane PASS 전 closure 0건 | Stage 6.2, task-8-stage6-2 evidence |
| latest failed fresh review blockers | Electron 43 Helpers/Libraries alias, same-Current mixed-version binding, accepted alias descendant traversal, preflight-before-candidate ordering, accepted-pending coordinator boundary, executable evidence schema, docs temporal wording을 재현 | blocker 전건 교정, Stage 6.4 report 작성, direct security review 포함 five-lane PASS 전 closure 0건 | Stage 6.4, task-8-stage6-4 evidence |
| latest fresh review blockers | arbitrary `Versions/<non-current>/<FrameworkBinary>` symlink alias와 unknown/malformed Notarization issue severity acceptance를 재현 | blocker 2건 교정, Stage 6.5 report 작성, direct reproduction 포함 five-lane PASS 전 closure 0건 | Stage 6.5, task-8-stage6-5 evidence |

## 검증

- 각 Stage 검증 명령은 단계 보고서 작성 전에 실행한다.
- expected-failure 검증은 nonzero exit와 mutation 0건을 함께 증명해야 하며, 단순 오류 출력만으로
  통과시키지 않는다.
- 모든 fake-runner trace는 command/argv 순서를 기록하되 identity/profile 값과 환경 전체를
  기록하지 않는다.
- 실패한 검증은 단계 완료, 보고서 작성, 커밋 또는 다음 Stage 진입으로 처리하지 않는다.
- 계획 변경, file ownership 변경, 문서 위치 변경이 필요하면 구현계획서를 먼저 갱신하고
  작업지시자 승인을 다시 받는다.
- `docs/plan`, `docs/draft`, `.omo/boulder.json`, Prometheus 계획 체크박스의 diff는 모든
  Stage에서 빈 출력이어야 한다.
- 구현 이슈 #6의 최종 성공은 pipeline의 offline/fake-runner 준비 완료까지이며 실제 Apple
  서명/Notarization, tag, GitHub release 성공을 주장하지 않는다.
- pre-PR review blocker가 확인된 뒤에는 Stage 6 검증과 fresh review PASS 전까지 Stage 5 final
  closure와 PR publication을 완료로 취급하지 않는다.
- failed fresh review blocker가 확인된 뒤에는 Stage 6.2 검증과 fresh five-lane PASS 전까지 Stage 6
  closure report commit, orders 완료 처리, PR publication, Issue #7 진입을 완료로 취급하지 않는다.
- latest failed fresh review blocker가 확인된 뒤에는 Stage 6.4 검증과 fresh five-lane PASS 전까지 Stage
  6 closure report commit, final report commit, orders 완료 처리, PR publication, Todo 8 완료, Issue #7
  진입을 완료로 취급하지 않는다.
- latest fresh review blocker가 확인된 뒤에는 Stage 6.5 검증과 fresh five-lane PASS 전까지 Stage 6
  closure report commit, final report commit, orders 완료 처리, PR publication, Todo 8 완료, Issue #7
  진입을 완료로 취급하지 않는다.

## 커밋

- governance 문서는 이 구현계획서 승인 후 두 개의 독립 커밋으로 먼저 고정한다.
  - `Task #6: 수행 계획서 작성과 오늘할일 갱신`
  - `Task #6: 구현 계획서 작성`
- pre-PR review 실패 뒤 governance amendment와 orders 재개는 제품 교정 전에 별도 커밋으로 고정한다.
  - `Task #6: Stage 6 교정 계획과 오늘할일 재개`
- failed fresh review 뒤 Stage 6.2 governance amendment와 orders note는 제품 교정 전에 별도 커밋으로 고정한다.
  - `Task #6: Stage 6.2 재검토 교정 계획`
- latest failed fresh review 뒤 Stage 6.4 governance amendment와 orders note는 제품 교정 전에 별도 커밋으로 고정한다.
  - `Task #6: Stage 6.4 재검토 교정 계획`
- latest fresh review 뒤 Stage 6.5 governance amendment와 orders note는 제품 교정 전에 별도 커밋으로 고정한다.
  - `Task #6: Stage 6.5 재검토 교정 계획`
- Stage 산출물과 `mydocs/working/task_m011_6_stage{N}.md`는 같은 Stage 커밋에 둔다.
- Stage 1: `Task #6 Stage 1: v0.1.1 패키징 정체성과 로컬 패키지 경계 추가`
- Stage 2: `Task #6 Stage 2: Developer ID 서명과 Keychain Notarization 기반 추가`
- Stage 3: `Task #6 Stage 3: 서명과 이중 Notarization 릴리스 오케스트레이션 추가`
- Stage 4: `Task #6 Stage 4: macOS 서명 회귀 테스트와 릴리스 운영 문서 추가`
- Stage 5: `Task #6 Stage 5 + 최종 보고서: 서명 릴리스 파이프라인 검증 완료`
- Stage 6 제품 교정: `Task #6 Stage 6: pre-PR blocker 교정`
- Stage 6.1 후속 보강: `Task #6 [Stage 6.1]: Stage 6 교정 후속 보강`
- Stage 6.2 제품 교정: `Task #6 [Stage 6.2]: fresh review blocker 교정`
- Stage 6.4 제품 교정: `Task #6 [Stage 6.4]: Electron alias와 preflight 계약 교정`
- Stage 6.5 제품 교정: `Task #6 [Stage 6.5]: alias와 Notarization severity fail-closed 교정`
- Stage 6 검증 및 보고서: `Task #6 Stage 6 + 최종 보고서: pre-PR blocker 교정 검증 완료`
- 구현계획서, Stage, 최종 보고서의 각각의 승인 전에는 해당 커밋/push/PR을 실행하지 않는다.
- Stage 6.2 correction commit 뒤 fresh five-lane PASS와 closure commit 전에는 `publish/task6` push와
  `master` 대상 PR 생성을 실행하지 않는다.
- Stage 6.4 correction commit 뒤 fresh five-lane PASS와 closure commit 전에는 `publish/task6` push,
  `master` 대상 PR 생성, Todo 8 완료, Issue #7 진입을 실행하지 않는다.
- Stage 6.5 correction commit 뒤 fresh five-lane PASS와 closure commit 전에는 `publish/task6` push,
  `master` 대상 PR 생성, Todo 8 완료, Issue #7 진입을 실행하지 않는다.

## 단계 의존성

- Stage 1은 이 구현계획서의 명시적 승인과 governance 커밋 완료 뒤 시작한다.
- Stage 2는 Stage 1 검증, 보고서, 다음 단계 승인을 요구한다.
- Stage 2의 Todo 3 signing lane과 Todo 4 notarization lane은 공통 runner 계약을 고정한 뒤
  파일 소유권을 분리해 병렬 진행할 수 있다. 둘 다 통과해야 Stage 2가 끝난다.
- Stage 3은 Stage 2의 signing/notarization export와 error/result 계약이 확정된 뒤 시작한다.
- Stage 4는 Stage 3의 coordinator API와 순서가 확정된 뒤 시작한다. Todo 6 test lane과
  Todo 7 docs/security lane은 파일 소유권을 분리해 병렬 진행할 수 있다.
- Stage 5는 Stage 4 focused test와 문서/secret/protected-path 검증 및 보고서 승인 후 시작한다.
- Stage 6은 failed pre-PR review의 confirmed blocker 7건을 고친 뒤 Stage 6 report, final report
  갱신, fresh review PASS를 요구한다.
- Stage 6.2는 failed fresh review의 blocking finding 전건을 고친 뒤 checked-in regression matrix,
  corrected Stage 6 evidence wording, Stage 6 report 갱신, final report 갱신, fresh five-lane PASS를
  요구한다.
- Stage 6.4는 latest failed fresh review의 blocking finding 전건을 고친 뒤 Electron 43 installed
  discovery probe, root preflight-before-candidate ordering, coordinator pending-state, executable final-evidence
  schema, docs wording, Stage 6 report 갱신, final report 갱신, fresh five-lane PASS를 요구한다.
- Stage 6.5는 latest fresh review의 blocker 2건을 고친 뒤 arbitrary framework binary alias rejection,
  shared lowercase-info severity validation, coordinator downstream suppression proof, Stage 6 report 갱신,
  final report 갱신, fresh five-lane PASS를 요구한다.
- 이슈 #7은 Stage 6 구현 PR이 `master`에 병합되고 `origin/master`에 확인될 때까지 blocked다.

## 위험과 대응

- **tests-after의 중간 회귀 위험**: Stage 1 시작 전 baseline을 고정하고 Stage 1–3마다 기존
  테스트, syntax/import smoke, fake-runner characterization을 실행한 뒤 Stage 4에서 전체 계약을
  회귀 테스트로 잠근다.
- **병렬 lane 계약 불일치**: Stage 2는 runner result/error shape, Stage 4는 확정 export/command
  이름을 먼저 고정하고 lane별 파일 소유권을 겹치지 않게 한다.
- **Apple 도구의 장시간/모호한 결과**: exit 0만 신뢰하지 않고 JSON/status/log를 파싱하며,
  timeout은 unknown/resume로 처리하고 자동 재제출하지 않는다.
- **nested code 누락**: canonical discovery, deterministic ordering, post-sign rediscovery와 fixture
  coverage로 미서명 Mach-O/native object를 허용하지 않는다.
- **비밀정보 노출**: allowed env 이름만 공개하고 값/raw argv/env dump를 금지하며 sentinel
  redaction 테스트와 tracked-file scan을 수행한다.
- **부분 산출물 오인 게시**: stale artifact preflight, final allowlist, hash-last, finally cleanup을
  적용하고 구현 branch에 publication command를 두지 않는다.
- **공식 문서 선행 공개**: README의 v0.1.0 unsigned 사용자 안내를 유지하고 v0.1.1 공개 설치
  문구는 이슈 #7 publication 뒤에만 갱신한다.
- **pre-PR review blocker 재발**: Stage 6에서 blocker 7건을 exact file ownership과 focused tests로
  잠그고, fresh review PASS 전에는 PR publication과 Issue #7 진입을 차단한다.
- **fresh review blocker 재발**: Stage 6.2에서 실제 npm entrypoint, traversal-order alias,
  accepted-log retry, absolute Apple tool path, helper ownership, checked-in matrix, docs/evidence wording을
  모두 소유 파일과 검증 lane에 연결하고, five-lane PASS 전에는 closure와 PR publication을 차단한다.
- **latest failed fresh review blocker 재발**: Stage 6.4에서 Electron 43 `Helpers`/`Libraries`, same-Current
  alias binding, preflight-before-candidate ordering, concurrent loser scope, accepted-pending coordinator
  boundary, executable evidence schema, docs temporal wording을 소유 파일과 검증 lane에 연결하고,
  five-lane PASS 전에는 closure, PR publication, Todo 8 완료, Issue #7 진입을 차단한다.
- **latest fresh review blocker 재발**: Stage 6.5에서 arbitrary `Versions/<non-current>/<FrameworkBinary>`
  symlink alias와 unknown/malformed Notarization issue severity를 소유 파일과 검증 lane에 연결하고,
  direct reproduction 포함 five-lane PASS 전에는 closure, PR publication, Todo 8 완료, Issue #7 진입을 차단한다.

## 승인 요청 사항

다음 항목 전체에 대한 명시적 구현계획서 승인을 요청한다.

- Stage 1→Todo 2, Stage 2→Todos 3–4, Stage 3→Todo 5, Stage 4→Todos 6–7,
  Stage 5→Todo 8, Stage 6→Todo 8 review remediation의 여섯 Stage 매핑
- 각 Stage의 exact file ownership, behavior, validation, evidence, commit message와 단계별 승인 경계
- `runFile(command, args, options)`와 object-argument export를 포함한 injected-runner seam
- Stage 2의 signing/notarization 병렬 lane과 Stage 4의 tests/docs 병렬 lane
- tests-after 진행, baseline characterization, expected-failure의 nonzero+mutation-zero 판정
- Keychain profile 전용 Notarization, secret non-disclosure, protected paths, final allowlist,
  timeout/resume/no-resubmit, interruption cleanup 경계
- `docs/release-macos.md`, `docs/qa-checklist.md`, `README.md`, `mydocs/`의 승인된 문서 위치 유지
- 실제 signing/Notarization/tag/GitHub release 작업을 이슈 #7로 제외하는 범위
- 승인 후 governance 문서 두 커밋을 먼저 만들고 Stage 1 제품 구현에 진입하는 순서
- pre-PR review 실패 이후 Stage 6 교정 계획, exact ownership, required tests, validation, evidence,
  report, correction commit, closure commit 및 PR 차단 조건
- failed fresh review 이후 Stage 6.2 교정 계획, Stage 6.1 helper ownership, release-version preflight,
  checked-in regression matrix, docs/evidence wording correction, governance commit, implementation commit,
  fresh five-lane PASS 전 closure 차단 조건
- latest failed fresh review 이후 Stage 6.4 교정 계획, Electron 43 conventional alias compatibility,
  same-current-version binding, preflight-before-candidate ordering, coordinator pending-state regression,
  executable final-evidence schema, docs wording correction, governance commit, implementation commit,
  direct security review 포함 fresh five-lane PASS 전 closure 차단 조건
- latest fresh review 이후 Stage 6.5 교정 계획, arbitrary framework binary alias fail-closed,
  Notarization severity lowercase-info taxonomy, shared severity parser, coordinator downstream suppression,
  governance commit, implementation commit, direct reproduction 포함 fresh five-lane PASS 전 closure 차단 조건

이 구현계획서가 명시적으로 승인되기 전에는 governance 문서를 포함한 어떤 커밋도 만들지
않고, 제품/소스/테스트/공식 문서를 수정하거나 live Apple/GitHub release 명령을 실행하지
않는다.
