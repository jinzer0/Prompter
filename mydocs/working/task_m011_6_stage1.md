# Task #6 Stage 1 단계 보고서

GitHub Issue: [#6](https://github.com/jinzer0/Prompter/issues/6)
구현계획서: [`task_m011_6_impl.md`](../plans/task_m011_6_impl.md)
Stage: 1

## 단계 목적

Prometheus Todo 2에 따라 v0.1.1 패키지 정체성과 unsigned 로컬 패키징 경계를 확립했다.
패키지 버전, 앱과 helper의 bundle identifier 및 plist 버전, version/architecture가 포함된
ZIP·DMG 이름을 하나의 계약으로 맞췄다. 기존 `npm run package`와 `npm run make`는 Apple
자격 증명을 읽지 않는 unsigned 로컬 경로로 유지하고, release 명령은 Stage 3 coordinator가
생기기 전까지 candidate 변경 전에 fail-closed하도록 분리했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `package.json` | root 버전을 `0.1.1`로 올리고 기존 unsigned `package`/`make`와 분리된 `package:release:macos` preflight를 추가했다. |
| `package-lock.json` | lockfile 최상위와 root package 버전을 `0.1.1`로 동기화했다. |
| `scripts/package-macos.mjs` | `assembleMacOSApp`, injected-runner 기반 `createZipArchive`, 기존 `createDmgArchive`를 export하고 앱 조립, plist identity/version, versioned archive, generic x64, cleanup 및 release preflight 경계를 구현했다. |
| `tests/package-macos.test.mjs` | 직접 영향을 받는 main/helper bundle identifier 기대값을 현재 계약으로 교정했다. |
| `tests/electron-contract.test.ts` | 직접 영향을 받는 packaging identity, versioned ZIP template 및 실행 파일 경로 기대값을 현재 계약으로 교정했다. |
| `mydocs/working/task_m011_6_stage1.md` | Stage 1 결함 교정, 검증 결과, cleanup, 잔여 위험과 다음 단계 승인 경계를 기록했다. |

초기 구현 검증에서는 다음 결함을 확인했다.

- 첫 검토 snapshot의 `scripts/package-macos.mjs`가 298 pure LOC로 250 LOC 상한을 넘었다.
- identity/path 변경 뒤 focused suite에서 직접 packaging 계약을 검증하는 2개 테스트의
  3개 assertion이 이전 `com.local.prompter` 및 archive/path 형태를 유지해 실패했다.
- `assembleMacOSApp`가 `dirname(appPath)`를 재귀 삭제해 caller 소유 sibling sentinel까지
  지우는 결함이 있었다.

중복 plist 갱신과 source-copy 구성을 통합해 script를 정확히 250 pure LOC로 줄였고, 직접
영향 테스트를 현재 identity/path 계약으로 교정했다. 앱 조립 cleanup은 `appPath`만 교체하고
실패 시 partial app만 제거하도록 수정했다. synthetic success/failure/malformed fixture에서
sibling sentinel이 모두 byte-identical하게 보존되고 failure partial app만 제거됨을 재확인했다.

## 본문 변경 정도 / 본문 무손실 여부

코드 작업이므로 문서 원문 재작성은 해당 없다. 기존 unsigned `npm run package`와
`npm run make`, generic local arm64/x64 helper, DMG staging/cleanup 동작은 유지했다. 패키지
identity/version/archive 이름과 release fail-closed 경계만 승인된 Stage 1 범위에서 변경했다.
`docs/plan/**`, `docs/draft/**`, `.omo/boulder.json`, README, renderer/IPC 제품 surface 및 Stage 2
산출물은 변경하지 않았다.

## 검증 결과

구현계획서 Stage 1의 정확한 검증 명령:

```bash
node --check scripts/package-macos.mjs
npm test -- tests/package-macos.test.mjs tests/electron-contract.test.ts
npm run typecheck
rg -n '"version": "0\.1\.1"|com\.jinzer0\.prompter|CFBundleShortVersionString|CFBundleVersion|unsigned local|package:release:macos' package.json package-lock.json scripts/package-macos.mjs
GIT_MASTER=1 git status --short
GIT_MASTER=1 git diff --check
GIT_MASTER=1 git diff --exit-code origin/master -- docs/plan docs/draft .omo/boulder.json
```

결과:

- OK: Node ESM 구문 검사가 exit 0으로 통과했다.
- OK: focused Vitest는 2개 파일, 40개 테스트가 모두 통과해 focused failure는 0개다.
- OK: Electron, renderer, test TypeScript typecheck가 모두 exit 0으로 통과했다.
- OK: exact contract scan에서 root/lock `0.1.1`, `com.jinzer0.prompter`, 두 plist version key,
  `unsigned local`, `package:release:macos`가 확인됐다.
- OK: status에는 승인된 Stage 1 제품/직접 테스트 파일 5개만 있었고, `git diff --check`와
  보호 경로 diff 검사는 빈 출력과 exit 0이었다.

교정 및 실사용 focused regression gate:

```bash
node --input-type=module -e 'const m=await import("./scripts/package-macos.mjs"); for (const name of ["assembleMacOSApp","createZipArchive","createDmgArchive"]) if (typeof m[name] !== "function") throw new Error(name);'
awk '!/^[[:space:]]*$/ && !/^[[:space:]]*(\/\/|#|--)/' scripts/package-macos.mjs | wc -l
npm run lint
env -u PROMPTER_SIGNING_IDENTITY -u PROMPTER_NOTARY_PROFILE npm run package
env -u PROMPTER_SIGNING_IDENTITY -u PROMPTER_NOTARY_PROFILE npm run make
env -u PROMPTER_SIGNING_IDENTITY -u PROMPTER_NOTARY_PROFILE npm run package:release:macos
```

결과:

- OK: side-effect 없는 import에서 세 export가 함수로 확인됐고 import만으로 build/release
  산출물이 생성되지 않았다.
- OK: `scripts/package-macos.mjs`는 281 total line, 31 blank line, 0 comment-only line,
  정확히 250 pure LOC다. 첫 298 pure LOC snapshot의 상한 위반은 해소됐다.
- OK: synthetic fixture에서 success/failure/malformed sibling sentinel 보존, failure partial app
  cleanup, malformed version mutation 0건, generic x64 ZIP
  `Prompter-0.1.1-mac-x64.zip`, main/helper identity와 두 version field, injected
  `/usr/bin/hdiutil` argv 및 versioned DMG 이름을 확인했다.
- OK: lint는 488개 파일을 검사해 오류와 수정 사항 없이 통과했다. 기존 Biome
  `linter.recommended` deprecation 정보 1건만 출력됐다.
- OK: Apple 입력을 제거한 실제 `npm run package`와 `npm run make`가 각각 통과하고
  `unsigned local`을 출력했다. 두 실행 모두 `Prompter-darwin-arm64/`,
  `Prompter-0.1.1-mac-arm64.zip`, `Prompter-0.1.1-mac-arm64.dmg`만 생성했다.
- OK: 실제 app, ZIP clean extraction, read-only DMG mount에서
  `CFBundleIdentifier=com.jinzer0.prompter`, `CFBundleShortVersionString=0.1.1`,
  `CFBundleVersion=0.1.1`을 확인했다. `hdiutil verify`는 VALID, image format은 UDZO였다.
- OK: release preflight는 Apple credential 값을 제공하거나 live Apple 명령을 호출하지 않은
  상태에서 missing input을 설명하며 exit 1로 실패했다. 실행 전후
  `release/v0.1.1/stale-sentinel.txt`의 SHA-256과 directory membership이 같아 candidate
  mutation 0건을 증명했다.
- OK: 검증 뒤 task-owned `release/`, `dist/`, `dist-electron/`, `node_modules/`, synthetic
  fixture, extraction 및 mount 경로를 제거했다. 관련 process와 mount가 남지 않았다.
- MISS(환경 한계): LSP diagnostics는 현재 서비스 request root가 sibling worktree
  `/Users/kjy/Desktop/Codes/projects/Prompter-task6`를 허용하지 않아 실행되지 않았다.
  대신 focused test, typecheck, lint 및 Node syntax/import 검사를 모두 통과했다.

## 잔여 위험

- `scripts/package-macos.mjs`는 정확히 250 pure LOC로 상한의 warning band에 있다. 추가 기능은
  이 파일에 누적하지 않고 승인된 Stage 2 signing/notarization 모듈과 Stage 3 coordinator로
  분리해야 한다.
- Developer ID signing, Keychain-profile Notarization, timeout/resume, redaction 및 exhaustive
  failure coverage는 아직 구현되지 않았다. Stage 2–4의 승인된 범위이며 실제 Apple 호출은
  구현 이슈 #6이 아니라 종속 릴리스 이슈 #7의 별도 승인 대상이다.
- `npm ci`는 기존 dependency audit 10건(4 moderate, 6 high), install-script 차단 안내를
  출력했다. 이번 Stage에서 dependency나 정책을 변경하지 않았고 package/build/test는 통과했다.

## 다음 단계 영향

- Stage 2 Prometheus Todos 3–4는 이번 Stage에서 고정한 `runFile(command, args, options)` 형태와
  조립/아카이브 export를 이어받아 signing과 notarization 모듈을 서로 분리된 lane으로 만든다.
- unsigned local 경로는 계속 Apple 입력을 읽지 않아야 하며, release 경로는 Stage 3
  coordinator가 생길 때까지 현재처럼 candidate mutation 전에 fail-closed해야 한다.
- Stage 2 진입은 이 보고서와 Stage 1 atomic commit에 대한 작업지시자의 명시적 승인 전까지
  차단된다. Stage 2 파일, signing/notarization 파일 및 coordinator는 작성하지 않았다.

## 승인 요청

- Stage 1 산출물, 결함 교정, 검증 및 잔여 위험을 승인하면 Stage 2 / Prometheus Todos 3–4
  진입을 명시적으로 승인해 주시기 바란다. 승인 전에는 Stage 2를 시작하지 않는다.
