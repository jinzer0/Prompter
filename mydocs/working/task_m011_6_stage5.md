# Task #6 Stage 5 단계 보고서

GitHub Issue: [#6](https://github.com/jinzer0/Prompter/issues/6)
구현계획서: [`task_m011_6_impl.md`](../plans/task_m011_6_impl.md)
Stage: 5

## 단계 목적

Prometheus Todo 8에 따라 Stage 1-4의 v0.1.1 macOS 서명 릴리스 준비를 통합 검증했다. 이 단계는
실제 Apple 서명, Notarization, Gatekeeper, GitHub Release, tag 또는 게시를 수행하지 않고, unsigned
로컬 패키지와 Apple 입력 누락 signed 경로의 fail-closed 경계, 전체 회귀, Electron smoke, 보안 및
보호 경로를 offline으로 확인하는 범위다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.omo/evidence/task-8-apple-developer-id-notarization-release.md` | ignored sanitized 검증 명령 상태, unsigned hash, signed mutation-zero, scan 및 cleanup receipt를 기록했다. |
| `mydocs/working/task_m011_6_stage5.md` | Stage 5 통합 검증, 분류, 잔여 위험과 승인 경계를 기록했다. |
| `mydocs/report/task_m011_6_report.md` | 모든 Stage와 수용 기준, 후속 Issue #7 진입 조건을 장기 보관용으로 정리했다. |

Stage 1-4의 승인된 commit은 계획과 일치한다.

| Stage | Commit | Subject |
|---|---|---|
| 1 | `b6f19ed` | `Task #6 Stage 1: v0.1.1 패키징 정체성과 로컬 패키지 경계 추가` |
| 2 | `bd0d3d4` | `Task #6 Stage 2: Developer ID 서명과 Keychain Notarization 기반 추가` |
| 3 | `06884a5` | `Task #6 Stage 3: 서명과 이중 Notarization 릴리스 오케스트레이션 추가` |
| 4 | `052c1f4` | `Task #6 Stage 4: macOS 서명 회귀 테스트와 릴리스 운영 문서 추가` |

## 본문 변경 정도 / 본문 무손실 여부

제품 source, tests, configs, public docs, approved plans, prior reports, protected paths, Boulder와
orders는 final closure 승인 뒤 별도로 완료 갱신한다. 이 단계의 tracked report 변경은 Stage 5 및 최종 보고서 두 개뿐이며,
검증 evidence와 notepad은 `.omo/` ignore 아래에만 추가했다. 공개 README는 v0.1.0 unsigned
설치 안내를 유지하고, signed maintainer path는 별도 문서로만 남아 있다.

## 검증 결과

실행 순서와 sanitized 결과는
[`task-8-apple-developer-id-notarization-release.md`](../../.omo/evidence/task-8-apple-developer-id-notarization-release.md)에
기록했다.

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

결과:

- OK: focused Vitest는 4 files, 82 tests가 모두 통과했다.
- OK: typecheck와 lint가 exit 0으로 통과했다. lint는 494 files를 검사했고, 기존 Biome deprecated-config 정보 1건만 출력했다.
- OK: full Vitest는 119 files, 817 tests가 모두 통과했다.
- OK: production build가 exit 0으로 완료했다. native addon cast warning과 Vite chunk-size warning은 기존 upstream/build 정보이며 실패가 아니다.
- OK: Apple 입력을 non-printing unset한 unsigned package는 exit 0이고 `unsigned local` app/ZIP/DMG를 만들었다. app plist identity/version, ZIP 경로와 ZIP/DMG SHA-256을 기록한 뒤 이 validation 소유 artifact만 정리했다.
- OK: 같은 조건의 signed command는 exit 1로 종료했다. 실행 전후 `release/v0.1.1/`, release Notarization evidence path, tracked status가 모두 변하지 않아 candidate mutation 0건이다. 이 expected nonzero는 fail-closed 성공 조건이다.
- OK: `npm run test:smoke`는 Electron Playwright 49 passed로 통과했다.
- OK with classification: broad credential/private-key scan의 18 hits는 승인된 Task #6 governance literals 12건, protected historical plan example 3건, synthetic Phase 19 privacy fixture 3건이다. 실제 credential material은 없다.
- OK with classification: report draft 작성 후 final broad scan은 Stage 5의 verbatim validation command 1건이 더해진 19 hits를 보였다. 추가 hit도 governance literal이며 credential material이 아니다.
- OK: scoped product credential scan, renderer/preload/bridge/IPC surface scan, renderer/IPC delta scan은 모두 match 0으로 끝났다. main-process-only encrypted key retrieval은 source/test로 확인했고 renderer bridge에는 plaintext getter가 없다.
- OK: README는 v0.1.0 unsigned public notice를 유지하고, signed maintainer path와 Issue #7 publication boundary를 별도로 문서화한다.
- OK: protected-path diff, tracked status, `git diff --check`가 모두 clean이었다. cleanup 후 release/dist/build/smoke artifact paths는 모두 absent다.
- MISS(환경 제한): LSP diagnostics는 sibling worktree path가 request cwd 밖이라는 도구 제한으로 실행되지 않았다. product 검증은 focused/full tests, typecheck, lint, build 및 smoke로 대체했고, report markdown은 whitespace check로 확인했다.

## 잔여 위험

- 실제 Developer ID identity, unlocked Keychain profile, Apple Notarization, stapling, Gatekeeper assessment, final signed candidate inspection, GitHub tag/release/upload/publication은 실행하지 않았다. 이는 Issue #7의 별도 승인 범위다.
- native rebuild의 upstream cast warnings, Biome deprecated-config information, Vite chunk-size warning은 관찰됐으나 validation exit status와 제품 동작을 막지 않았다.
- combined commit 및 orders 완료 갱신은 작업지시자의 `Continue` 승인 범위에 포함됐다. final PR CI, 원격 상태 검증, `publish/task6` push, `master` 대상 PR 생성, review, merge, issue close는 아직 실행하지 않았고 별도 승인 전까지 수행하지 않는다.

## 다음 단계 영향

- 구현 Issue #6은 offline/fake-runner 준비와 통합 검증까지 완료했다. Issue #7은 이 구현 PR이 `origin/master`에 merge된 뒤에만 시작할 수 있다.
- Issue #7 시작 전에는 clean ARM64 macOS worktree, full Xcode, 정확히 하나의 Developer ID identity, unlocked Keychain notary profile, Apple network readiness, empty `release/v0.1.1/`, signed artifact QA 계획 및 명시 승인을 다시 확인해야 한다.
- Issue #7에서만 실제 Apple 및 GitHub release operations를 수행하며, 공개 README v0.1.0 unsigned 안내는 해당 release가 완료될 때까지 바꾸지 않는다.

## 승인 기록 및 남은 승인 요청

- 작업지시자가 Stage 5와 최종 보고서 draft, offline 검증 결과, expected signed nonzero의 mutation-zero proof, orders 완료 갱신 및 다음 subject의 combined commit을 `Continue`로 승인했다: `Task #6 Stage 5 + 최종 보고서: 서명 릴리스 파이프라인 검증 완료`.
- 이 승인에 따라 canonical orders row는 `완료`로 갱신한다. 이후 `publish/task6` push와 `master` 대상 open PR 생성, CI 확인, review, merge, issue close는 별도의 명시 승인 후에만 진행한다.
