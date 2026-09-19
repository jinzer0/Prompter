# Task #6 Stage 2 단계 보고서

GitHub Issue: [#6](https://github.com/jinzer0/Prompter/issues/6)
구현계획서: [`task_m011_6_impl.md`](../plans/task_m011_6_impl.md)
Stage: 2

## 단계 목적

Prometheus Todo 3과 Todo 4에 따라 Developer ID 내부 코드 서명 기반과 Keychain profile 전용
Notarization 기반을 분리된 모듈로 추가했다. Stage 1에서 고정한 unsigned 로컬 패키징 경계와
`runFile(command, args, options)` seam을 이어받아 실제 Apple 서명, Keychain 조회, Apple 제출,
staple, Gatekeeper 실명령은 호출하지 않고 fake-runner와 정적 검증으로 실패 차단 계약을
확인했다. Stage 3 릴리스 coordinator는 이 export와 결과 계약에 의존하지만, 이 보고서 승인
전에는 Todo 5를 시작하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/macos/entitlements.plist` | ASCII XML로 `com.apple.security.cs.allow-jit=true` 한 항목만 포함했다. |
| `scripts/macos/signing.mjs` | `discoverSignableCode`, `signAppBundle`, `verifyAppSignature`, `verifyDmgSignature`를 export하고 canonical discovery, exact identity enumeration, inside-out signing, verification-only `--deep` 계약을 구현했다. |
| `scripts/macos/notarization.mjs` | `preflightNotaryProfile`, `submitAndWait`, `fetchNotaryLog`, `stapleAndValidate`, `assessGatekeeper`를 export하고 Keychain profile, Accepted+warning-free log, timeout resume, bounded staple, Gatekeeper assessment 계약을 구현했다. |
| `mydocs/working/task_m011_6_stage2.md` | Stage 2 검증 결과, 독립 REJECT 교정 이력, 잔여 위험, Stage 3 승인 경계를 기록했다. |

Lane 2A signing은 최초 독립 검증에서 REJECT를 받았다. 최종 APPROVE 세션
`ses_f7e4c129dffeJlF3qtP18A6oDh`는 두 blocker가 교정됐다고 판정했다.

- canonical duplicate signable alias가 묵시적으로 deduplicate되던 결함을, 이미 분류된
  canonical signable target을 두 번째 filesystem entry가 가리키면 generic duplicate 오류로
  중단하도록 고쳤다. duplicate fixture에서는 `codesign` 호출 0회였다.
- signing identity multiplicity를 검사하지 않던 결함을, injected
  `/usr/bin/security find-identity -v -p codesigning` 출력의 well-formed quoted name이 요청
  identity와 정확히 한 번 일치할 때만 진행하도록 고쳤다. zero, multiple, near-prefix,
  malformed, summary-mismatch listing은 identity 원문을 error/evidence에 넣지 않고 차단했다.

Lane 2B notarization도 독립 검증 중 여러 REJECT가 있었다. 최종 APPROVE 세션
`ses_f7e362975ffePOs2d3FLa7vcqy`는 전체 17개 scenario group과 147개 adversarial input case가
통과했다고 판정했다.

- 모든 public API option schema를 exact key allowlist로 바꿔 credential alias, unknown key,
  symbol key를 runner 호출 전에 거부했다.
- UUID submission ID와 status별 exact resume field set을 강제했다. Accepted resume은 재제출하지
  않고, unknown resume은 `info`와 `log`만 사용하며 Invalid/Rejected terminal status를 실패로
  처리한다.
- Accepted response도 실제 log receipt를 먼저 저장하고, receipt에는 submission ID와 severity만
  남겼다. 누락, 손상, UUID mismatch, warning, error receipt는 `history` 뒤 `log`만 다시 받으며
  `submit`은 호출하지 않는다.
- timeout resume은 `ETIMEDOUT`, `AbortError`, Node `os.constants.signals`의 실제 signal만
  허용한다. `SIGBANANA`, `signal: null`, 일반 command failure는 unknown evidence를 쓰지 않는다.
- cached warning/error gate는 fresh log와 같은 publication blocker로 처리한다. bounded stapler
  retry는 같은 artifact에만 적용되고 Notarization resubmit을 유발하지 않는다.

## 본문 변경 정도 / 본문 무손실 여부

코드 작업이므로 문서 원문 보존 여부는 해당 없다. 기존 unsigned `npm run package`, `npm run
make`, Stage 1 `scripts/package-macos.mjs`, package metadata, tests, README, docs, orders, plans,
보호 경로는 수정하지 않았다. Stage 2는 새 `scripts/macos/` 세 파일과 이 보고서만 추가했다.
실제 Developer ID identity, Keychain profile, Apple service, stapler, Gatekeeper, tag, release,
PR 작업은 실행하지 않았다.

## 검증 결과

구현계획서 Stage 2의 정확한 검증 명령:

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

결과:

- OK: `plutil -lint scripts/macos/entitlements.plist`는 `scripts/macos/entitlements.plist: OK`를
  출력하고 exit 0으로 통과했다.
- OK: `node --check scripts/macos/signing.mjs`와
  `node --check scripts/macos/notarization.mjs`는 출력 없이 exit 0으로 통과했다.
- OK: side-effect 없는 import 검사는 출력 없이 exit 0으로 통과했다. signing 네 export와
  notarization 다섯 export가 모두 함수였다.
- OK: forbidden-pattern scan은 `--deep` 두 건만 찾았다. 둘 다
  `scripts/macos/signing.mjs`의 app signature verification argv이며 signing argv가 아니다.
  `allow-unsigned-executable-memory`, `disable-library-validation`, `get-task-allow`, `--apple-id`,
  `--password`는 0건이었다.
- OK: `GIT_MASTER=1 git status --short`는 보고서 작성 전 `?? scripts/macos/`만 표시했다.
- OK: `GIT_MASTER=1 git diff --check`는 출력 없이 exit 0으로 통과했다.
- OK: `GIT_MASTER=1 git diff --exit-code origin/master -- docs/plan docs/draft .omo/boulder.json`는
  출력 없이 exit 0으로 통과했다.

추가 export, LOC, Biome, LSP, 보호 경계 검사:

```bash
node --input-type=module -e 'const s=await import("./scripts/macos/signing.mjs"); const n=await import("./scripts/macos/notarization.mjs"); const sKeys=Object.keys(s).sort(); const nKeys=Object.keys(n).sort(); console.log(JSON.stringify({signing:sKeys,notarization:nKeys})); if (JSON.stringify(sKeys)!==JSON.stringify(["discoverSignableCode","signAppBundle","verifyAppSignature","verifyDmgSignature"].sort())) throw new Error("signing export set"); if (JSON.stringify(nKeys)!==JSON.stringify(["assessGatekeeper","fetchNotaryLog","preflightNotaryProfile","stapleAndValidate","submitAndWait"].sort())) throw new Error("notarization export set");'
awk '!/^[[:space:]]*$/ && !/^[[:space:]]*(\/\/|#|--)/' scripts/macos/signing.mjs | wc -l
awk '!/^[[:space:]]*$/ && !/^[[:space:]]*(\/\/|#|--)/' scripts/macos/notarization.mjs | wc -l
if [ -x node_modules/.bin/biome ]; then node_modules/.bin/biome check scripts/macos/signing.mjs scripts/macos/notarization.mjs; else printf 'BIOME_NOT_AVAILABLE\n'; fi
```

결과:

- OK: exact export-set 검사는
  `{"signing":["discoverSignableCode","signAppBundle","verifyAppSignature","verifyDmgSignature"],"notarization":["assessGatekeeper","fetchNotaryLog","preflightNotaryProfile","stapleAndValidate","submitAndWait"]}`를
  출력하고 exit 0으로 통과했다.
- OK: pure LOC는 `scripts/macos/signing.mjs` 245, `scripts/macos/notarization.mjs` 230이다. 둘 다
  250 LOC 상한 이하다.
- MISS(환경 한계): task worktree에는 `node_modules/.bin/biome`이 없어 두 모듈 Biome 실행은
  `BIOME_NOT_AVAILABLE`로 기록했다. 독립 notarization 최종 verifier 세션은 Biome check 통과를
  별도로 확인했지만, 이 closure 실행에서는 sibling worktree 의존성 부재로 재실행할 수 없었다.
- MISS(환경 한계): LSP diagnostics는 request root가 sibling worktree
  `/Users/kjy/Desktop/Codes/projects/Prompter-task6` 밖이라고 거부했다. 이 결과를 성공으로
  표시하지 않는다. 대신 syntax check, side-effect-free import, exact export-set, LOC,
  independent fake-runner verifier 결과를 사용했다.

Stage 4 전에 수행한 temporary fake-runner smoke와 독립 검증 결과:

- OK: Todo 3 evidence는 nested failure, unsigned post-sign discovery, canonical duplicate,
  malformed entitlement, zero/multiple/near-prefix/malformed identity listing에서 outer signing과
  Notarization이 0회임을 기록했다. 실제 Developer ID와 Keychain은 호출하지 않았다.
- OK: Todo 4 evidence는 non-Accepted, invalid JSON, warning/error log, timeout, corrupt cached
  receipt, raw app submit, ZIP staple, stapler failure가 downstream archive와 publication을 막음을
  기록했다. 실제 Apple service, stapler, spctl은 호출하지 않았다.
- OK: focused new Vitest files are intentionally Stage 4 tests-after scope. Stage 2는 승인된
  계획대로 product source modules, syntax/import, fake-runner smoke, independent verification으로
  닫는다.

## 잔여 위험

- Stage 2에는 아직 coordinator가 없다. `scripts/release-macos.mjs`, 실제 app ZIP/DMG 순서,
  hash-last, final allowlist, cleanup orchestration은 Stage 3 Todo 5 승인 후 범위다.
- Stage 4 tests-after 전까지 signing/notarization의 focused Vitest 파일은 repository에 없다.
  독립 verifier의 fake-runner proof와 sanitized evidence가 현재 회귀 근거이며, Stage 4에서 이를
  테스트 파일로 고정해야 한다.
- Biome과 LSP는 이 closure worktree 환경에서 직접 재실행하지 못했다. 기록된 MISS는 환경 한계이며
  성공으로 대체하지 않는다.

## 다음 단계 영향

- Stage 3은 `scripts/macos/signing.mjs`의 네 export와 `scripts/macos/notarization.mjs`의 다섯
  export만 사용해야 한다. 새로운 credential 경로나 Apple ID/password/API-key 옵션을 추가하지
  않는다.
- coordinator는 signing의 canonical discovery, exact identity multiplicity, outer-last signing,
  verification-only `--deep` 전제를 깨면 안 된다.
- coordinator는 Notarization의 Accepted+warning-free log, receipt-first resume, no-resubmit resume,
  safe signal set, cached warning/error gate를 downstream archive와 publication gate 앞에 둬야 한다.
- Stage 3 / Todo 5는 이 보고서와 Stage 2 atomic commit 검토 뒤 작업지시자의 명시 승인 전까지
  차단된다.

## 승인 요청

- Stage 2 산출물, 독립 REJECT 교정 이력, 검증 결과, 잔여 위험을 승인하면 Stage 3 / Prometheus
  Todo 5 진입을 명시적으로 승인해 주시기 바란다. 승인 전에는 Stage 3을 시작하지 않는다.
