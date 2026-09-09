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
Stage 6.7은 두 blocker의 failing-first 교정과 검증 근거를 추가했고 report-inclusive head
`4c720cc031219732f1210587c5d91939b5ad1909`로 게시됐다. 그 head의 fresh review에서 Goal,
QA, Security는 APPROVE였지만 Code Quality와 Context가 각각 oversized Electron contract suite와
report/PR immutable-link chronology를 REJECT했다. Stage 6.8은 그 결과를 숨기지 않고 test split과
report/link remediation으로 이어가 report-inclusive head
`0900ba94d507f8117126d21af2aab5325f344c14`로 게시됐다. 그 head review의 Goal과 Quality가
각각 DMG Gatekeeper primary-signature context와 concurrent attempt ownership blocker를 확인했다.
Stage 6.9은 두 blocker의 failing-first remediation을 추가해 report-inclusive head
`2c59d615ff4235eb33be52170cd3064518b1fd1f`로 게시됐다. 그 head review의 Goal과 Security는
독립적으로 signed npm entrypoint가 필수 release input을 build 전에 검사하지 않는 같은 blocker를
확인했다. Stage 6.10은 shared input-name contract와 pre-build rejection regression으로 이를 교정한다.
실제 Developer ID signing, Apple Notarization, Gatekeeper assessment, tag, GitHub Release, upload는
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
| `scripts/macos/release-inputs.mjs`, release preflight/entrypoints | signed release input 이름을 한 곳에 고정하고 exact version 뒤 두 nonblank input을 build 전에 검사한다. runtime coordinator의 기존 input validation은 유지한다. |
| `tests/package-macos*.mjs`, `tests/electron-contract-*.test.ts`, `tests/macos-release-contract.test.ts` | Stage 6.2부터 6.10 blocker 회귀를 contract 13 files/35 tests, focused release 15 files/156 tests로 고정했다. |
| `docs/release-macos.md`, `docs/qa-checklist.md` | 유지관리자용 후보 부재, preflight timing, app/DMG evidence schema, DMG primary-signature context, no-publication 경계를 교정했다. |
| `.omo/evidence/task-8-stage6-*-fresh-review-remediation.md` | ignored sanitized evidence로 각 remediation validation과 cleanup receipt를 남겼다. 커밋에는 포함하지 않는다. |
| `mydocs/working/task_m011_6_stage6.md` | Stage 6 전체 교정, failed-review chronology, 잔여 위험, existing PR #8 update와 pending fresh-review 경계를 기록한다. |
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

Stage 6.7 report/final-report closure는 `3b6477db464a398ed26d2f36aa91ef463fbb2d47`와
`4c720cc031219732f1210587c5d91939b5ad1909`로 게시됐다. 이어진 Stage 6.8 test split은 공통
기반 `b7ab93518687e78294b67968245fc3f2fc0ec81d`, bridge
`d6692d44fa6a743707c38cfb147d8474ec18d079`, schema
`64bf4a81c5226d8afb3e67747e41e001e7c21f9d`, Phase 15
`9d260c239236e2ea2b0c5b490014b32aa7c8bcd3`, shell/menu
`619d0d8e3e56b63c45954afbfce2111b0d2af7ce`, quality guardrail
`8678bf18e6dd3ef5d3b237cdacdf4ee1742aa723`, registration switch
`d8a79ae4cd207bee5a95bac0089236114ed3b3cd`의 일곱 atomic commits로 구분했다. 기존
33 contract tests와 macOS release 2 tests의 title multiset을 보존하면서 monolith를 13개 direct
test modules로 교체했다.

