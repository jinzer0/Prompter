# M012 Task #31 최종 보고서

GitHub Issue: [#31](https://github.com/jinzer0/Prompter/issues/31)
마일스톤: M012
상태: Stage 1–5 구현·검증·보고 승인 완료. [Open PR #32](https://github.com/jinzer0/Prompter/pull/32) 게시 완료, merge 미실행

## 작업 요약

- 목적: Electron·React와 필수 Library 3패널을 유지하면서 macOS 창 통합·양 테마·직접 사용 흐름을 개선.
- 승인된 5단계의 구현과 자동 검증을 수행했다. Scratch는 디자인 참고이며 프레임워크·기능을 복제하지 않았다.
- 직접 찾기→복사/편집→새 버전, 독립 복제, 명시적 compiler 적용, 미저장 전환/닫기 보호를 제공한다.
- 별도 Settings·관리 목적지를 제공하고 기존 선택·검색·초안·프로젝트 binding·잠금 경계를 유지한다.
- 작업 위치는 전용 `Prompter-task31`, 브랜치 `local/task31`이다. 원격에는 `publish/task31`로 게시한다.
  공개 v0.1.1 배포본을 갱신·서명·패키징·게시한 것이 아니다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `DESIGN.md`, `docs/ux/EXPERIENCE.md`, `docs/ux/mockups/` | 승인된 시각·행동 계약과 핵심 시안 | 공식 UX 기준 |
| `AGENTS.md`, `README.md`, `docs/qa-checklist.md` | 계약 링크·직접 사용 안내·실행 QA 절차 | 기여자/사용자 안내 |
| `electron/appearance-service.ts`, `appearance-ipc.ts`, `window-options.ts`, `main.ts` | 기존 app_theme 저장과 nativeTheme·배경·초기 표시·크기 연결 | native 창/appearance |
| `electron/ipc-contract.ts`, `ipc-types.ts`, `bridge.ts`, `preload.ts` | 검증된 appearance/close 계약, 정확한 본문/clipboard, 편집 복제 | IPC·trusted renderer |
| `electron/db/repositories/settings.ts`, `db/services.ts` | 설정 원자성·편집 snapshot 복제·원본 보존 | 기존 persistence, migration 없음 |
| `electron/window-close-guard.ts`, `window-close-ipc.ts` | nonce·문서/잠금 epoch·current state·일회 승인·quit 조율 | native 종료 및 서비스 수명 |
| `renderer/src/app.tsx`, `main.tsx`, `styles.css`, `lib/appearance.ts`, `hooks/use-appearance.ts` | 공통 chrome·시작 appearance·양 테마·drag/no-drag·세 열 | 잠금/해제 공통 shell |
| `components/shell/`, `settings-workspace.tsx`, 설정·관리·목록 컴포넌트 | 연결된 패널과 별도 설정, 좁은 제어·프로젝트 이름 가독성 | 탐색·상태 보존 |
| `lib/prompt-editor.ts`, `hooks/use-prompt-editor.ts`, `use-unsaved-changes-guard.ts`, `components/prompt-editor*.tsx` | 외부 편집 상태·명시 저장 결과·복제·확인·실패 유지 | 직접 사용과 미저장 보호 |
| compiler·version·export 컴포넌트/훅, project/prompt 로더, `lib/menu-actions.ts` | 본문 우선·옵션 접힘·명시 적용·Cmd+S·binding·부가 재시도 | 기존 compiler와 editor 분리 |
| `tests/appearance-*.test.ts`, `prompt-editor-actions.test.ts`, `unsaved-changes-guard.test.ts`, `window-close-guard.test.ts` | 계약·테마·저장/동시성·잠금·close 경계 | 단위/서비스 검증 |
| `tests/native-workspace-ui.test.ts`, `prompt-editor-electron-ui.test.ts`, 기존 관련 회귀 | 목적지·옵션·직접 사용·실제 native close | 격리 Electron 검증 |
| `vitest.config.ts`, `playwright.config.ts` | 신규 테스트 명시 수집 | 0개 수집을 성공으로 취급하지 않음 |
| `mydocs/plans/`, `orders/`, `working/task_m012_31_stage*.md` | 승인·단계 결과·위험 기록 | 작업 이력, 제품 계약과 구분 |

구체적인 파일별 변경은 아래 단계 보고서에 있으며 상기 경로는 책임별 목록이다.
현재 diff에는 Stage 1–5 변경이 함께 남아 있고 사용자 BMAD 설치/agent runtime은 게시 대상으로 취급하지 않는다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과·근거 |
|---|---|---|---|
| 시각 계약 | 루트 DESIGN | `DESIGN.md` | OK — 기존 공식 위치 유지 |
| 행동 계약·keepers | `docs/ux/` | `EXPERIENCE.md`, `mockups/` | OK — 단일 계약, workspace 중복 최종본 제거 |
| 사용자 안내·QA | 기존 README·QA | `README.md`, `docs/qa-checklist.md` | OK — 기존 내용 중 직접 영향 부분만 갱신 |
| 단계 보고 | `mydocs/working/` | `task_m012_31_stage1.md`~`stage5.md` | OK — 단계별 근거/미실행 구분 |
| 최종 보고 | `mydocs/report/` | 이 문서 | OK — 승인 완료, 출시 선언 아님 |
| UX runtime evidence | 승인된 BMAD workspace | `.working/` JSON·scoped PNG·memlog | OK — 진실 원천 계약을 복제하지 않음 |

## 변경 전·후 정량 비교

| 지표 | 변경 전 관찰 | 변경 후 관찰 |
|---|---|---|
| 1024px 폭 shell | scrollWidth 1088px | 1024px, 가로 넘침 없음 |
| 1180/1024/1440px Library 열 | 기존 불일치 | 210px / 280px / 남은 폭, 세 열 표시 |
| 저장 light의 실제 appearance | dark color-scheme·rgb(8,9,10) | light와 #F7F8F8, 재시작 유지 |
| 직접 저장 선행 조건 | compiler 출력 중심 | 선택한 body 편집, compiler 불필요 |
| 설정 UI | 좁은 sidebar에 혼재 | sidebar 유지한 넓은 별도 workspace |
| Stage 5 화면 근거 | 해당 없음 | paired Library/Settings 12개 + unsaved dialog 2개 |
| 최종 자동 검증 | 단계마다 증가 | 리뷰 대응 후 Vitest 163파일/1181개, Electron 63개 |

1024px 비교의 높이는 초기 768px와 현재 최소 720px로 다르다. 같은 폭의 가로 넘침 비교이며
세로 총 길이 감소나 모든 화면의 접근성 점수 향상을 추정하지 않는다.

## 수용 기준 검증 결과

| 수용 기준 | 결과·근거 |
|---|---|
| 연속된 native chrome/패널 | OK — 구현·scoped 이미지·window/security 테스트. OS 손동작은 아래 별도 |
| light/dark/system 저장 및 native 동기화 | OK — 실제 UI·재시작·main nativeTheme 이벤트와 preference 유지 |
| 실제 OS Settings 전환 추종 | OK — 사용자 “세 항목 정상 확인”. nativeTheme 주입·desktop tool 실패와 별도 근거 |
| 기본·최소·확대 3패널 | OK — 양 테마 3크기 측정, shell overflow 없음, 주요 본문/행 가시성 |
| 찾기·직접 복사·편집·새 버전·current | OK — 실제 clipboard 공백과 반복 Cmd+S 무중복, 원본 버전 보존 |
| 편집 snapshot 독립 복제 | OK — 필수 제목·독립 ID·lineage/tags·원본 불변·추가 편집 보존 |
| compiler 옵션·명시 적용·required sections | OK — 기존 전체 회귀·적용은 무저장·binding/export guard 유지 |
| Settings/관리자 단순 진입 | OK — 기존 맥락·mounted 입력 유지, 자동 쓰기/스캔/LLM 없음 |
| Save/Discard/Cancel·실패 보호 | OK — 세 선택 전환·native close·잠금·추가 편집·부가 실패 경계 |
| quit 취소 뒤 DB·창·초안 유지 및 activate | OK — 실제 Electron API 경로. 물리적 Cmd+Q/Dock 검증과 구분 |
| 타이틀바 드래그·본문 선택·traffic lights·dirty Cmd+Q 취소 | OK — 격리 앱에서 사용자 “세 항목 정상 확인”. 자동 capture로 확대하지 않음 |
| 시크릿·Insights/Privacy·백업/maintenance | OK — 전체 계약·서비스·Electron 회귀, 정책 완화 없음 |
| packaging/signing/새 릴리스 게시 | 이번 범위 아님 — 기존 v0.1.1 안내 유지, 실행/게시하지 않음 |

### 단계별 근거

1. [Stage 1](../working/task_m012_31_stage1.md): 사용자 결정·양 테마 핵심 시안·계약·mandatory editorial.
2. [Stage 2](../working/task_m012_31_stage2.md): native 창·appearance, 1104 Vitest/49 Electron, 사용자 drag 확인.
3. [Stage 3](../working/task_m012_31_stage3.md): 별도 workspace·상태 보존·추가 옵션, 1110/52, 8화면.
4. [Stage 4](../working/task_m012_31_stage4.md): 직접 편집·저장·복제·전환/닫기, 1167/61.
5. [Stage 5](../working/task_m012_31_stage5.md): 최종 재실행·프로젝트 이름 수정·14화면·재시작/quit/activate,
   desktop 차단 이력과 후속 사용자 OS 수동 확인을 구분하여 Stage 5 완료.

## 잔여 위험과 후속 확인

- desktop capture는 실패했다. 해당 OS 테마 전환·titlebar/input hit-test·traffic lights·Cmd+Q는
  후속 사용자 수동 확인으로 검증했다. 사용자 확인용 소유 앱·monitor·임시 DB는 정리했다.
- 최초 표시 모든 프레임의 무flash, 전체 접근성 인증, OS 강제 종료·crash·강제 reload의 초안 복구는 보장하지 않는다.
- native 컴파일 경고·Vite bundle 크기 경고·Biome deprecated 정보는 기존 상태로 남아 있다.
- Stage 3의 하네스 공백 입력 1회 이상 동작 원인은 당시 미확정으로 기록하고 이후 회귀 통과와 구분한다.
- 새 제품 기능·자동 유지보수·무관한 운영 이슈를 추가하지 않는다. 후속은 PR 검토와 별도 merge 승인이다.

## 작업지시자 승인과 게시 경계

- 같은 스레드의 “최종 보고 승인”으로 보고서 승인을 받았다. 사용자 OS 확인과 남은 인증 한계를 유지한다.
- 이후 같은 스레드에서 “커밋·push·PR 게시 승인”을 받아 커밋 및 Open PR 게시를 진행한다.
- 소급 단계 snapshot을 만들지 않고 검증된 최종 코드와 Stage 1–5 보고를 통합 커밋한다. 단계별 검증 이력은 각 보고서에 유지한다.
- 사용자 BMAD 설치·로컬 workspace·memlog·PID/임시 경로·runtime JSON·build 산출물은 게시에서 제외한다. 로컬 근거와 공개 보고를 구분한다.
- merge·Issue close·배포 승인은 포함하지 않는다.
- 통합 커밋 `658374e`를 원격 `publish/task31`로 push하고 `master` 대상 Open PR #32를 생성했다. 게시 직후 원격 Check 목록은 비어 있어 CI 통과를 주장하지 않는다.

## PR #32 Codex 리뷰 대응

작업지시자의 “codex 리뷰 대응 수정 진행해”에 따라 다음 두 P2를 수정했다.
Stage 1–5의 과거 검증 수치는 유지하며 아래 결과가 최신 코드 검증이다.

- [저장과 재시도 분리](https://github.com/jinzer0/Prompter/pull/32#discussion_r4191570773):
  과거 저장의 갱신 실패가 새 저장을 대체하지 않도록 committed refresh를 독립 큐로 관리한다.
  각 항목은 당시 asset/tag snapshot을 유지하고, 성공한 항목만 제거한다.
  전용 재시도는 큐의 후속 작업만 실행하며 새 버전을 쓰지 않는다. binding·동시 제출 차단은 유지한다.
  실제 Electron에서 갱신 두 번 실패 뒤 같은 asset의 새 출력/다른 asset 저장을 각각 수행하고,
  두 저장이 실제 DB에 반영되며 재시도 두 건이 버전 수를 늘리지 않는지 검증했다.
- [잘못된 저장 기본값의 시작 장애](https://github.com/jinzer0/Prompter/pull/32#discussion_r4191570776):
  repository에서 기존 6개 필드 schema로 각각 검증하고 잘못된 필드만 기존 기본값으로 읽는다.
  유효한 다른 값과 raw row는 유지하며 조회가 DB를 수정하지 않는다. 실제 DB 읽기 실패는 숨기지 않는다.
  새 public default 쓰기는 기존 schema로 엄격 검증하여 재발을 막는다. nullable 프로젝트의 빈 문자열 표현과
  설정 transaction·secret/app-lock 보호는 유지한다. migration·새 저장소·catch-all 시작 우회는 추가하지 않았다.
- 변경: `use-compiler-persistence-actions.ts`, `settings.ts`, 기존 appearance/editor Electron 테스트,
  이 보고서와 오늘할일. 기존 테스트의 데이터 파손 rollback은 실제 읽기 실패 주입으로 의미를 보존했다.
- 검증: `npm test` **163파일/1181개**, `npm run test:smoke` **63개** 통과.
  `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check` 통과.
  기존 native/Vite/Biome 경고는 유지했다. 새 OS 손동작/원격 CI 인증을 주장하지 않는다.
