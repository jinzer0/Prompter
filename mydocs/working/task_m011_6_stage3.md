# Task #6 Stage 3 단계 보고서

GitHub Issue: [#6](https://github.com/jinzer0/Prompter/issues/6)
구현계획서: [`task_m011_6_impl.md`](../plans/task_m011_6_impl.md)
Stage: 3

## 단계 목적

Prometheus Todo 5에 따라 Stage 2의 Developer ID signing 모듈과 Keychain profile
Notarization 모듈을 한 릴리스 coordinator로 묶었다. coordinator는 v0.1.1 arm64 macOS
릴리스 후보를 fail closed 방식으로 만들며, app ZIP과 DMG를 서로 독립적으로 Notarization한 뒤
마지막에 SHA-256을 생성한다. 실제 Apple, Keychain mutation, Gatekeeper, GitHub release, tag,
push 작업은 실행하지 않았다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/release-macos.mjs` | `runMacOSRelease` 단일 public export를 추가했다. clean worktree, Xcode, candidate, identity, profile preflight 뒤 app 조립, nested signing, app Notarization, final ZIP, extracted app 재검증, DMG 생성과 signing, DMG Notarization, read only mount 검증, checksum hash last 순서를 조율한다. |
| `scripts/macos/release-support.mjs` | coordinator의 내부 support helper를 분리했다. exact input parsing, injected runner와 timeout redaction, candidate 상태 검사, containment, identity multiplicity, package version, checksum formatting만 담당한다. |
| `package.json` | `package:release:macos`를 `npm run build && node scripts/release-macos.mjs`로 바꿔 승인된 release coordinator path만 호출하게 했다. |
| `mydocs/working/task_m011_6_stage3.md` | Stage 3 검증 결과, REJECT→fix 이력, 최종 독립 APPROVE, 잔여 위험, Stage 4 진입 경계를 기록한다. |

support helper 분리는 Biome와 LOC 상한 때문에 필요했다. compact 단일 coordinator는 project pinned
Biome formatting 뒤 pure LOC가 378까지 늘어났고, 이는 250 LOC 상한을 넘었다. side effect free
support 책임만 `scripts/macos/release-support.mjs`로 옮긴 뒤 coordinator는 229 LOC, helper는 148 LOC로
둘 다 상한 아래에 머문다.

독립 최종 verifier 세션 `ses_f7e057bd1ffeDq0oVX0ACnYoJF`는 최종 판정을 `APPROVE`로 기록했다.
최종 verifier가 확인한 범위는 146 scenarios, 439 assertions, 107 command positions,
103 fail closed failures, 4 bounded staple recoveries다.

REJECT→fix 이력은 다음 blocker를 모두 교정한 뒤 닫았다.

- ownership: coordinator가 만든 OS temp 경로와 정확한 partial asset만 정리하고 caller owned
  candidate와 evidence는 보존한다.
- evidence retention: Accepted app receipt, DMG receipt, resume evidence를 실패 cleanup에서 지우지 않는다.
- sanitized errors: command failure와 timeout recovery에서 raw identity, profile, password,
  key path sentinel을 error와 evidence에 남기지 않는다.
- containment: extracted ZIP app과 mounted DMG app은 `realpath`와 `relative` containment를 통과해야 한다.
- mount state: `hdiutil attach` 성공 뒤에만 detach state를 기록한다.
- git cwd: clean worktree preflight는 injected git runner에 `{ cwd: paths.sourceRoot }`만 넘기고
  `env`를 바꾸지 않는다.
- safe timeout payload: strict UUID만 보존하고 status는 고정된 `In Progress`로 다시 쓴다.
- pinned Biome: project pinned Biome formatting 뒤 발생한 378 LOC 문제를 helper split으로 해결했다.
- helper split: internal support helper는 side effect free import와 consumed export set으로 고정했다.
- basename regression: final artifact allowlist에서 쓰는 `node:path` `basename` import 누락을 복구했다.

## 본문 변경 정도 / 본문 무손실 여부

코드 작업이므로 문서 원문 보존 여부는 해당 없다. Stage 3는 신규 coordinator, 신규 internal helper,
승인된 `package.json` release script 한 줄, 이 보고서만 포함한다. `package-lock.json`,
`scripts/package-macos.mjs`, `scripts/macos/signing.mjs`, `scripts/macos/notarization.mjs`, tests,
README, docs, orders, plans, 보호 경로, `.omo` evidence와 notepad는 커밋 범위에 넣지 않았다.

기존 unsigned `npm run package`와 `npm run make` 경계는 유지했다. `package:release:macos`는 별도
fail closed release path이며, 실제 Apple 또는 GitHub operation을 직접 수행하지 않는다.

## 검증 결과

구현계획서 Stage 3 lines 299-315의 정확한 검증 명령:

```bash
node --check scripts/release-macos.mjs
node --input-type=module -e 'const m=await import("./scripts/release-macos.mjs"); if (typeof m.runMacOSRelease !== "function") throw new Error("runMacOSRelease")'
rg -n 'gh[[:space:]]+release|git[[:space:]]+tag|release create|release upload' scripts/release-macos.mjs
npm run typecheck
GIT_MASTER=1 git status --short
GIT_MASTER=1 git diff --check
GIT_MASTER=1 git diff --exit-code origin/master -- docs/plan docs/draft .omo/boulder.json
```

결과:

- OK: `node --check scripts/release-macos.mjs`는 출력 없이 exit 0으로 통과했다.
- OK: side effect 없는 coordinator import와 exact export 검사는 출력 없이 exit 0으로 통과했다.
  `runMacOSRelease`는 함수다.
- OK: forbidden publication/tag scan은 출력이 없었다. `gh release`, `git tag`, `release create`,
  `release upload` 실행 표면은 coordinator에 없다.
- MISS(환경 한계): `npm run typecheck`는 task worktree에 local dependency가 없어 처음에는
  `sh: tsc: command not found`로 실패했다. main worktree의 pinned dependency path를 `PATH`에 넣어
  재시도했지만 `error TS2688: Cannot find type definition file for 'node'`로 실패했다. 이 Stage closure는
  typecheck 통과를 주장하지 않는다.
- OK: `GIT_MASTER=1 git status --short`는 보고서 작성 전 `M package.json`,
  `?? scripts/macos/release-support.mjs`, `?? scripts/release-macos.mjs`만 표시했다.
- OK: `GIT_MASTER=1 git diff --check`는 출력 없이 exit 0으로 통과했다.
- OK: `GIT_MASTER=1 git diff --exit-code origin/master -- docs/plan docs/draft .omo/boulder.json`는
  출력 없이 exit 0으로 통과했다. 보호 경로 diff는 비어 있다.

추가 Stage 3 closure gate:

```bash
/Users/kjy/Desktop/Codes/projects/Prompter/node_modules/.bin/biome check scripts/release-macos.mjs scripts/macos/release-support.mjs package.json
node --check scripts/macos/release-support.mjs
node --input-type=module -e 'const c=await import("./scripts/release-macos.mjs"); const h=await import("./scripts/macos/release-support.mjs"); const cKeys=Object.keys(c).sort(); const hKeys=Object.keys(h).sort(); console.log(JSON.stringify({coordinator:cKeys,support:hKeys})); if (JSON.stringify(cKeys)!==JSON.stringify(["runMacOSRelease"])) throw new Error("coordinator export set"); if (JSON.stringify(hKeys)!==JSON.stringify(["assertIdentity","candidate","checksums","contained","input","runner","versionFrom"].sort())) throw new Error("support export set")'
awk '!/^[[:space:]]*$/ && !/^[[:space:]]*(\/\/|#|--)/' scripts/release-macos.mjs | wc -l
awk '!/^[[:space:]]*$/ && !/^[[:space:]]*(\/\/|#|--)/' scripts/macos/release-support.mjs | wc -l
node scripts/release-macos.mjs; exit_code=$?; printf 'exit=%s\n' "$exit_code"; exit 0
rg -n 'gh[[:space:]]+release|git[[:space:]]+tag|release create|release upload|--apple-id|--password|PRIVATE KEY|BEGIN .*PRIVATE KEY' scripts/release-macos.mjs scripts/macos/release-support.mjs package.json
rg -n -- '--deep' scripts/release-macos.mjs scripts/macos/release-support.mjs
rg -n 'assertIdentity|candidate|checksums|contained|input|runner|versionFrom' scripts/release-macos.mjs scripts/macos/release-support.mjs
GIT_MASTER=1 git diff -- package.json
GIT_MASTER=1 git diff --exit-code -- package-lock.json scripts/package-macos.mjs scripts/macos/signing.mjs scripts/macos/notarization.mjs tests docs README.md mydocs/orders mydocs/plans docs/plan docs/draft .omo/boulder.json
```

결과:

- OK: project pinned Biome는 `Checked 3 files in 4ms. No fixes applied.`를 출력하고 exit 0으로 통과했다.
- OK: `node --check scripts/macos/release-support.mjs`는 출력 없이 exit 0으로 통과했다.
- OK: exact export set 검사는
  `{"coordinator":["runMacOSRelease"],"support":["assertIdentity","candidate","checksums","contained","input","runner","versionFrom"]}`를
  출력하고 exit 0으로 통과했다.
- OK: pure LOC는 coordinator 229, support helper 148이다.
- OK: missing Apple inputs CLI gate는 `macOS release failed.`와 `exit=1`을 출력했다. 입력 parsing에서
  nonzero로 끝났고 candidate mutation 전에 실패한다.
- OK: expanded forbidden scan은 출력이 없었다. publication, tag, credential value, private key surface는
  추가되지 않았다.
- OK: `--deep` scan은 coordinator와 helper에서 출력이 없었다. Stage 2의 verification only `--deep`은
  Stage 3 coordinator 범위 밖에 있다.
- OK: helper import는 `support import ok`로 side effect 없이 통과했다.
- OK: helper의 internal export `assertIdentity`, `candidate`, `checksums`, `contained`, `input`,
  `runner`, `versionFrom`은 coordinator import와 호출 지점에서 모두 소비된다.
- OK: `package.json` diff는 `package:release:macos` 한 줄만
  `node scripts/package-macos.mjs --release-preflight`에서
  `npm run build && node scripts/release-macos.mjs`로 바뀐 것을 보였다.
- OK: protected and out of scope diff check는 출력 없이 exit 0으로 통과했다. `package-lock.json`,
  packaging, signing, notarization, tests, docs, README, orders, plans, protected paths는 비어 있다.
- MISS(환경 한계): LSP diagnostics는 sibling worktree path가 request cwd 밖이라고 거부했다. 이 결과는
  성공으로 기록하지 않는다. syntax, import/export, pinned Biome, fake runner verifier, static gates로
  대체 검증했다.

독립 verifier와 evidence:

- OK: task 5 evidence는 `status: passed-with-correction`, coordinator path,
  internal support module path, publication absent, credential values not recorded를 담고 있다.
- OK: evidence의 success trace는 11단계 순서, two submission, final allowlist,
  107 runner calls, 107 failure injections, 4 recovered stapler failures, ownership and containment,
  redaction, git preflight cwd/no env를 기록한다.
- OK: 최종 verifier `ses_f7e057bd1ffeDq0oVX0ACnYoJF`는 146 scenarios, 439 assertions,
  107 command positions, 103 fail closed failures, 4 bounded staple recoveries로 final APPROVE했다.
- OK: 실제 Apple, Keychain mutation, signing, notarization submission, Gatekeeper, hdiutil mount,
  GitHub release, tag, push 명령은 실행하지 않았다.

## 잔여 위험

- `npm run typecheck`는 이 worktree dependency 상태에서 통과하지 못했다. Stage 3 closure는 이 한계를
  성공으로 바꾸어 말하지 않는다.
- Stage 4 tests after 전까지 fake runner proof는 independent verifier와 `.omo/evidence` 기록에 있다.
  repository test 파일 고정은 Stage 4 Todo 6 범위다.
- release path는 실제 Apple 계정과 Keychain profile이 필요한 실운영 경로다. 이 Stage에서는 live
  Apple/GitHub 작업을 의도적으로 실행하지 않았다.

## 다음 단계 영향

- Stage 4 Todo 6은 이 coordinator의 11단계 순서, fail closed cleanup, two submission, hash last,
  exact export surface를 repository tests로 고정해야 한다.
- Stage 4 Todo 7은 `package:release:macos`, `PROMPTER_SIGNING_IDENTITY`,
  `PROMPTER_NOTARY_PROFILE`, release candidate allowlist, no publication boundary를 문서화해야 한다.
- Stage 4 Todo 6 또는 Todo 7은 이 Stage 3 보고서와 commit 검토 뒤 작업지시자의 명시 승인 전까지
  시작하지 않는다.

## 승인 요청

- Stage 3 산출물, REJECT→fix 이력, 최종 verifier APPROVE, 검증 결과, 잔여 위험을 승인하면
  Stage 4 / Prometheus Todos 6-7 진입을 명시적으로 승인해 주시기 바란다. 승인 전에는 Stage 4를
  시작하지 않는다.