Stage 6.8 report remediation은 `0900ba94d507f8117126d21af2aab5325f344c14`로 게시됐다.
Stage 6.9 behavior remediation은 DMG Gatekeeper production/test/QA docs
`a7d84bb8314f043ebba4809e905ee1c4771ce958`과 concurrent attempt
production/test/support `ada1e31040307e96ec62a3434c2c8619710400d0`로 구분했다. 기존 eight-file
delta 외 implementation behavior는 변경하지 않았고 보고서는
`2c59d615ff4235eb33be52170cd3064518b1fd1f`로 별도 게시했다. Stage 6.10의 six-file
pre-build release-input remediation은 `3c5289047f6f4590ce6cc24c757606fde7bb472e`로 고정했고,
본 보고서와 최종 보고서만 그 뒤 별도 reporting commit으로 묶는다.

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
npm test -- tests/package-macos-notarization-commands.test.mjs tests/package-macos-coordinator-success.test.mjs
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
- OK: Stage 6.7 publication 당시 focused split release suite는 14 files/149 tests, full Vitest는
  130 files/919 tests였다. Stage 6.8 뒤 contract split은 13 files/35 tests, focused release는
  15 files/151 tests, full Vitest는 142 files/919 tests로 통과해 전체 title 수를 보존했다.
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
- OK: Stage 6.7 implementation/docs head fresh review lanes는 Goal PASS, QA PASS, Code quality PASS,
  Context PASS, Security PASS다.
  session IDs는 Goal `ses_f7cca8a57ffejMEXr61Xruwj52`, QA `ses_f7cca88e4ffe2yI4Z44axRYvDn`,
  Quality `ses_f7cca879effe940uVoPb6Ot5P4`, Context `ses_f7cca86b8ffe4QfW7J2ICb2ZRv`,
  Security `ses_f7cca85cbffeNNAhxJAIpUjEkZ`다. Stage 6.7 implementation/docs head는
  `3adaf6b2deddc6123fde62ff76b97b9a15ad4192`였다.
- REJECT RECORDED: Stage 6.7 report-inclusive publication head
  `4c720cc031219732f1210587c5d91939b5ad1909`의 fresh review는 Goal APPROVE
  `ses_f7baecb91ffdFbZNAEbhVZvCLz`, QA APPROVE `ses_f7baed188ffex5HWsR7ajFEi2a`, Security
  APPROVE `ses_f7baece48ffegT2N0VGNftiaxR`, Code Quality REJECT
  `ses_f7baecfa3ffeeSbQIS0p9G3uT8`, Context REJECT
  `ses_f7baeccefffe9erDRJ7G9qQhIn`이었다.
- REJECT DETAIL: Code Quality는 PR에서 변경된 `tests/electron-contract.test.ts`가 1,867 pure LOC인
  oversized suite라는 blocker를 확인했다. Context는 Stage 2, 4, 5의 short label과 연결된 full commit
  SHA가 실제 object와 달라 발생한 broken immutable links 3건과, Stage 6.7 commit/publication이 여전히
  pending이라고 적은 stale report closure claims를 blocker로 확인했다. historical governance amendment
  gap은 공개된 chronology상 nonblocking으로 분류했다. 세 link의 올바른 commit은 Stage 2
  `bd0d3d4591290462ec81e36ba9bf099aade49347`, Stage 4
  `052c1f4dd3c8b3c4f95e3ebf448e23de5c114069`, Stage 5
  `872c3bfa6b3ebb70fb787a175518fffdb0147e36`이다.
- OK: Stage 6.8은 oversized suite의 35 tests를 13 direct modules로 분리하고 모든 changed/new module을
  250 pure LOC 이하, 최대 209 pure LOC로 낮췄다. Atlas는 contract 35/35, focused release 151/151,
  full 919/919, typecheck, lint, `git diff --check`를 독립 재현했다. Context report/link blocker는 본
  additive report 갱신과 final head 고정 PR link 교정으로 처리했다. 당시 report-inclusive final head의
  fresh five-lane review는 pending이었으며, 이후 `0900ba9` review 결과는 아래에 이어서 기록한다.
- REJECT RECORDED: Stage 6.8 report-inclusive head
  `0900ba94d507f8117126d21af2aab5325f344c14`의 fresh review는 Goal REJECT, QA APPROVE,
  Quality REJECT, Context APPROVE, Security procedural REJECT였다. Goal은 DMG Gatekeeper argv에
  `--context context:primary-signature`가 빠진 product blocker를 확인했고, Quality는 candidate ownership
  전에 실패한 concurrent loser cleanup이 shared winner attempt를 삭제하는 product blocker를 확인했다.
- PROCEDURAL DISCLOSURE: Security lane은 로드한 security skill이 unavailable nested Team Mode를
  요구해 code audit을 수행하지 못한 채 REJECT했다. 이는 security product finding이나 code audit 결과가
  아니며, fresh final-head review에서 실제 audit을 다시 수행해야 한다.
