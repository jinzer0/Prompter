# Task #6 Stage 6 단계 보고서

GitHub Issue: [#6](https://github.com/jinzer0/Prompter/issues/6)
구현계획서: [`task_m011_6_impl.md`](../plans/task_m011_6_impl.md)
Stage: 6

## 단계 목적

Stage 5 뒤 pre-PR review와 이어진 Stage 6.2부터 6.5 fresh review가 찾은 blocker를
역사에서 숨기지 않고 추가 교정 Stage로 기록했다. 그 뒤 PR #8의 old head
`1185a7365f441dee3dc9b7b19acd9be5c4bfe7c6` 기준 review가 추가 결함을 확인했다. 그
remediation 뒤 exact head `9e561e5529ef9c12ae6abf3a60f2f64cb2d3118b` review에서 Quality와 Context
lane이 각각 경로 ancestor 검증과 npm-bin symlink packaging/signing blocker를 확인했다.
이번 보고는 두 blocker의 failing-first 교정과 현재 검증 근거를 Stage 6.7 성격으로
덧붙인다. 실제 Developer ID signing, Apple Notarization, tag, GitHub Release, upload는
실행하지 않았다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/macos/framework-alias.mjs`, `scripts/macos/signing.mjs` | Electron 43 canonical framework alias, same-Current binding, arbitrary `Versions/*` binary alias fail-closed 계약을 고정했다. |
| `scripts/macos/notarization-command.mjs`, `scripts/macos/notarization-evidence.mjs`, `scripts/macos/notarization.mjs` | artifact kind/hash-bound resume, Accepted refresh, lowercase `info` 전용 severity taxonomy, strict final evidence validation을 고정했다. |
| `scripts/macos/release-support.mjs`, `scripts/macos/release-lifecycle.mjs`, `scripts/release-macos.mjs` | exact `0.1.1`, preflight-before-candidate, detach-before-remove, bounded timeout/abort, DMG runtime argv와 downstream suppression을 고정했다. |
| `scripts/macos/owned-directory.mjs`, release lifecycle/attempt modules | source-root parent를 canonical trusted anchor로 삼고 그 아래 모든 component의 no-symlink directory ownership을 creation과 recursive cleanup 전에 검증한다. anchor 위 macOS platform alias는 허용한다. |
| `scripts/package-macos.mjs`, `scripts/macos/app-bundle.mjs`, `scripts/macos/signing.mjs`, `scripts/macos/signing-discovery.mjs` | package/app-bundle과 signing/discovery 책임을 분리했다. source copy는 npm-bin relative link text를 보존하고, discovery는 실제 file type이 Mach-O인 target만 선택한다. 초기 ELF/PE/text native payload는 package에 남기되 signing 대상에서 제외하고, Mach-O alias/path/duplicate 검증과 signing 전후 target-set 불변성은 fail closed로 유지한다. |
| `scripts/macos/release-version-preflight.mjs`, `package.json` | signed npm entrypoint가 build와 candidate mutation 전에 exact version preflight를 실행하게 했다. |
| `tests/package-macos*.mjs`, `tests/electron-contract.test.ts` | Stage 6.2부터 6.7 blocker 회귀와 PR #8 remediation 회귀를 focused suite 14 files, 149 tests로 고정했다. |
| `docs/release-macos.md`, `docs/qa-checklist.md` | 유지관리자용 후보 부재, preflight timing, app/DMG evidence schema, no-publication 경계를 교정했다. |
| `.omo/evidence/task-8-stage6-*-fresh-review-remediation.md` | ignored sanitized evidence로 각 remediation validation과 cleanup receipt를 남겼다. 커밋에는 포함하지 않는다. |
| `mydocs/working/task_m011_6_stage6.md` | Stage 6 전체 교정, fresh review PASS, 잔여 위험, existing PR #8 update 경계를 기록한다. |
| `mydocs/report/task_m011_6_report.md` | Stage 1-5와 failed-review chronology를 보존한 최종 보고서로 갱신한다. |

## 본문 변경 정도 / 본문 무손실 여부

Stage 6.7은 Stage 6.2부터 6.6의 history와 approved plan을 rewrite하지 않고 release path
source, direct regression tests, `docs/release-macos.md`, `docs/qa-checklist.md`, 본 보고서와
최종 보고서만 교정한다. PR #8 remediation은 old head
`1185a7365f441dee3dc9b7b19acd9be5c4bfe7c6` 뒤 Stage 6.7 remediation history는 ownership
`e940e29d4c9ae946b6705fafe70dee822a454fba`, app assembly
`a81fe8664701435bbfc2fc100cbc9b7eff29ac0f`, signing discovery
`fc3fb088c8b76cac44aef8be8dc714f107b71104`, docs
`3adaf6b2deddc6123fde62ff76b97b9a15ad4192`로 구분했다. 이 문서는 그 reporting portion이며
`.omo` evidence와 notepad는 ignored 상태로 남기고 커밋하지 않는다.

## 검증 결과

Stage 6 계열에서 실행 및 보존한 validation surface는 다음과 같다.

```bash
node --check scripts/package-macos.mjs
node --check scripts/release-macos.mjs
node --check scripts/macos/*.mjs
npm test -- tests/package-macos-{package,coordinator-success,coordinator-failures,coordinator-boundaries,coordinator-app-recovery,coordinator-dmg-recovery,signing-flow,signing-discovery,notarization-submission,notarization-log-review,notarization-timeout,notarization-resume,notarization-commands,notarization-evidence}.test.mjs
npm run typecheck
npm run lint
npm test
npm run build
env -u PROMPTER_SIGNING_IDENTITY -u PROMPTER_NOTARY_PROFILE npm run package
env -u PROMPTER_SIGNING_IDENTITY -u PROMPTER_NOTARY_PROFILE npm run package:release:macos
npm run test:smoke
```

결과:

- OK: Stage 6.2부터 6.5 remediation history를 모두 보존했다. Stage 6.2는 pre-build version,
  traversal-order alias, Accepted-log retry, absolute Apple tool path, helper ownership, regression
  matrix와 docs/evidence wording을 교정했다.
- OK: Stage 6.3은 parent-directory alias provenance, candidate ownership race, accepted-pending
  state, one-call runner evaluation, strict QA schema gap을 교정했다.
- OK: Stage 6.4는 Electron 43 `Helpers`/`Libraries`, same-Current alias binding, accepted directory
  descendant traversal, preflight-before-candidate ordering, accepted-pending coordinator boundary,
  executable final-evidence schema와 docs timing을 교정했다.
- OK: Stage 6.5는 arbitrary `Versions/<non-current>/<FrameworkBinary>` binary aliases가 signing
  전에 실패하고, conventional Current-bound root binary aliases는 계속 지원됨을 고정했다.
- OK: Stage 6.5는 Notarization issue taxonomy를 빈 배열 또는 exact lowercase `info` record로
  제한했다. unknown, malformed, uppercase, warning, error, extra-field issue record는 live log와
  final evidence boundary에서 모두 fail closed다.
- OK: installed Electron 43 source-bundle discovery는 23 canonical signable targets, 15 read-only file
  inspections, zero signing/Apple service calls로 통과했다.
- OK: PR #8 remediation은 Apple 성공 log의 literal `issues: null`을 빈 reviewed issue list로
  정규화했다. omitted, object, string, malformed array entry는 계속 fail closed다.
- OK: premature pre-notarization Gatekeeper assessment를 제거했다. 초기 staged app은 strict
  signature verification만 받고, Gatekeeper는 post-staple extracted ZIP app, final DMG, mounted app
  surface에서만 수행된다.
- OK: restart-safe retained attempts는 immutable artifact bytes를 evidence directory 아래에 보존하고,
  kind, SHA-256, canonical containment, no-symlink, fixed filename을 만족할 때만 재사용한다.
- OK: accepted app lifecycle retention은 Accepted app ZIP을 release-level success 전까지 보존한다.
  downstream ZIP verification, Gatekeeper, DMG creation과 그 밖의 release failure 뒤에도 SHA-bound
  retained ZIP이 남아 app rebuild, app signing, app resubmit 없이 extraction으로 재개한다.
- OK: candidate-copy DMG stapling은 hash-bound submitted DMG를 candidate path에 exclusive copy한 뒤
  candidate copy만 staple, validate, verify한다.
- OK: evidence-root symlink ownership, pre-recovery cleanup ownership, release-root symlink rejection을
  고정했다. configured evidence root와 release root symlink escape는 외부 sentinel mutation 없이
  차단하고, handling 전 valid bound attempt는 cleanup에서 보존한다.
- OK: Stage 6.7은 regular leaf가 symlinked ancestor 아래 있는 release/evidence root도 first
  external command 전에 거부한다. trusted anchor 자체의 canonical alias는 허용하므로 macOS
  `/var` 같은 platform-root alias를 무조건 거부하지 않는다.
- OK: Stage 6.7 production-shaped `assembleMacOSApp` regression은 installed
  `node_modules/.bin/vite -> ../vite/bin/vite.js` link text를 app 안에서도 그대로 보존한다.
  signing discovery는 canonical target이 executable text인 contained alias를 sign 대상에서
  제외하고, 기존 duplicate native, escaping native, arbitrary framework alias는 계속 거부한다.
- OK: actual assembled app의 installed dependency tree를 실제 `/usr/bin/file`로 read-only discovery한
  결과는 63 signable targets와 236 file inspections다. packaged
  `@electron-internal/extract-zip/index.linux-arm-gnueabihf.node`는 ELF로 분류되어 그대로 보존되지만
  signing target에는 포함되지 않았고 discovery는 끝까지 완료됐다.
- OK: initially foreign ELF/PE/text `.node`와 `.dylib`는 분류 뒤 제외한다. Mach-O `.node`, `.dylib`,
  framework binary, executable host와 non-executable extensionless Mach-O는 계속 발견된다. 첫 pass의
  Mach-O가 signing 뒤 foreign type으로 바뀌거나 사라지는 경우와 새 Mach-O 추가는 두 target set 비교로
  outer signing 전에 실패한다.
- OK: dead framework-alias wrappers를 제거했고 oversized package/coordinator, signing,
  notarization test modules를 split했다. removed large-suite paths는 checked-in Vitest include에서
  빠졌고 title inventory는 보존됐다.
- OK: focused split release suite는 14 files, 149 tests passed다. full Vitest는 130 files,
  919 tests passed다.
- OK: `npm run typecheck`, `npm run lint`, `git diff --check`, `npm run build`, unsigned
  `npm run package`, `npm run test:smoke` 49/49가 통과했다.
- OK(expected nonzero): missing-input `npm run package:release:macos`는 candidate/evidence mutation 없이
  nonzero로 종료했다. live Apple, Keychain, signing, Notarization, Gatekeeper, tag, release, upload
  작업은 없었다. 이 명령은 성공으로 기록하지 않는다.
- OK: rejected exact-head review sessions는 Goal APPROVE
  `ses_f7c38fa94ffeIqtSd5du8FaKog`, QA APPROVE `ses_f7c38f90cffeW7qcLgxZGL4VO2`, Security
  APPROVE `ses_f7c38f6c9ffeAyqeeUqg2f2bHn`, Quality REJECT
  `ses_f7c38f7eaffds2b3oJhXiHIWjs`, Context REJECT
  `ses_f7c38f5aeffeCa6aE87Pc14jwv`다. 두 REJECT blocker를 Stage 6.7에서 교정했으며 fresh
  exact-head review는 아직 pending이다.
- DISCLOSURE: historical commits `58207b0`, `0ffa654`, `5114a1e`, `63a35d4`에는 현재
  git-master 기준의 Sisyphus footer 또는 co-author marker 일부가 없다. published history를
  rewrite하지 않고 이 보고서에 누락을 additive하게 공개한다.
- OK: latest committed-head fresh review lanes는 Goal PASS, QA PASS, Code quality PASS, Context PASS,
  Security PASS다.
  session IDs는 Goal `ses_f7cca8a57ffejMEXr61Xruwj52`, QA `ses_f7cca88e4ffe2yI4Z44axRYvDn`,
  Quality `ses_f7cca879effe940uVoPb6Ot5P4`, Context `ses_f7cca86b8ffe4QfW7J2ICb2ZRv`,
  Security `ses_f7cca85cbffeNNAhxJAIpUjEkZ`다. Stage 6.7 implementation/docs head는
  `3adaf6b2deddc6123fde62ff76b97b9a15ad4192`이며, report-inclusive publication head의 fresh
  exact-head review는 아직 실행하거나 완료했다고 주장하지 않는다.
- MISS(환경 제한): sibling worktree markdown LSP diagnostics는 request-root 제한으로 실행하지 못했다.
  typecheck, lint, markdown/template section review, syntax/import, tests, build, package, smoke,
  whitespace check를 대체 근거로 사용했다.

## 잔여 위험

- 실제 Developer ID signing, Apple Notarization, stapling, Gatekeeper assessment, signed artifact manual
  inspection, tag, GitHub Release, upload, public v0.1.1 publication은 Issue #7로 미룬다.
- same-user filesystem TOCTOU hardening은 nonblocking residual risk다. 현재 범위는 same-user local build
  환경의 fail-closed 검사와 ownership proof를 고정했다.
- non-Apple command abortability는 nonblocking residual risk다. 장시간 Apple trust command는 bounded
  timeout과 AbortSignal을 갖지만 모든 non-Apple subprocess의 external abort contract를 새로 만들지는 않았다.

## 다음 단계 영향

- Stage 6.7 implementation/docs는 `e940e29`, `a81fe86`, `fc3fb08`, `3adaf6b`로 commit했다.
  본 보고서와 최종 보고서를 별도 commit하고 `publish/task6`를 update한 뒤 exact-head
  independent review를 다시 실행한다.
- PR #8 review/merge와 `origin/master` containment verification은 명시적으로 pending이다. Todo 8은
  아직 완료로 표시하지 않는다.
- Issue #7은 Task #6 PR이 merge되고 `origin/master`에 포함된 뒤에만 시작한다. live Apple operations,
  tag, release, upload는 그 범위에서만 수행한다.

## 승인 요청

- 작업지시자의 최신 명시 continuation에 따라 Stage 6.7 implementation/docs commit과 기존 PR #8
  publication을 진행한다. exact-head re-review, PR merge, issue close, Issue #7 진입,
  tag/release/upload는 수행하지 않는다.
