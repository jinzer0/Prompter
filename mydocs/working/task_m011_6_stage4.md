# Task #6 Stage 4 단계 보고서

GitHub Issue: [#6](https://github.com/jinzer0/Prompter/issues/6)
구현계획서: [`task_m011_6_impl.md`](../plans/task_m011_6_impl.md)
Stage: 4

## 단계 목적

Prometheus Todos 6-7에 따라 Stage 3에서 고정한 macOS signed release coordinator 계약을
repository 테스트와 유지관리자 문서로 고정했다. Lane 4A는 tests-after 회귀 테스트만 다뤘고,
Lane 4B는 문서와 좁은 Apple secret artifact ignore만 다뤘다. Stage 4 closure에서는 두 lane을
함께 검증하고, Stage 4 lint gate에 필요한 Stage 2 signing/notarization 모듈의 Biome 전용
formatting diff도 포함했다. 실제 Apple, Keychain, signing, Notarization, Gatekeeper, GitHub,
tag, push, release 작업은 실행하지 않았다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.gitignore` | Apple release credential artifact에 한정된 `AuthKey_*.p8`, `*.p12`, `*.mobileprovision` ignore만 추가했다. broad `*.key` ignore는 추가하지 않았다. |
| `README.md` | public v0.1.0 unsigned 설치 안내를 유지하면서 maintainer-only `npm run package:release:macos` 경계와 no-publication 조건을 추가했다. |
| `docs/release-macos.md` | full Xcode, Developer ID identity, Keychain notary profile, 두 non-secret env 이름, unsigned/release 명령 분리, app ZIP과 DMG 두 제출, sanitized evidence, timeout resume, fail-closed/no-publication 경계를 문서화했다. |
| `docs/qa-checklist.md` | signed macOS release QA를 env/command/export/artifact/evidence/signature/notary/staple/Gatekeeper/read-only mount/extract/smoke 검증 명령에 매핑했다. |
| `tests/electron-contract.test.ts` | package version과 release script 계약, renderer/preload/IPC credential surface 부재를 검증했다. `--apple-id` 부정 assertion은 문자열 fragment 조합으로 유지해 Stage 4 delta forbidden scan을 비웠다. |
| `tests/package-macos.test.mjs` | versioned ZIP, arm64-only release, coordinator two-submission order, hash-last, fail-closed downstream suppression, cleanup, redaction, exact identity failure를 회귀 테스트로 고정했다. |
| `tests/package-macos-signing.test.mjs` | helper app, framework, dylib, `.node`, XPC, executable Mach-O, symlink duplicate/escape, deterministic nested-before-outer signing, entitlement partition, verification-only `--deep`을 fake runner로 검증했다. |
| `tests/package-macos-notarization.test.mjs` | strict option allowlist, profile preflight, JSON parse, Accepted+log, warning/error block, timeout unknown/resume, bounded staple retry, app/DMG artifact kinds, redaction을 fake runner로 검증했다. |
| `vitest.config.ts` | Stage 4 신규 signing/notarization suite를 checked-in focused test include에 추가했다. |
| `scripts/macos/signing.mjs` | Stage 4 lint gate 통과를 위한 Biome-only import ordering and formatting correction을 적용했다. runtime token과 export는 유지했다. |
| `scripts/macos/notarization.mjs` | Stage 4 lint gate 통과를 위한 Biome-only line wrapping and formatting correction을 적용했다. runtime token과 export는 유지했다. |
| `.omo/evidence/task-6-apple-developer-id-notarization-release.txt` | ignored evidence를 final checked-in Vitest include와 82-test 결과에 맞게 갱신했다. 커밋에는 포함하지 않는다. |
| `.omo/evidence/task-7-apple-developer-id-notarization-release.md` | ignored evidence가 final docs contract와 no-live-operation correction을 기록하고 있음을 확인했다. 커밋에는 포함하지 않는다. |
| `mydocs/working/task_m011_6_stage4.md` | Stage 4 검증 결과, 보안 scan 분류, evidence path, 잔여 위험, Stage 5 영향과 승인 요청을 기록한다. |

## 본문 변경 정도 / 본문 무손실 여부

문서 작업은 기존 public README의 v0.1.0 설치명과 unsigned release 안내를 보존하고,
유지관리자 전용 signed release 운영 문서만 추가했다. `docs/release-macos.md`는 신규 문서다.
`docs/qa-checklist.md`는 기존 checklist 아래에 signed release 검증 섹션과 security row만 추가했다.

코드 작업은 Stage 4 tests-after와 checked-in Vitest include, 그리고 Stage 4 lint gate에 필요한
formatter-only Stage 2 module correction에 한정된다. Runtime release coordinator, signing,
notarization 동작은 새 기능으로 변경하지 않았다. `docs/plan/**`, `docs/draft/**`, `.omo/boulder.json`,
prior reports, approved plans, release artifacts, GitHub/tag/publication surface는 수정하지 않았다.

## 검증 결과

구현계획서 Stage 4 lines 393-402의 정확한 검증 명령:

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

결과:

- OK: focused Vitest는 `Test Files 4 passed (4)`, `Tests 82 passed (82)`로 통과했다. 실행 중
  `better-sqlite3` Node native rebuild가 수행됐고, upstream native addon compile warning
  `cast-function-type-mismatch` 1건이 informational warning으로 출력됐다.
- OK: `npm run typecheck`는 Electron, renderer, test TypeScript project 모두 출력 없이 exit 0으로 통과했다.
- OK: `npm run lint`는 `Checked 494 files in 92ms. No fixes applied.`로 통과했다. 기존
  `biome.json`의 `linter.recommended` deprecation 정보 1건만 출력됐다.
- OK: 문서/명령 대응 scan은 `PROMPTER_SIGNING_IDENTITY`, `PROMPTER_NOTARY_PROFILE`,
  `npm run package`, `npm run package:release:macos`, `notarytool`, `stapler`, `spctl`,
  `hdiutil`, `SHA256SUMS`가 docs/README/package/scripts에 의도한 위치로 매핑됨을 확인했다.
- OK: `.gitignore` narrow pattern scan은 `AuthKey_*.p8`, `*.p12`, `*.mobileprovision` 세 줄만
  출력했다.
- OK with classification: broad forbidden-pattern scan은 6건을 출력했다. 모두 `origin/master`에도
  같은 내용으로 존재하는 baseline-only hit다. 세 건은 protected archived plan
  `docs/plan/plan_0019.md`의 문서 예시이고, 세 건은 Phase 19 synthetic privacy-test fixtures다.
  이들은 credential leak가 아니며 Stage 4에서 수정하지 않았다.
- OK: `GIT_MASTER=1 git diff --exit-code origin/master -- docs/plan docs/draft .omo/boulder.json`는
  출력 없이 exit 0으로 통과했다.
- OK: `GIT_MASTER=1 git status --short`는 보고서 작성 전 승인된 Stage 4 소스/테스트/문서/config
  파일과 신규 Stage 4 문서/테스트만 표시했다. `.omo`는 ignored 상태이며 commit 대상이 아니다.
- OK: `GIT_MASTER=1 git diff --check`는 출력 없이 exit 0으로 통과했다.

추가 Stage 4 closure gate:

```bash
node --check scripts/macos/signing.mjs
node --check scripts/macos/notarization.mjs
node --input-type=module -e 'const s=await import("./scripts/macos/signing.mjs"); const n=await import("./scripts/macos/notarization.mjs"); const sKeys=Object.keys(s).sort(); const nKeys=Object.keys(n).sort(); console.log(JSON.stringify({signing:sKeys,notarization:nKeys})); if (JSON.stringify(sKeys)!==JSON.stringify(["discoverSignableCode","signAppBundle","verifyAppSignature","verifyDmgSignature"].sort())) throw new Error("signing export set"); if (JSON.stringify(nKeys)!==JSON.stringify(["assessGatekeeper","fetchNotaryLog","preflightNotaryProfile","stapleAndValidate","submitAndWait"].sort())) throw new Error("notarization export set");'
GIT_MASTER=1 git grep -n -E '^\*\.key$|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|--apple-id|--password' origin/master -- .gitignore docs README.md scripts tests
GIT_MASTER=1 git diff --unified=0 HEAD -- .gitignore docs README.md scripts tests | rg -n '^\+.*(^\*\.key$|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|--apple-id|--password)'
test -f .omo/evidence/task-6-apple-developer-id-notarization-release.txt && test -f .omo/evidence/task-7-apple-developer-id-notarization-release.md
GIT_MASTER=1 git status --short --ignored .omo release dist dist-electron build out coverage playwright-report test-results
```

결과:

- OK: signing/notarization syntax check는 둘 다 출력 없이 exit 0으로 통과했다.
- OK: side-effect 없는 import/export check는
  `{"signing":["discoverSignableCode","signAppBundle","verifyAppSignature","verifyDmgSignature"],"notarization":["assessGatekeeper","fetchNotaryLog","preflightNotaryProfile","stapleAndValidate","submitAndWait"]}`를
  출력하고 exit 0으로 통과했다.
- OK: `origin/master` baseline grep은 broad scan의 6건과 같은 protected docs/privacy fixture hit만
  출력했다.
- OK: Stage 4 delta forbidden credential/private-key literal scan은 출력 없이 exit 1이었다. 즉 새로
  추가된 `*.key`, private-key block, `--apple-id`, `--password` line은 없다.
- OK: 두 evidence 파일이 모두 존재한다. Todo 6 evidence는 checked-in `vitest.config.ts`와 82-test
  final state에 맞게 갱신했고, Todo 7 evidence는 docs contract와 no-live-operation correction을
  기록한다.
- OK: generated-artifact check는 `!! .omo/`만 출력했다. `release`, `dist`, `dist-electron`, `build`,
  `out`, `coverage`, `playwright-report`, `test-results` artifact는 표시되지 않았다.
- MISS(환경 한계): LSP diagnostics는 sibling worktree path가 request cwd 밖이라고 거부했다.
  성공으로 표기하지 않는다. Stage 4는 syntax/import, focused Vitest, typecheck, lint로 대체 검증했다.

수동 QA surface:

- Library/SDK/test lane surface로 project-local Vitest가 실제 Stage 4 fake runner scenarios를 실행했다.
  runner는 injected function이며 live `codesign`, `notarytool`, `stapler`, `spctl`, `hdiutil`, Keychain,
  GitHub를 호출하지 않았다.
- Maintainer documentation surface는 command/name mapping scan과 checklist source parsing으로 확인했다.
  문서는 정확한 env/command/export/artifact/evidence 이름을 담고, public v0.1.0 unsigned notice를 유지한다.

## 잔여 위험

- 실제 Developer ID signing, Apple Notarization, stapling, Gatekeeper, DMG mount, final smoke-open,
  GitHub Release, tag, upload는 Stage 5 또는 이슈 #7의 명시 승인 뒤 live 환경에서만 실행해야 한다.
- `scripts/macos/signing.mjs`와 `scripts/macos/notarization.mjs`는 Biome formatting 뒤 physical pure LOC가
  각각 255, 314로 측정된다. 이번 Stage 요구는 verified Biome-only correction 포함이며, runtime refactor는
  승인 범위 밖이라 수행하지 않았다.
- `tests/electron-contract.test.ts`와 `tests/package-macos.test.mjs`는 기존 central contract test 성격상
  250 LOC를 초과한다. 기존 파일 구조를 Stage 4에서 재분할하지 않았다.

## 다음 단계 영향

- Stage 5 / Prometheus Todo 8은 이 Stage 4 tests-after와 maintainer docs contract를 통합 검증의
  기준으로 사용한다.
- Broad forbidden scan은 historical protected docs와 synthetic privacy fixtures를 baseline-only hit로
  분류해야 하며, Stage 4 delta scan의 empty result를 credential safety 증거로 사용한다.
- 이슈 #7 전까지 public README 설치 안내는 v0.1.0 unsigned release를 계속 가리켜야 한다.

## 승인 요청

- Stage 4 산출물, 검증 결과, baseline-only security-scan classification을 승인하면 Stage 5 / Prometheus
  Todo 8 통합 검증으로 진행한다.
