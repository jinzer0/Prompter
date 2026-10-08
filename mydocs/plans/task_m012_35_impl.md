# Task #35 구현계획서 — v0.1.2 macOS ARM64 릴리스

수행계획서: [task_m012_35.md](task_m012_35.md)
GitHub Issue: [#35](https://github.com/jinzer0/Prompter/issues/35)
마일스톤: M012

## 승인 및 기준선

- 작업지시자가 “수행계획 승인 및 구현계획서 작성 승인”으로 수행계획과 이 문서 작성을 승인했다.
- 전용 `Prompter-task35` worktree / `local/task35`를 사용한다. 최초 기준선은 `3a456a610eb1c57a3ce86a821bb5390328cf2fa5`, 계획 작성 커밋은 `dd982b8`이다.
- 이번 승인은 구현계획 작성까지다. Stage 1 제품/테스트/공식 안내 수정은 별도 실행 승인 후 시작한다.
- 원본 master·BMAD·미추적 파일은 변경하지 않는다. 의존성 PR #29/#30/#33은 보류한다.

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | 버전·signed 계약 정합화 | 버전 gate·fixture·안내 및 Stage 1 보고 | release focused 회귀·typecheck·lint·diff-check |
| 2 | 전체 회귀·source 고정 | Stage 2 보고 및 후보 source commit 기록 | 전체 Vitest·fresh build·Electron smoke |
| 3 | 실제 서명·공증·설치 확인 | 로컬 ZIP/DMG/SHA256SUMS·sanitized receipts·Stage 3 보고 | Apple trust gates·artifact QA·격리 실행 |
| 4 | 승인된 공개 게시·안내 완료 | GitHub tag/Release/assets·README·최종 보고 | source/tag/bytes/다운로드 checksum·공개 상태 |

## 문서 위치 확인

| 파일 | 수행계획 위치 | 실제 Stage 산출물 위치 | 일치 | 비고 |
|---|---|---|---|---|
| README.md | 기존 루트 | Stage 1 준비 문구 / Stage 4 실제 공개 설치 안내 | OK | 공개 전 다운로드 버전은 v0.1.1 유지 |
| docs/release-macos.md | 기존 docs | Stage 1 maintainer 안내 | OK | 현재 준비 계약과 과거 #6/#7 사실 구분 |
| docs/qa-checklist.md | 기존 docs | Stage 1 QA 정합화 | OK | 실제 후보 검증 기준 |
| 릴리스 노트 | GitHub Release 본문 | Stage 4 v0.1.2 Release | OK | 신규 changelog 파일 만들지 않음 |
| 계획/단계/최종 보고 | mydocs/plans·working·report | 기존 task_m012_35 문서 | OK | 내부 승인/근거 |
| 오늘할일 | mydocs/orders | 20261006.md 및 실제 실행일의 날짜 파일 | OK | 날짜가 바뀌면 기존 기록 보존 후 당일 행 기록 |

공식 문서 루트 신규 생성/이동, docs/plan/plan.md 및 docs/draft 변경은 없다. 문서는 한국어로 작성한다.

## Stage 1 — 버전·signed 계약 정합화

### 산출물 및 수정 범위

- `package.json`, `package-lock.json`: 프로젝트/root package version만 0.1.2. dependency resolution·native Electron target 43.0.0·allowScripts는 그대로 유지.
- `scripts/macos/release-version-preflight.mjs`, `scripts/macos/release-support.mjs`: 정확한 signed 허용 버전만 0.1.2로 변경. 기존 0.1.1 허용 alias/fallback 없음.
- `tests/macos-release-contract.test.ts`: production 버전 정합성 확인.
- `tests/support/macos-coordinator-fixtures.mjs`, `tests/support/macos-coordinator-support.mjs`, `tests/support/macos-package-fixtures.mjs`: signed fixture 및 mutation sentinel 경로 0.1.2 정합화.
- signed coordinator 테스트에서 version-bound 경로/파일명 수정:
  - `tests/package-macos-coordinator-boundaries.test.mjs`
  - `tests/package-macos-coordinator-success.test.mjs`
  - `tests/package-macos-coordinator-app-recovery.test.mjs`
  - `tests/package-macos-coordinator-artifact-drift.test.mjs`
  - `tests/package-macos-coordinator-cached-accepted.test.mjs`
  - `tests/package-macos-coordinator-dmg-app-refresh.test.mjs`
  - `tests/package-macos-coordinator-dmg-recovery.test.mjs`
  - `tests/package-macos-coordinator-final-receipts.test.mjs`
  - `tests/package-macos-coordinator-signing-fingerprint-recovery.test.mjs`
  - `tests/package-macos-coordinator-signing-target-recovery.test.mjs`
- `README.md`, `docs/release-macos.md`, `docs/qa-checklist.md`: 준비 경로/후보 파일명을 0.1.2로 정합화하되 공개 v0.1.1 설치 사실 유지. 과거 #6/#7 안내를 현재 미완료 주장으로 남기지 않는다.
- `mydocs/working/task_m012_35_stage1.md`, 실행일 오늘할일.

일반 package/plist/archive 예제로 사용하는 `tests/package-macos-package.test.mjs`, `tests/package-macos-production-staging.test.mjs`, `tests/package-macos-notarization-submission.test.mjs`의 0.1.1은 signed gate와 무관하면 유지한다. 제품 버전을 담은 fixture 의미가 달라지면 근거를 보고하며 무차별 문자열 치환하지 않는다.

### 변경 내용과 회귀 기준

- production preflight와 coordinator 양쪽에서 0.1.2만 허용한다.
- 현재 boundaries 테스트의 reject 예제 0.1.2는 새 정상 버전이므로 과거 0.1.1·다른 버전·빈/잘못된 타입 등 실제 잘못된 값으로 바꿔 오류 이전 명령/파일 mutation 부재를 검증한다.
- 정상 버전의 missing/blank signing/notary 입력 거절도 유지한다. 올바른 0.1.2 fixture가 production entrypoint를 사용하는지 확인한다.
- 현재 등록된 Vitest package-macos 테스트를 그대로 사용한다. 새 테스트 파일이 꼭 필요하면 Vitest include까지 반영하고 범위를 보고한다.
- sign/notary helper 자체, artifact 소유권·symlink 경계, 재개·cached Accepted 재확인, cleanup/rollback·중복 제출 방지는 변경하지 않는다.

### 검증

node_modules가 없으면 `npm ci`로 기존 lockfile 설치 후 다음을 실행한다. install script 허용 정책을 완화하지 않는다.

```bash
./node_modules/.bin/vitest run tests/macos-release-contract.test.ts tests/package-macos-*.test.mjs
npm run typecheck
npm run lint
git diff --check
```

위 package-macos tests는 Vitest를 import한다. `node --test`로 대신하지 않는다. focused 테스트는 fake Apple fixture 검증이며 실제 Apple 서명/공증 성공을 주장하지 않는다. 변경 범위 formatter는 통합 후 상위 인스턴스가 한 번 실행한다.

### 커밋

`Task #35 Stage 1: v0.1.2 signed 배포 계약 및 회귀 정합화`

코드/테스트/안내와 Stage 1 보고를 함께 커밋한다. 승인 없이 다음 단계나 원격 게시로 넘어가지 않는다.

## Stage 2 — 전체 회귀와 후보 source 고정

### 산출물

- `mydocs/working/task_m012_35_stage2.md`, 오늘할일.
- 실제 검증 HEAD·Node/Electron 버전·exit code·test count·경고·미실행 항목 기록.

### 변경 내용

- Stage 1 승인 후 전체 gates를 실행한다. source 변경이 필요하면 동일 단계에서 임의 확장하지 않고 수정 범위 승인을 요청한다.
- 명령은 순차 실행한다. native ABI 전환은 기존 npm 스크립트만 사용한다.

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:smoke
git diff --check
git status --short
```

build 실패 시 smoke를 fresh PASS 근거로 실행/보고하지 않는다. native/Vite/Biome 경고를 숨기지 않는다.

### 커밋과 후보 기준선

`Task #35 Stage 2: 전체 회귀 통과 및 릴리스 기준선 기록`

Stage 2 보고를 커밋한 후 Stage 3 시작 시 `git rev-parse HEAD`와 clean status로 실제 후보 source commit을 고정한다. 그 commit이 전체 gates로 검증한 제품 tree와 동일한지 확인한다. 공개 tag의 정확한 대상은 Stage 3 보고와 공개 승인 요청에서 지정한다.

## Stage 3 — 실제 서명·공증·격리 설치

### 산출물

- 로컬 `release/v0.1.2/` 아래 ZIP·DMG·SHA256SUMS 세 파일만.
- 로컬 `.omo/evidence/release-macos/v0.1.2/{app,dmg}/notarization-final.json` sanitized receipts.
- `mydocs/working/task_m012_35_stage3.md`: source SHA·asset 크기/SHA256·notary 판정·QA 결과·사용자 확인·한계.

### 실행 전 승인과 검증

- 별도 Stage 3 실행 승인 후에만 Apple 접근/제출과 candidate 생성.
- source clean·arm64·full Xcode·candidate 부재와 입력 존재 여부를 확인한다. identity/profile 값·환경 전체·Keychain raw 출력은 로그/문서에 남기지 않는다.
- 사람의 Keychain/인증 설정이 필요하면 원인만 보고하고 해당 조치를 요청한다. 다른 앱/DB/Release를 변경하지 않는다.

```bash
npm run package:release:macos
```

기존 coordinator의 app ZIP 제출/Accepted-log 검증/app staple, 최종 ZIP 검증, DMG 서명/제출/Accepted-log/staple/Gatekeeper/readonly mount/contained app 검증, SHA256SUMS 마지막 생성 흐름을 유지한다.

### 설치 QA

- 기존 docs/qa-checklist.md의 signed-release 항목을 실제 candidate에 수행한다.
- app identity `com.jinzer0.prompter`, plist 양 버전 0.1.2, app/DMG signature·stapler·Gatekeeper 및 checksum 확인.
- ZIP/DMG에서 격리 위치로 복사한 앱을 임시 user-data로 실행해 DB 열기·기본 Library·theme·저장/복사·종료 등을 확인한다. 기존 Applications 앱/사용자 DB 덮어쓰기 금지.
- 사용자 OS 손동작 확인은 요청/회신과 자동 Electron API 근거를 별도로 보고한다. Apple timeout 시 기존 artifact-bound 재개만 사용하며 무조건 새 제출하지 않는다.
- 실패 시 공개 중단. owned cleanup 결과·남은 candidate/evidence를 보고하고 임의 삭제하지 않는다.

### 커밋

`Task #35 Stage 3: v0.1.2 서명 공증 및 설치 검증 기록`

보고만 커밋하고 binary·local evidence·입력 값은 게시하지 않는다. Stage 3 종료 후 후보 검증/최종 보고와 구현 PR 게시·merge 및 실제 공개 승인을 각각 요청한다.

## Stage 4 — 공개 게시와 안내 완료

### 승인 게이트

1. Stage 1–3 검증/후보 보고 승인.
2. `publish/task35` push·Open PR 생성·리뷰 대응·merge 승인. base는 master, local/task35는 로컬만 유지.
3. 실제 공개 승인: tag `v0.1.2`의 정확한 후보 source SHA, ZIP/DMG/SHA256SUMS, asset checksum, 의존성 보류 위험 제시.
4. 게시 후 README 안내/완료 기록 갱신과 원격 반영을 승인된 절차로 수행.

새 공개 tag는 실제 후보 source commit을 가리키며 해당 commit이 검토·병합된 이력에 포함되는지 확인한다. merge tip/report SHA를 후보 source SHA로 바꿔 주장하지 않는다. 제품 tree가 후보 이후 변경되면 중단하고 재검증한다.

### 게시·검증

- `v0.1.2` tag/Release가 이미 있으면 중단한다. 기존 tag/Release 재작성·asset clobber 금지.
- 공개 승인 후 확정 source SHA와 asset allowlist를 사용해 immutable tag/Release/assets 게시. 실제 명령은 승인 요청에서 source SHA와 artifact 경로를 확정한다.
- GitHub API와 tag 조회, asset 이름/수/크기, 다운로드 bytes의 SHA256SUMS를 실제 확인한다.
- 게시 성공 후에만 README의 최신 다운로드 파일명·서명/공증 사실을 v0.1.2로 전환한다. 준비 안내와 공개 안내를 혼동하지 않는다.
- GitHub Release 노트는 한국어로 변경 요약·ARM64 설치·검증 출처·알려진 제한 및 의존성 보류를 작성한다.
- `mydocs/working/task_m012_35_stage4.md`, `mydocs/report/task_m012_35_report.md`, 오늘할일 갱신.

### 커밋

- `Task #35 Stage 4: v0.1.2 공개 배포 및 설치 안내 갱신`
- `Task #35 Stage 4 + 최종 보고서: 공개 산출물 검증 및 완료 기록`

공개 후 안내 commit은 candidate source/tag와 별도 이력임을 명시한다. release 산출물 자체를 수정하지 않는다. Issue 종료와 브랜치/worktree 정리는 실제 merge·게시 확인 및 승인 범위에 따라 진행한다.

## 단계 의존성 및 공통 검증

- Stage마다 보고·승인 후 다음 단계로 진행한다. 현재는 구현계획 승인과 Stage 1 실행 승인 대기다.
- 통합된 변경에 대해 상위 인스턴스가 gates/formatter/native rebuild를 실행한다. 하위 에이전트는 독립 범위만 담당하고 gates를 실행하지 않는다.
- 문서 위치/기술 설계/승인 범위가 달라지면 기존 단일 계획을 갱신하고 승인을 받는다.
- 실패한 테스트나 Apple trust gate를 억제하지 않는다. partial 후보/검증을 완료로 보고하지 않는다.
- 작업 범위/상태 확인은 git status·diff-check로 수행하고 사용자/다른 작업자의 파일을 보존한다.

## 위험과 대응

- 의존성 취약점: 보류 결정을 유지하되 공개 직전 최신 실제 위험 상태를 다시 조회하고 별도 공개 승인에 명시한다.
- 버전 반전 회귀: 과거 reject 값 0.1.2를 정상으로 바꾸는 만큼 실제 invalid 값/무mutation 관측을 추가한다.
- Apple 인증/네트워크: 비밀값 없이 실패 범위를 보고, unsigned fallback/무조건 재제출 금지.
- source/asset drift: exact source commit·제품 tree·SHA256를 함께 고정하고 승인 후 변경 시 중단한다.
- 사용자 환경 손상: 임시 user-data·격리 설치만 사용, 기존 앱 교체는 별도 명시 승인.
- 게시 뒤 문서 오해: 공개 후 안내 commit과 후보 SHA를 구분하고 과거 설치 사실은 진실하게 유지한다.

## 승인 요청 사항

- 위 4단계 산출물·검증·문서 위치·커밋/공개 승인 경계를 승인한다.
- Stage 1의 v0.1.2 정확한 version gate·signed fixtures/회귀·기존 공식 준비 안내 수정 실행을 승인한다.
- Stage 2/3/4, Apple 제출, 원격 push/PR/merge, 공개 tag/Release/upload는 각각 후속 승인을 받는다.