- FAILING-FIRST: DMG exact argv regression은 production change 전 1/3 실패해 primary-signature context
  pair 부재만 재현했다. deterministic concurrency regression은 winner를 `app-submit`에서 hold한 뒤
  pre-ownership loser가 shared attempt ZIP을 삭제해 `ENOENT`가 발생하는 1 failed를 재현했다.
- OK: Stage 6.9 DMG assessment는 DMG에만 `--context context:primary-signature`를 추가하고 app의 exact
  `--type execute --verbose=4` argv는 그대로 유지한다. concurrency flow는 evidence directory의
  symlink/canonical validation만 preflight 전에 수행하고 candidate reservation 뒤 ownership을 시작한다.
  pre-ownership cleanup은 shared attempts를 읽거나 삭제하지 않으며 owner의 Accepted/resumable retention과
  malformed-attempt cleanup은 유지된다.
- OK: fresh verification은 targeted 2 files/8 tests, focused release 15 files/152 tests, full Vitest
  142 files/920 tests, typecheck, lint, changed-file syntax, pure LOC maximum 240, `git diff --check`를
  통과했다. LSP는 Stage 6.9 eight paths 모두 sibling-worktree request-root 제한으로 거부되어 PASS로
  기록하지 않는다. 이 시점에는 report-inclusive final head의 fresh five-lane review가 pending이었다.
- REJECT RECORDED: Stage 6.9 report-inclusive head
  `2c59d615ff4235eb33be52170cd3064518b1fd1f`의 fresh review는 Goal REJECT, QA APPROVE,
  Quality APPROVE, Security REJECT, Context APPROVE였다. Goal과 Security는 각각 독립적으로 signed npm
  entrypoint가 `PROMPTER_SIGNING_IDENTITY`와 `PROMPTER_NOTARY_PROFILE`의 missing/blank 값을
  `npm run build` 전에 거부하지 않아 build/downstream side effect가 가능한 같은 product blocker를
  확인했다.
- FAILING-FIRST: 실제 npm entrypoint의 missing/blank signing identity와 notary profile 네 case는
  production preflight 교정 전 4/17 실패했다. 네 case 모두 expected rejection 없이 fixture build와
  downstream marker까지 실행됐다.
- OK: Stage 6.10은 frozen `releaseInputNames`를 version preflight, package legacy preflight, release CLI
  environment wiring에서 공유한다. exact `0.1.1` 검사 뒤 두 input의 missing/blank 값을 build 전에
  거부하며, `runMacOSRelease`의 기존 runtime `input()` validation은 defense-in-depth로 유지한다. fixture는
  rejection 뒤 build/downstream/candidate/evidence mutation이 없고 synthetic input 값이 output에
  노출되지 않음을 고정한다.
- OK: Atlas verification은 targeted entrypoint 17/17, focused release 15 files/156 tests, full Vitest
  142 files/924 tests, typecheck, lint, changed-file syntax, pure LOC maximum 214, `git diff --check`를
  통과했다. LSP는 Stage 6.10 six paths 모두 sibling-worktree request-root 제한으로 거부되어 PASS로
  기록하지 않는다. 새 report-inclusive final head의 fresh five-lane review는 pending이다.
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

- Stage 6.7부터 Stage 6.9까지 `e940e29`부터 `2c59d61`까지 `publish/task6`에 게시했다. Stage 6.10
  behavior remediation은 `3c52890`으로 commit했다. 본 보고서와 최종 보고서를 별도 report commit으로
  추가하고 기존 PR #8을 새 final head에 고정한 뒤 fresh five-lane review를 다시 실행한다.
- PR #8 review/merge와 `origin/master` containment verification은 명시적으로 pending이다. Todo 8은
  아직 완료로 표시하지 않는다.
- Issue #6 close와 Issue #7 진입은 Task #6 PR이 merge되고 `origin/master`에 포함된 뒤에만 진행한다.
  live Apple operations, tag, release, upload는 Issue #7 범위에서만 수행한다.

## 승인 요청

- 작업지시자의 최신 명시 지시에 따라 Stage 6.10 behavior/report commits, 정상 publication push,
  기존 PR #8 final-head immutable-link 교정을 진행한다. report-inclusive exact-head re-review, PR merge,
  containment verification, Issue #6 close, Issue #7 진입, tag/release/upload는 수행하지 않는다.
