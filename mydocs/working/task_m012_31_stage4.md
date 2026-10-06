# M012 Task #31 Stage 4 — 직접 편집·안전한 저장·미저장 보호

GitHub Issue: [#31](https://github.com/jinzer0/Prompter/issues/31)
구현계획서: [task_m012_31_impl.md](../plans/task_m012_31_impl.md)
Stage: 4
상태: 구현·검증 완료. 단계 보고 및 Stage 5 진입 승인 대기

## 승인과 범위

작업지시자가 Stage 3 보고 후 같은 스레드에서 “승인”한 Stage 4 범위다.
`local/task31` 전용 worktree에서 작업했으며 기존 Stage 1–3 변경과 원본 checkout을 보존했다.
Stage 5, commit·push·PR은 승인하지 않은 것으로 유지한다.

선택한 본문을 컴파일 없이 편집·복사하고 기본 저장/Cmd+S로 새 current 버전을 만든다.
편집 스냅샷의 독립 복제, 컴파일 결과의 명시적 적용, 선택 전환·native 닫기 보호를 연결했다.
Electron·React·DB 스키마·시크릿 정책·Insights 읽기 전용 정책은 교체하지 않았다.

## 변경 파일과 책임

| 파일 | 변경 요약 |
|---|---|
| `renderer/src/lib/prompt-editor.ts`, `hooks/use-prompt-editor.ts` | 외부 편집 store, 본문·메타데이터 기준값, 실제 저장 결과, 동시 제출 차단, 저장 중 추가 편집 보존, 갱신만 재시도 |
| `components/prompt-editor.tsx` | 직접 편집 본문, 정확한 복사, 새 버전·복제·태그 편집 진입, dirty/저장/갱신 오류 표시 |
| `components/prompt-editor-provider.tsx`, `hooks/use-unsaved-changes-guard.ts`, `app.tsx` | 잠금으로 AppShell이 내려가도 편집 상태·닫기 subscriber 유지, 단일 확인 intent, native dialog와 Cancel 초기 focus·Escape·focus 복귀 |
| `components/shell/app-shell.tsx`, `hooks/use-insights-workspace-navigation.ts` | 프로젝트·프롬프트·이력·finding·생성 전환 보호, 정확한 navigation 완료 후 source 연결, 단순 Settings/관리 화면 진입은 편집 유지 |
| `hooks/use-projects.ts`, `use-project-prompts.ts`, `use-prompt-version-loader.ts` | 잠금 후 선택 복원, atomic 결과를 로컬 목록에 먼저 반영, 읽기 실패에도 알려진 버전 유지, 저장 실패와 목록 갱신 실패 구분 |
| `components/prompt-compiler-panel.tsx`, `prompt-compiler-panel-types.ts`, `prompt-compiler-detail-section.tsx`, `prompt-version-management.tsx`, `prompt-version-detail.tsx` | 직접 편집 우선, 컴파일 결과의 명시적 적용, 저장된 본문의 별도 조회, 퇴역한 저장본 복제 UI 제거 |
| `hooks/use-compiler-persistence-actions.ts`, `use-prompt-compiler-panel.ts`, `lib/menu-actions.ts` | 기본 메뉴·Cmd+S를 편집 저장에 연결, 기존 compiler binding guard 유지, compiler 버전 저장 뒤 부가 실패 재시도에서 버전 재작성 금지 |
| `electron/ipc-contract.ts`, `ipc-types.ts`, `bridge.ts`, `preload.ts` | 본문·원래 요청·clipboard whitespace 보존, 편집 복제 계약, 검증된 close 요청/state/confirm bridge와 초기 요청 buffering |
| `electron/db/services.ts` | 기존 atomic 복제 transaction에서 편집 스냅샷·제목 사용, 실제 source 소유권·lineage·tags 유지, 원본 불변·복제 qualityScore 초기화 |
| `electron/window-close-guard.ts`, `window-close-ipc.ts`, `main.ts` | main-owned nonce·sender/mainFrame·문서 generation·잠금 revision·한 번의 close permit, quit 조율, 서비스 정리를 will-quit으로 이동 |
| `tests/prompt-editor-actions.test.ts`, `unsaved-changes-guard.test.ts`, `window-close-guard.test.ts` | 저장 결과·오류·동시성·추가 편집·부가 실패·잠금·nonce·취소·종료 경계 단위 검증 |
| `tests/prompt-editor-electron-ui.test.ts` | 격리된 실제 Electron 9시나리오: 직접 copy/Cmd+S, 적용, 복제, 세 전환, 실패 재시도, native close, 잠금 복원 |
| `tests/electron-contract-derivation-schema.test.ts`, `phase15-prompt-derivation-persistence.test.ts` | 편집 복제 계약·실제 transaction·원본 보존 검증 |
| `tests/electron-prompt-version-ui.test.ts`, `electron-ui-db.test.ts`, `native-workspace-ui.test.ts`, `phase15-prompt-template-lineage-ui.test.ts` | editable 본문을 값으로 검증하고 실제 복제 확인 경로 사용, 비교·lineage 검증 유지 |
| `vitest.config.ts`, `playwright.config.ts` | 신규 테스트를 명시 수집 목록에 등록 |

보고서 위치는 승인된 `mydocs/working/`다. 제품 계약 `DESIGN.md`와
`docs/ux/EXPERIENCE.md`는 이미 이번 동작을 규정하여 변경하지 않았다.
README·QA의 최종 안내 정합화는 승인 계획의 Stage 5 범위이며 이번 단계에서 변경하지 않았다.

## 저장·닫기 보장

- copy와 기본 저장은 현재 본문을 그대로 사용한다. nonblank 검증은 유지하되 IPC trim으로
  앞뒤 공백·탭·개행을 잃지 않는다. 컴파일은 선행 조건이 아니다.
- 새 버전 저장은 기존 asset에 버전을 추가하고 current를 갱신한다. 저장 중 추가 입력은
  저장 스냅샷으로 덮어쓰지 않고 다음 dirty 상태로 남는다. unchanged 저장은 버전을 만들지 않는다.
- 복제는 필수 제목과 현재 편집 내용으로 독립 asset을 만들고 원본을 수정하지 않는다.
  추가 편집이 없으면 복제본을 선택하며, 저장 중 추가 편집이 생기면 원래 초안을 유지한다.
- 컴파일 결과는 명시적 적용으로만 본문을 바꾼다. dirty 교체는 확인하며 적용 자체는 저장하지 않는다.
  기존 required sections 생성 검증·프로젝트 바인딩·export 소유권은 유지한다.
- DB commit 뒤 목록·검색·태그 갱신 실패는 저장 실패로 취급하지 않는다.
  편집 store의 명시적 `saved` 결과와 경고를 사용하며 갱신 재시도는 버전을 다시 쓰지 않는다.
- 선택/닫기의 Save·Discard·Cancel은 하나의 pending intent를 사용한다. Cancel/Escape는 초안을 유지한다.
  실패·추가 편집·잠금·stale 요청은 이동이나 닫기를 승인하지 않는다.
- native close는 main이 현재 창·mainFrame·nonce·문서 generation·잠금 revision을 검증한다.
  저장 문자열만으로 닫지 않으며 현재 dirty report와 권한을 재확인한다. 강제 destroy fallback은 없다.
- 잠긴 dirty 창의 닫기 확인에서는 저장·버리기가 비활성화되고 본문을 표시하지 않는다.
  취소·잠금 해제 뒤 동일 초안으로 돌아간다.

## 검증 결과

최종 실행:

```bash
npm test
npm run typecheck
npm run lint
npm run build
./node_modules/.bin/playwright test
git diff --check
```

- 전체 Vitest: **163파일, 1167테스트 통과**.
- 전체 Electron/Playwright: **61테스트 통과**. 신규 직접 편집 시나리오 9개 포함.
- typecheck·lint·build·diff-check: 통과. Node/Electron ABI는 기존 native 스크립트로 준비했다.
- 실제 Electron에서 정확한 clipboard whitespace, Cmd+S 1회 저장·unchanged 반복 방지,
  태그 입력 focus, 복제 원본 보존, 적용 후 무저장, 세 전환의 Save/Discard/Cancel·Escape,
  IPC 저장 실패 후 초안/선택 보존·재시도, BrowserWindow.close 취소·저장 후 닫기 및
  같은 임시 DB 재시작 후 저장 본문을 확인했다.
- 잠금 UI를 실제로 활성화하고 dirty 창의 native close 저장/버리기 차단·취소,
  잠금 해제 후 초안·선택·DB 무변경 및 이후 저장을 확인했다.
- 기존 테마·최소 폭·Settings/관리자·Insights/Privacy·컴파일 binding·잠금 회귀를 함께 실행했다.
- 초기 실패는 숨기지 않고 수정했다. clipboard 계약의 trim으로 공백이 손실되던 제품 문제와
  renderer Cmd+S 미연결을 고쳤다. 기존 읽기 전용 text locator는 editable 값/비교 panel로
  범위를 명확히 했고 저장된 버전 복제 테스트는 새 명시 확인 UI로 갱신했다.
- 격리 fixture 종료 직후 임시 디렉터리 삭제의 ENOTEMPTY를 관찰하여 소유한 경로의
  filesystem 삭제에만 짧은 bounded retry를 적용했다. 테스트 assertion·제품 오류는 재시도/억제하지 않았다.
- 기존 native 컴파일 경고, Vite 500kB 초과 bundle 경고, Biome deprecated 설정 정보는 남아 있다.

## 한계와 다음 단계 승인 경계

- native 닫기 근거는 실제 Electron `BrowserWindow.close()` 경로다. 이번 단계에서 사람이
  빨간 창 버튼·Cmd+Q·OS 종료를 전수 손동작 검증한 것은 아니다. quit 조율은 단위 테스트 근거다.
- 강제 OS 종료·process kill·crash·강제 renderer reload의 초안 복구를 보장하지 않는다.
  reload/navigation은 기존 닫기 승인 nonce를 무효화하며 자동 discard timeout을 사용하지 않는다.
- 양 테마의 새 dialog에 대한 별도 수동 시각/전체 접근성 인증은 수행하지 않았다.
  자동 focus·Escape·복귀 및 기존 양 테마/최소 폭 회귀와 구분한다.
- Stage 2/3의 OS 테마 직접 조작·최초 표시 프레임·native control 전수 검증 한계는 그대로 유지한다.
- `local/task31` 변경은 미커밋이고 원본 `master` tracked 변경은 없다.
  commit·push·PR·merge·Issue close를 실행하지 않았다.
- **Stage 5 통합 QA·안내 정합화·최종 보고 진입 승인을 요청한다.** Task #31 전체 완료나
  Stage 5/게시 승인을 이번 결과로 간주하지 않는다.
