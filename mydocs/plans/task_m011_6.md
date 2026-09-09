# Prompter v0.1.1 Developer ID 서명 및 Notarization 구현 수행계획서

GitHub Issue: [#6](https://github.com/jinzer0/Prompter/issues/6)
종속 릴리스 Issue: [#7](https://github.com/jinzer0/Prompter/issues/7)
마일스톤: M011

## 목적

Prompter v0.1.1의 기존 자격 증명 없는 unsigned 로컬 패키징 경로를 유지하면서,
ARM64 macOS 배포용 Developer ID 서명과 Apple Notarization을 별도의 fail-closed
릴리스 경로로 구현한다.

구현 결과는 재현 가능한 코드 서명 순서, Keychain 전용 Notarization, 앱과 DMG의
독립 제출 및 검증, 실패 시 후속 작업 억제, 비밀정보 비노출을 자동 테스트와
유지관리자 문서로 고정한다. 실제 Apple 제출과 GitHub Release 게시는 종속 이슈 #7의
명시적 승인 단계에서만 수행한다.

## 배경

현재 v0.1.0 패키징은 unsigned 로컬 산출물만 만들며, README도 macOS의 unsigned 실행
안내를 제공한다. v0.1.1을 일반 사용자에게 배포하려면 `com.jinzer0.prompter` 번들 ID,
Developer ID Application 서명, hardened runtime, Apple Notarization과 staple, Gatekeeper
검증을 갖춘 별도 릴리스 절차가 필요하다.

이 계획은 `.omo/plans/apple-developer-id-notarization-release.md`의 Todos 2–8, GitHub
이슈 #6과 #7, Apple의 코드 서명 및 Notarization 지침, Electron 서명 지침을 기준으로
한다. 대상은 v0.1.1, ARM64이며 unsigned 로컬 패키징은 계속 자격 증명 없이 동작해야
한다.

## 범위

### 포함

- 패키지와 plist의 버전 `0.1.1`, 메인 번들 ID `com.jinzer0.prompter`, helper ID 파생 규칙
- 기존 `npm run package`와 `make`의 unsigned 로컬 경로 보존 및 별도 서명 릴리스 명령
- 완성된 앱 내부의 서명 대상 탐색, canonical path 검증, 깊이 우선 결정적 서명
- 최소 entitlement와 exact Developer ID Application identity를 사용하는 hardened runtime 서명
- Keychain profile 전용 Notarization, 로그 수집, 재개, staple, Gatekeeper 검증
- 앱과 DMG를 각각 제출하고 검증하는 fail-closed ARM64 릴리스 코디네이터
- identity, 순서, 실패 억제, cleanup, redaction, unsigned 경계 회귀 테스트
- 유지관리자 릴리스 문서, QA 체크리스트, 구현 중 README의 제한적 안내
- 단계별 검증, 보고서, 구현 PR 작성과 `master` 병합

### 제외

- 실제 Apple Notarization 제출과 실제 서명 릴리스 산출물 생성
- `v0.1.1` 태그, draft/public GitHub Release 생성 또는 게시
- x64, universal, PKG, Mac App Store, 자동 업데이트, CI 릴리스
- Apple ID, password, API key 파일 또는 비밀정보의 renderer/IPC/설정 노출
- copied dependency 제거, signing 시 `--deep` 사용, 실패 후 자동 재제출
- v0.1.0 사용자 설치 안내를 v0.1.1 공개 전 signed 상태로 변경
- `docs/plan`, `docs/draft`, `.omo/boulder.json`, Prometheus 계획 체크박스 수정

## 설계 방향

- unsigned 로컬 패키징과 signed 릴리스 패키징을 명령 및 실행 경로 수준에서 분리한다.
- 전체 앱 조립 후 canonical path가 앱 경계를 벗어나지 않는 서명 대상을 탐색하고,
  nested raw code와 bundle을 먼저 서명한 뒤 helper app과 외부 app을 서명한다.
- entitlement는 executable host와 helper app에만 적용하고 raw library에는 적용하지 않는다.
- Notarization은 `PROMPTER_NOTARY_PROFILE`이 가리키는 Keychain profile만 사용하며,
  제출 결과와 로그는 비밀정보를 제거한 상태로 로컬 evidence에 보존한다.
- timeout은 `unknown`으로 취급하고 같은 바이트를 자동 재제출하지 않으며 `info`와 `log`로
  재개한다.
- 릴리스 코디네이터는 ARM64, Xcode, identity, Keychain, profile, network를 산출물 변경 전에
  확인하고 app 제출부터 DMG 제출, 최종 hash까지 정해진 순서로만 진행한다.
- 실제 운영 도구 호출은 injected runner로 대체 가능한 모듈 경계에 두고 fixture 기반 테스트로
  순서, 실패 중단, cleanup, redaction을 검증한다.
- Stage별 구현과 직접 회귀 테스트를 같은 승인 및 커밋 경계에서 관리한다.

## 문서 위치 판단

| 파일 | 분류 | 대상 독자 | 선택 위치 | 대안 위치 | 선택 이유 |
|---|---|---|---|---|---|
| `docs/release-macos.md` | 공식 유지관리자 릴리스 문서 | 유지관리자/기여자 | `docs/` | `mydocs/manual/` | 제품별 서명 릴리스 운영 계약이므로 내부 방법론 매뉴얼이 아닌 공식 문서 루트가 적합하다. |
| `docs/qa-checklist.md` | 공식 QA 문서 | 유지관리자/기여자 | `docs/` | `mydocs/working/` | 반복 가능한 제품 릴리스 QA 기준이므로 일회성 작업 증거와 분리한다. |
| `README.md` | 공식 사용자/기여자 문서 | 사용자/기여자 | 저장소 루트 | `docs/` | 기존 설치 및 로컬 패키징 진실 원천의 위치를 유지한다. |
| `mydocs/plans/task_m011_6_impl.md` 및 단계/최종 보고서 | 작업 산출물 | 내부 작업자/에이전트 | `mydocs/` | `docs/` | Hyper-Waterfall 승인과 작업 복원을 위한 내부 산출물이므로 제품 문서와 분리한다. |

`docs/plan`과 `docs/draft`는 읽기 전용 근거이며 이번 task에서 수정하지 않는다.

## 예상 변경 파일

신규:

- `scripts/macos/entitlements.plist`
- `scripts/macos/signing.mjs`
- `scripts/macos/notarization.mjs`
- `scripts/release-macos.mjs`
- `tests/package-macos-signing.test.mjs`
- `tests/package-macos-notarization.test.mjs`
- `docs/release-macos.md`

수정:

- `package.json`
- `package-lock.json`
- `scripts/package-macos.mjs`
- `tests/package-macos.test.mjs`
- `tests/electron-contract.test.ts`
- `.gitignore`
- `docs/qa-checklist.md`
- `README.md`

이번 task 산출물:

- `mydocs/orders/20260908.md`
- `mydocs/plans/task_m011_6.md`
- `mydocs/plans/task_m011_6_impl.md` (이 수행계획서 승인 후 작성)
- `mydocs/working/task_m011_6_stage1.md`
- `mydocs/working/task_m011_6_stage2.md`
- `mydocs/working/task_m011_6_stage3.md`
- `mydocs/working/task_m011_6_stage4.md`
- `mydocs/working/task_m011_6_stage5.md`
- `mydocs/report/task_m011_6_report.md`

## 잠정 단계

- **Stage 1 — v0.1.1 패키징 정체성과 unsigned 경계 확립**
  - Todo 2의 버전, 번들 ID, plist, archive 이름, unsigned 및 signed 명령 경계를 구현한다.
  - 기존 unsigned 경로가 Apple 입력 없이 동작하고 signed 경로는 입력 누락 시 변경 전 실패하는지 검증한다.
- **Stage 2 — Developer ID 서명과 Keychain Notarization 기반 구현**
  - Todos 3–4의 최소 entitlement, 결정적 내부 우선 서명, profile 전용 제출/로그/재개/staple 모듈을 구현한다.
  - path escape, 누락 서명, identity/profile 오류, timeout, warning, 비밀정보 노출이 fail-closed인지 검증한다.
- **Stage 3 — 이중 제출 릴리스 코디네이터 통합**
  - Todo 5의 app 조립부터 app 및 DMG 제출, 검증, 최종 SHA-256까지 정확한 순서의 ARM64 코디네이터를 구현한다.
  - 각 실패 지점의 후속 호출 억제, partial artifact 제거, temp/mount cleanup, 게시 명령 부재를 검증한다.
- **Stage 4 — 회귀 테스트와 유지관리자 문서 확정**
  - Todos 6–7의 fixture/injected-runner 테스트, ignore 규칙, 공식 릴리스 문서, QA 체크리스트와 제한적 README 변경을 구현한다.
  - 모든 실패 클래스, redaction, 명령-문서 대응, 보호 경로 무변경을 검증한다.
- **Stage 5 — 통합 검증, 보고, 리뷰와 구현 병합**
  - Todo 8의 focused/full 테스트, typecheck, lint, build, unsigned package, smoke, 보안 및 artifact 검사를 수행한다.
  - 승인된 단계 보고와 최종 보고를 작성하고 승인 후 구현 PR을 `master`에 병합하되 실제 서명 제출과 릴리스는 실행하지 않는다.

## 검증 계획

### 단계별 검증

- Stage 1
  - package/plist fixture와 명령 계약 테스트로 `0.1.1`, bundle ID, helper suffix, archive 이름을 확인한다.
  - Apple 입력이 없는 `npm run package` 성공과 `npm run package:release:macos`의 mutation 이전 실패를 확인한다.
- Stage 2
  - fake runner fixture로 nested-before-outer 서명, entitlement 대상, `--deep` signing 부재를 확인한다.
  - profile preflight, Accepted/log/staple 순서, timeout 재개, warning 차단, sentinel redaction을 확인한다.
  - `plutil -lint scripts/macos/entitlements.plist`를 실행한다.
- Stage 3
  - injected full trace가 app 조립부터 hash-last까지 승인된 순서와 정확히 일치하는지 확인한다.
  - 모든 실패 지점에서 이후 mutation/제출/게시 호출이 없고 temp와 partial final artifact가 정리되는지 확인한다.
- Stage 4
  - `npm test -- tests/package-macos.test.mjs tests/package-macos-signing.test.mjs tests/package-macos-notarization.test.mjs tests/electron-contract.test.ts`
  - 문서 명령-스크립트 대응, credential pattern 부재, `git diff -- docs/plan docs/draft` 빈 출력을 확인한다.
- Stage 5
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - Apple 입력 없이 `npm run package`
  - `npm run test:smoke`
  - 누락된 release 입력으로 signed 경로가 candidate mutation 전에 nonzero 종료하는지 확인한다.

### 통합 검증

- focused 및 전체 검증 명령이 모두 exit code 0으로 끝난다.
- unsigned 로컬 패키징은 자격 증명과 무관하며 signed 릴리스 경로는 실패를 우회하지 않는다.
- renderer/IPC/설정/로그/테스트/추적 파일에 Apple 비밀정보 또는 키가 없다.
- `git diff -- docs/plan docs/draft`가 빈 출력이다.
- 생성 app, ZIP, DMG, Notarization 로그, 로컬 evidence는 추적되지 않는다.
- 구현 PR은 이슈 #6을 참조하고 `master`를 대상으로 하며, 병합 후 이슈 #7만 실제 릴리스 실행을 시작한다.
- `git diff --check`가 경고 없이 통과한다.
- 최종 PR 준비 시 `git status --short`가 빈 출력이다.

## 리스크

- **서명 대상 누락 또는 순서 오류**: canonical path 기반 전체 탐색과 post-sign 재탐색, fixture trace로 nested-before-outer 계약을 고정한다.
- **비밀정보 노출**: Keychain profile 이름만 경계 입력으로 허용하고 argv/error/evidence를 정제하며 sentinel scan을 수행한다.
- **Notarization 불확실 상태에서 중복 제출**: timeout을 `unknown`으로 기록하고 `info/log`로만 재개하며 자동 재제출을 금지한다.
- **unsigned 사용자 경로 회귀**: unsigned 명령에 release 입력 접근이 없음을 contract 및 실제 credential-free package 실행으로 검증한다.
- **부분 산출물의 오인 게시**: version-specific final allowlist, 단계별 검증, failure cleanup을 적용하고 구현 이슈에는 게시 기능을 두지 않는다.
- **문서가 공개 상태보다 앞서는 문제**: 구현 이슈의 README는 유지관리자 명령만 추가하고 v0.1.1 설치 안내와 unsigned 문구 변경은 이슈 #7 공개 후로 미룬다.

## 승인 요청 사항

- 위 다섯 Stage와 Todos 2–8의 매핑을 승인 요청한다.
- unsigned 로컬 패키징과 signed 릴리스 경로의 분리, ARM64 전용 release coordinator 방향을 승인 요청한다.
- `docs/release-macos.md`, `docs/qa-checklist.md`, `README.md`, `mydocs/`의 문서 위치 판단을 승인 요청한다.
- 실제 Apple 제출, 태그, GitHub Release 게시를 이슈 #7로 제외하는 범위를 승인 요청한다.

이 수행계획서가 명시적으로 승인되기 전에는 `task_m011_6_impl.md`를 생성하거나 제품,
소스, 테스트, README, QA 문서를 수정하거나 커밋하지 않는다. 승인되면
`task_m011_6_impl.md`에서 단계별 산출물, 검증 명령, 커밋 메시지를 구체화한다.
