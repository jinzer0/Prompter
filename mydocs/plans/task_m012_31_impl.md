# M012 macOS 네이티브 UX/UI 리팩토링 구현계획서

수행계획서: [task_m012_31.md](task_m012_31.md)
GitHub Issue: [#31](https://github.com/jinzer0/Prompter/issues/31)
마일스톤: M012
상태: Stage 1–5 구현·검증·보고 승인 완료. [Open PR #32](https://github.com/jinzer0/Prompter/pull/32) 게시 완료, merge 미실행

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | UX 계약과 핵심 화면 확정 | DESIGN·EXPERIENCE·핵심 시안·재현 근거 | 요구사항 추적, 시안 및 사용자 확인 |
| 2 | 네이티브 창과 양 테마 기반 | 창 옵션·통합 헤더·테마 계약과 저장 | IPC·설정·창 테스트, OS 시나리오 |
| 3 | 작업 공간과 설정 정리 | 연결된 3패널·설정 화면·추가 옵션 | UI·메뉴·상태 보존 회귀 |
| 4 | 직접 사용과 안전한 저장 | 직접 편집·복사·새 버전·복제·미저장 보호 | 저장·전환·오류·닫기 검증 |
| 5 | 통합 검증과 최종 보고 | QA 갱신·최종 보고 | 전체 테스트·build·smoke·macOS 수동 검증 |

현재 승인은 Stage 5의 통합 검증·안내 정합화·최종 보고까지다. 사용자는 Stage 3 보고 후 “승인”으로 Stage 4를, Stage 4 보고 후 “Stage 5 진입 승인”으로 Stage 5를 같은 스레드에서 명시 승인했다. 커밋·push·PR은 별도 승인 대상이다. 오입력으로 철회된 “대시보드의 정보 배치”는 신규 범위에 포함하지 않으며 Insights는 기존 동작의 회귀 검증 대상이다.

Stage 2 결과는 [단계 보고서](../working/task_m012_31_stage2.md)에 기록했다. 전체 Vitest 1104개와 Electron 49개가 통과했고 사용자 손동작으로 창 이동을 확인했다. OS 설정 직접 전환·최초 표시 프레임 촬영·native 버튼 전수 손동작은 미실시로 구분한다. 검증 기록과 이후 사용자의 Stage 3 승인은 별개이며 최종 타스크 완료를 뜻하지 않는다.

Stage 3 결과는 [단계 보고서](../working/task_m012_31_stage3.md)에 기록했다. 전체 Vitest 1110개·Electron 52개와 lint/typecheck/build가 통과했다. Library/Settings의 양 테마·두 창 크기 8화면, 부작용 없는 진입·선택/초안 보존·추가 옵션·메뉴 목적지를 확인했다. 공백 하네스 입력이 변경된 한 실행의 미확정 원인과 재확인 결과를 구분한다. 직접 편집·안전한 저장은 Stage 4 범위로 분리했다.

Stage 4 결과는 [단계 보고서](../working/task_m012_31_stage4.md)에 기록했다. 전체 Vitest 1167개·Electron 61개와 lint/typecheck/build가 통과했다. 직접 copy/Cmd+S·복제·명시적 적용·세 선택 전환·저장 실패 재시도·native close·잠금 복원을 검증했다. OS 손동작·강제 종료·전체 접근성 인증 한계는 보고서와 구분하며 Stage 5 진입은 별도 승인 대기다.

아래 신규 모듈 경로는 책임 경계를 명확히 하기 위한 계획이다. Stage 1에서 확정한 레이아웃·창 크기·저장 정책은 루트 `DESIGN.md`와 `docs/ux/EXPERIENCE.md`를 따른다. 실제 OS 드래그 검증은 Stage 2로 이관 승인되었으며 수행 전 통과로 취급하지 않는다.

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| 시각 계약 | 루트 `DESIGN.md` | `DESIGN.md` | OK | 기존 공식 진실 원천 유지 |
| 행동 계약 | `docs/ux/EXPERIENCE.md` | 동일 | OK | 시각 토큰은 DESIGN 참조 |
| UX 작업 공간 | `_bmad-output/initiative-prompter-ux-refactor/ux-native-desktop/` | 동일 | OK | 초안·memlog·imports·검토 자료 |
| 검토된 시안 | `docs/ux/mockups/` | 동일 | OK | 승인된 keepers만 승격 |
| 사용자·기여자 안내 | 기존 README·QA·AGENTS | `README.md`, `docs/qa-checklist.md`, `AGENTS.md` | OK | 직접 영향받는 내용만 |
| 단계 보고 | `mydocs/working/` | `task_m012_31_stage{N}.md` | OK | 각 단계 근거·한계 포함 |
| 최종 보고 | `mydocs/report/` | `task_m012_31_report.md` | OK | 제품 계약과 구분 |

공식화 시 BMAD 초안의 두 계약은 공식 경로로 승격하고 작업 공간에는 경로 참조를 남겨 두 개의 최종 진실 원천이 생기지 않게 한다. 기존 initiative와 사용자 스킬 설치는 이동하지 않는다.

## Stage 1 — UX 계약과 핵심 화면 확정

### 산출물

신규:

- UX 작업 공간의 `.memlog.md`, `ux-native-desktop.md`, DESIGN·EXPERIENCE 초안, `.working/`, `imports/`.
- `docs/ux/EXPERIENCE.md`, `docs/ux/mockups/`의 승인된 핵심 시안.
- `mydocs/working/task_m012_31_stage1.md`.

수정:

- `DESIGN.md`와 새 계약 링크·상충하는 dark-only 지침을 소유하는 `README.md`, `AGENTS.md`의 관련 부분.

### 변경 내용

- 주 checkout의 BMAD 스킬·런타임을 읽기 전용으로 참조하고 task31 작업 공간을 명시한다. resolve_config/customization과 memlog의 경로 해석을 확인하고 사용자 설치·설정을 임의로 복사하거나 변경하지 않는다.
- bmad-ux의 예시·spec·선택한 creative tool 지침을 읽는다. source scan 후 사용자 확인을 받은 자료만 설계 입력으로 사용한다.
- 합의한 문제 7개, 드래그 미확정, 테마 정책, 목록 중심 흐름, 새 버전/복제 저장과 미저장 보호를 memlog.py로 기록한다. 이전 대화를 새 승인이 있었던 것처럼 기록하지 않는다.
- 실제 앱은 별도 테스트용 userData/DB에서 실행한다. native 메뉴·창 버튼·타이틀바/본문 드래그·선택·초기 가로 넘침을 확인하고 소스 추정과 구분한다.
- 최소 창 크기, 직접 편집과 컴파일의 배치, 사용 대상·working mode 등 남은 결정만 확인한다. 핵심 여정의 주체를 임의 인물로 지어내지 않는다.
- Library의 세 영역과 Settings의 관계, 정상·빈 상태·오류·저장 중·미저장·읽기 전용 상태를 행동 계약에 정의한다. 직접 복사 대상과 편집/컴파일 출력의 차이를 명시한다.
- 라이트·다크 Library와 Settings, 미저장 보호 시안을 검토한다. 모형으로 표현하지 않은 화면은 spine-only 여부를 사용자에게 확인한다.
- 선택적 리뷰 여부·렌즈는 사용자 opt-in에 따른다. 미확정 항목을 해소하고 두 계약의 토큰 참조·시안 일치·공식 경로를 검증한 뒤 Finalize한다.

### 검증

- 모든 포함 범위가 계약·화면·검증 항목에 연결되는지 대조한다.
- 3패널 유지, Insights·Privacy 예외, 키보드 포커스·대비·양 테마, 저장/실패/취소 상태를 검토한다.
- 기존 Playwright 실행과 userData 격리 방식을 먼저 확인한다. 실제 앱 조사는 제품 데이터·실제 키·LLM 호출 없이 진행한다.
- 문서와 시안 검증을 완료하기 전 Stage 2로 넘어가지 않는다.

```bash
git diff --check
```

### 커밋

명시적 커밋 승인 후 아래 메시지를 사용한다. 사용자 BMAD 설치와 runtime 파일은 포함하지 않는다.

```text
Task #31 Stage 1: 네이티브 UX 계약과 핵심 화면 확정
```

## Stage 2 — 네이티브 창과 양 테마 기반

### 산출물

- 수정: `electron/window-options.ts`, `electron/main.ts`, `electron/ipc-contract.ts`, bridge 타입·구현·preload·handler 중 영향받는 경로, 기존 settings 저장 경로.
- 수정: `renderer/src/styles.css`, `renderer/src/components/shell/`, `renderer/src/components/settings-defaults-form.tsx` 및 설정 훅.
- 신규 책임 모듈 후보: `electron/appearance-service.ts`, `renderer/src/hooks/use-appearance.ts`.
- 신규 테스트: `tests/appearance-contract.test.ts`, `tests/appearance-service.test.ts`, `tests/appearance-ui.test.ts`.
- `mydocs/working/task_m012_31_stage2.md`.

### 변경 내용

- 계약에서 테마 선호도(system/light/dark)와 유효 테마를 구분한다. 기존 설정 저장을 재사용하고 불필요한 DB migration은 추가하지 않는다.
- main이 Electron nativeTheme와 창 배경을 소유한다. renderer는 타입화된 bridge 또는 기존 renderer-safe 플랫폼 패턴으로 유효 테마를 받고 구독 해제를 보장한다.
- 최초 표시 전 테마 적용, OS 변경 즉시 반영, 직접 선택 persistence, 저장 실패 시 실제 상태/표시 일치를 처리한다.
- 모든 의미 토큰에 양 테마 값을 정의하고 기존 로컬 래퍼·잠금 화면·대화상자에 적용한다. 미검증 대비나 OS material 지원을 가정하지 않는다.
- Stage 1에서 확정한 초기·최소 크기와 헤더/창 버튼 배치를 적용한다. 창 이동은 지정된 비상호작용 영역으로 한정하고 버튼·입력·텍스트 선택 영역은 제외한다.

### 검증

- 선호도 저장·유효 테마 반영·재시작·OS 변경, 구독 해제, 잘못된 IPC 값·저장 실패, 초기 화면 flash를 확인한다.
- 초기·최소 창에서 3패널과 창 버튼 가시성, 조작 영역의 hit-test를 실제 macOS에서 검증한다.

```bash
npm test -- tests/appearance-contract.test.ts tests/appearance-service.test.ts tests/appearance-ui.test.ts tests/phase9-contract.test.ts tests/main-window-security.test.ts
npm run typecheck
npm run lint
git diff --check
```

### 커밋

```text
Task #31 Stage 2: 네이티브 창과 시스템 라이트 다크 테마 구현
```

## Stage 3 — 작업 공간과 설정 정리

### 산출물

- 수정: `renderer/src/components/shell/app-shell.tsx`, `panel.tsx`, Library·Settings·컴파일러 form·header 컴포넌트, 관련 workspace navigation·menu 훅.
- 신규 책임 컴포넌트 후보: `renderer/src/components/settings-workspace.tsx`.
- 신규 테스트: `tests/native-workspace-ui.test.ts`.
- `mydocs/working/task_m012_31_stage3.md`.

### 변경 내용

- shell gutter와 떠 있는 panel 스타일을 승인된 연속 3패널 구조로 교체한다. 필요한 내부 콘텐츠 그룹까지 일괄 평탄화하지 않는다.
- 사이드바에서 설정 form을 분리하고 기존 Settings 메뉴/Cmd+, 진입점을 같은 화면으로 연결한다. Library로 복귀할 때 선택·초안·검색 상태를 보존한다.
- 유지보수·백업·키 관리의 서비스와 사용자 확인 절차를 재사용한다. 설정 화면 진입이 스캔·내보내기·LLM 요청을 시작하지 않게 한다.
- 컴파일러 핵심 입력과 추가 옵션을 구분하되 접힘/열림이 값을 지우지 않게 한다.
- 사용자 문구를 정리하고 상태·오류 피드백을 제거하지 않는다. 기존 Insights·Privacy 선택 복귀 경로를 갱신한다.

### 검증

- 탐색/Settings 진입·복귀, 화면 전환 시 draft 보존, 옵션 값 보존, 메뉴·키보드 포커스, 양 테마 가독성을 확인한다.
- native workspace 테스트에 3패널 가시성·가로 넘침·설정 자동 작업 금지를 포함한다.

```bash
npm test -- tests/native-workspace-ui.test.ts tests/electron-settings-ui.test.ts tests/electron-menu-contract.test.ts tests/phase17-maintenance-settings-ui.test.ts
npm run typecheck
npm run lint
git diff --check
```

### 커밋

```text
Task #31 Stage 3: 작업 공간 통합과 설정 및 컴파일러 정보 정리
```

## Stage 4 — 직접 사용과 안전한 저장

기존 duplicate IPC는 저장된 버전만 복사하므로 편집 스냅샷 복제를 위해 기존 계약에 선택적인 `editedVersion`·`title`을 추가한다. 저장 버전 복제와 편집 스냅샷 복제를 각각 유지하며 원본에 먼저 새 버전을 만드는 우회는 하지 않는다. 버전의 본문·원래 요청은 기존 `requiredPreservedTextSchema`로 공백을 포함해 보존하고 blank는 거절한다. 직접 편집 저장은 atomic IPC 결과를 먼저 확정한 뒤 UI/검색 갱신 실패를 별도로 표시한다. 잠금 시 AppShell unmount 정책은 보존하며 편집 상태와 닫기 확인은 App의 수명에 둔다.

### 산출물

- 수정: `renderer/src/hooks/use-compiler-persistence-actions.ts`, `use-prompt-compiler-panel.ts`, Library 선택·버전 데이터 훅, 관련 저장/복제 helper와 메뉴 라우팅.
- 신규 책임 모듈 후보: `renderer/src/hooks/use-prompt-editor.ts`, `renderer/src/hooks/use-unsaved-changes-guard.ts`, `electron/window-close-guard.ts`.
- 필요 시 수정: IPC 계약·bridge·handler와 기존 prompt/version repository. 기존 계약과 맞지 않는 요구가 발견되면 먼저 계획을 갱신한다.
- 신규 테스트: `tests/prompt-editor-actions.test.ts`, `tests/unsaved-changes-guard.test.ts`.
- 기존 버전·메뉴 테스트 및 `tests/electron-smoke.test.ts` 보강.
- `mydocs/working/task_m012_31_stage4.md`.

### 변경 내용

- 현재 saveNextVersion은 compiled 결과를 요구한다. 직접 편집을 위해 이 guard를 단순 삭제하지 않고 저장된 버전에서 편집 모델을 구성해 기존 compiled 저장과 책임을 구분한다. required compiled sections 검증은 유지한다.
- 저장된 내용의 직접 복사는 컴파일을 요구하지 않는다. 편집 중 복사 대상은 Stage 1에서 확정한 계약을 따른다.
- 기본 저장/Cmd+S는 새 버전 생성과 current 지정, 별도 복제 버튼은 편집한 내용을 독립 asset으로 저장한다. 원본 asset/version을 덮어쓰지 않는다.
- 저장 성공을 알려주는 명시적 결과를 사용한다. 현재 Promise<void>와 내부 catch만으로 닫기 성공 여부를 추정하지 않는다.
- version 저장 이후 검색 색인/태그 갱신 실패와 실제 저장 실패를 구분해 재시도로 중복 버전이 생기지 않도록 한다.
- dirty 상태는 저장된 기준값과 비교한다. 저장 중 중복 제출과 연속 전환을 제어하고 성공 시에만 기준값을 갱신한다.
- 선택 변경·창 닫기에서 저장 / 변경 버리기 / 취소를 동일 정책으로 연결한다. cancel과 Escape는 편집 유지, failure는 이동/닫기 중단, discard는 명시적 선택 뒤 진행한다.
- main의 닫기 재진입 방지와 renderer 확인 완료를 연결하고 trusted sender·잠금 정책을 유지한다. OS 강제 종료까지 보호한다고 주장하지 않는다.

### 검증

- 직접 복사 payload, 새 버전·current·원본 보존, 복제 독립성, empty/unchanged/dirty 상태, 중복 저장, 실패와 성공 후 부가 작업 실패를 검증한다.
- 선택 변경/창 닫기 각각에서 저장·버리기·취소·저장 실패, 포커스 복귀, 연속 요청을 검증한다.
- renderer 단위 검증과 실제 Electron close 시나리오를 모두 수행한다.

```bash
npm test -- tests/prompt-editor-actions.test.ts tests/unsaved-changes-guard.test.ts tests/electron-prompt-version-ui.test.ts tests/electron-contract-menu-version.test.ts tests/phase20-app-lock-contract.test.ts
npm run typecheck
npm run lint
npm run test:smoke
git diff --check
```

### 커밋

```text
Task #31 Stage 4: 직접 편집 저장과 미저장 변경 보호 구현
```

## Stage 5 — 통합 검증과 최종 보고

실행 결과는 [Stage 5 보고](../working/task_m012_31_stage5.md)와 [최종 보고](../report/task_m012_31_report.md)에 기록했다. Vitest 1167개·Electron 61개, typecheck/lint/build 및 14화면·실제 재시작/quit 취소/activate 검증을 완료했다. desktop capture 실패 이후 사용자에게 OS 테마 전환·타이틀바/본문 선택 구분·native 버튼/dirty Cmd+Q 취소를 요청했고 “세 항목 정상 확인” 회신을 받았다. 격리 검증 앱·monitor·임시 DB를 정리했다. 전체 최초 프레임·전체 접근성 인증 한계는 유지하며 최종 보고와 commit/push/PR 승인은 별개다.

### 산출물

- `docs/qa-checklist.md`, 실제 구현과 계약/안내의 직접 영향 부분 갱신.
- `mydocs/working/task_m012_31_stage5.md`.
- `mydocs/report/task_m012_31_report.md`, `mydocs/orders/20261005.md` 상태 갱신.

### 변경 내용

- 모든 요구사항을 실제 결과와 매핑한다. 앱 기능 구현 여부와 문서·시안 확정 여부를 구분한다.
- 전체 검증 실패는 원인과 재현 근거를 기록하고 해결 또는 승인된 범위 조정 없이 완료 처리하지 않는다.
- 디자인/사용성 검토와 자동 테스트 결과를 구분한다. 원래 checkout의 사용자 미추적 파일을 이번 PR에 포함하지 않는다.

### 검증

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:smoke
git diff --check
git status --short
```

- macOS: 시스템 테마 전환, 직접 테마 선택/재시작, 초기/최소/확대 창, 타이틀바 드래그와 본문 선택, 창 닫기 확인.
- 사용자 여정: 찾기 → 선택 → 복사, 수정 → 새 버전, 수정 → 복제, 미저장 상태에서 선택·닫기 분기.
- 회귀: Settings·키·백업·수동 유지보수, Insights·Privacy의 읽기 전용/명시적 동작, 잠금, 컴파일 required sections와 프로젝트 binding.
- 자동화/수동/미실행 근거를 별도 기록한다. native rebuild는 기존 스크립트만 사용한다.

### 커밋

```text
Task #31 Stage 5 + 최종 보고서: 네이티브 UX 통합 검증 완료
```

## 검증

- 위 명령은 앞으로 실행할 검증 계획이며 이번 구현계획 작성에서 실행했다는 뜻이 아니다.
- 신규 테스트 파일은 각 단계 구현 시 생성하고 Vitest include 설정에 맞춰 실제 수집됨을 확인한다. 테스트 0개 수집은 성공으로 처리하지 않는다.
- 각 단계 focused tests는 최소 집합이다. 실제 변경된 callsite의 추가 회귀 테스트도 실행한다.
- 실행 환경 미준비·OS 검증 불가 등은 단계 보고의 한계/미해결 사항으로 기록한다.
- 제품 문서와 소스의 경로/범위 변경이 필요하면 계획을 먼저 수정하고 승인을 받는다.

## 커밋

- 모든 메시지는 계획이며 커밋을 아직 실행하지 않는다. 명시 승인 후 단계 산출물과 해당 stage 보고서를 함께 묶는다.
- 준비 문서 커밋 후보: `Task #31: 수행 및 구현 계획서 작성과 오늘할일 갱신`.
- stage·commit·push·PR 승인 경계는 각각 유지한다. local/task31은 원격에 직접 push하지 않는다.

## 단계 의존성

- Stage 1은 본 구현계획과 실행 승인 후 시작한다.
- Stage 2는 Stage 1 계약·시안 확정과 보고 승인 후 진행한다.
- Stage 3은 Stage 2 검증·보고 승인 후, Stage 4는 Stage 3 검증·보고 승인 후 진행한다.
- Stage 5는 Stage 4 검증·보고 승인 후 진행한다. 최종 보고 후 PR은 별도 승인 대상이다.

## 위험과 대응

- **3패널 최소 너비**: 초기 너비만 키워 숨기지 않고 최소 지원 크기에서 가독성과 조작 가능성을 Stage 1에서 검증한다.
- **실제 실행 미검증**: 코드 검색을 창 조작 검증으로 대체하지 않는다. 사용자 데이터와 분리한 실행 환경을 사용한다.
- **BMAD 설치 분리**: 기존 스킬을 읽기 전용 참조하되 산출물 경로를 task31로 명시하고 실제 경로를 확인한다.
- **저장과 부가 작업 실패**: 저장 결과를 분리하고 중복 버전·잘못된 닫기 승인·편집 유실을 테스트한다.
- **보안과 UI 전환**: 잠금/시크릿/프로젝트 binding을 완화하지 않는다. 합의되지 않은 추가 정책은 Stage 1에서 확인한다.
- **테마·OS 옵션 차이**: 설치된 Electron API와 macOS에서 확인하며 unsupported material이나 fallback을 임의 추가하지 않는다.

## 승인 요청 사항

- 승인된 수행계획을 위 5단계의 산출물·검증·의존성으로 실행하는 구현계획.
- 우선 Stage 1의 격리된 앱 탐색, bmad-ux 결정 기록·계약·시안 작업 시작.
- Stage 2 이후 제품 코드 수정은 Stage 1 결과 확인 후 별도 승인한다.
