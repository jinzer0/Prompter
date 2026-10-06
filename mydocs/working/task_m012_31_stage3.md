# M012 Task #31 Stage 3 — 작업 공간과 설정 정리

GitHub Issue: [#31](https://github.com/jinzer0/Prompter/issues/31)
구현계획서: [task_m012_31_impl.md](../plans/task_m012_31_impl.md)
Stage: 3
상태: 구현·검증 완료. 단계 보고 및 Stage 4 진입 승인 대기

## 단계 목적

사용자가 Stage 2 보고 후 같은 스레드에서 “승인”한 범위다. 사이드바를 탐색 중심으로 바꾸고 별도 Settings·관리 화면을 제공한다. Library의 3열과 선택 상태를 유지하며 저장된 상세를 컴파일러보다 먼저 배치한다. 직접 편집·새 저장 정책·미저장 보호는 구현하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `renderer/src/components/shell/app-shell.tsx`, `panel.tsx`, `project-sidebar-section.tsx` | 연속된 주 패널, 탐색·프로젝트 목록·하단 설정, 기존 관리 컴포넌트의 별도 목적지. 퇴역 ping 표시·로드 effect 제거 |
| `renderer/src/components/shell/sidebar-section.tsx` | 소비자가 사라진 정적 Tags/Harnesses 자리표시자 모듈 삭제. 실제 관리자와 SidebarItem은 유지 |
| `renderer/src/components/settings-workspace.tsx` | 기존 SettingsPanel을 넓은 작업 공간에 유지하고 Library 복귀·Privacy Center 진입 제공 |
| `renderer/src/components/settings-panel.tsx`, `settings-defaults-form.tsx`, `openai-key-card.tsx` | 설정 항목 분리, 보이는 라벨과 실제 제어의 연결, 좌우 설정 행, 저장/오류/시크릿 상태 보존 |
| `renderer/src/hooks/use-insights-workspace-navigation.ts`, `lib/menu-actions.ts`, `lib/privacy-navigation.ts` | Settings 및 context/templates/harnesses 목적지, 메뉴·Cmd+,·검색 재진입, finding·가져온 프로젝트의 실제 목적지 연결 |
| `renderer/src/components/prompt-compiler-{panel,form,header,output-workspace,privacy-scan}.tsx` | 기존 저장 상세를 위에 두고 핵심 요청·프로젝트 바인딩 아래에 접을 수 있는 추가 옵션. 값·DOM·출력 유지 |
| `renderer/src/components/prompt-library-{panel,filters}.tsx`, `prompt-version-detail.tsx` | 읽을 수 있는 검색 필터 폭, 목록을 태그 입력보다 먼저 배치, 저장 본문·메타데이터의 사용자 라벨 |
| `renderer/src/components/prompt-export-actions.tsx`, `prompt-compiler-output-panel.tsx` | 저장된 버전과 컴파일러 export의 메뉴 target 소유권을 명시하여 native 메뉴 오동작 방지 |
| 잠금 화면·잠금 설정의 보안 안내 | SQLite 구현 명칭을 local database로 정리. 데이터 미암호화·OS 접근·화면 캡처 한계는 유지 |
| `tests/native-workspace-ui.test.ts`, `playwright.config.ts` | 실제 Electron 신규 3시나리오 수집. 화면 전환·부작용 금지·초안/검색/선택 보존·옵션·라벨·최소 창 검증 |
| 기존 메뉴·renderer guardrails·CRUD·설정·검색·버전·관리자·Insights·Privacy·잠금 테스트 | 실제 목적지와 접힘 제어 사용, 보안/읽기 전용 보장 유지, 옛 scaffold·overflow 기대 제거 |
| UX 작업 공간 `.working/stage3-runtime-results.json`, `stage3-{library,settings}-{light,dark}-{1180,1024}.png` | 격리된 실제 Electron 수치와 최종 8화면 근거 |

단계 보고 위치는 승인 계획의 `mydocs/working/`다. 제품 계약 `DESIGN.md`와 `docs/ux/EXPERIENCE.md`, 검토 시안은 변경하지 않았다. README의 Settings 안내와 계약 링크는 여전히 유효하여 추가 수정하지 않았다. 종합 QA 문서·최종 사용자 안내 정리는 승인 계획의 Stage 5에서 수행하며 이번 변경을 전체 출시 완료로 소개하지 않는다.

## 본문 변경 정도 / 본문 무손실 여부

제품 코드 작업이다. 원본 checkout과 기존 Stage 1/2 변경을 보존했다. Electron·React·DB schema·IPC·secret·잠금 경계·native appearance는 교체하지 않았다.

- `settings`, `context`, `templates`, `harnesses`는 renderer 내부 작업 공간 상태다. 새 URL router나 IPC 채널은 만들지 않았다.
- Settings와 기존 Library·관리자는 숨겨도 상태를 유지한다. 전환만으로 초안 저장 확인·데이터 쓰기·검사·LLM 호출·백업 작업을 시작하지 않는다.
- renderer의 native 메뉴 연동은 작업 공간을 DOM에 반영한 뒤 기존 target을 조작한다. 외부 메뉴 이벤트에서 `flushSync`로 전환을 먼저 완료하여 숨겨진 제어로의 focus 시도를 막는다.
- `PromptExportActions`의 `menuActionTarget`은 필수다. 컴파일러만 `save-compiled-export`를 소유하고 저장 버전은 `null`이다. 상세 배치를 위로 옮겨도 native export가 프로젝트 바인딩 guard를 우회하지 않는다.
- 추가 옵션은 native `<details>`로 접는다. 자식을 unmount하거나 값을 초기화하지 않는다. 컨텍스트·템플릿·하네스 관리 버튼도 실제 기존 관리자로 연결한다.
- 컴파일러 save guard·중복 저장/복제 의미·닫기 처리는 기존 동작이다. Stage 4 기능을 우회 구현하지 않았다.

## 검증 결과

실행 명령:

```bash
npm run lint
npm run typecheck
npm test
npm run build
./node_modules/.bin/playwright test
./node_modules/.bin/playwright test tests/phase12-harness-template-ui.test.ts --grep 'blocks blank templateBody' --repeat-each=5
git diff --check
```

- 최종 전체 Vitest: **160파일, 1110테스트 통과**.
- 최종 전체 Electron: **52테스트 통과**. 신규 workspace 3시나리오는 Playwright 명시 목록에 등록했으며 Vitest 테스트로 오인하거나 0개 수집을 성공 처리하지 않았다.
- 최종 lint·typecheck·build·diff-check: 통과. native rebuild는 기존 npm test/build 스크립트를 사용했다.
- 초기 Electron 실패는 그대로 기록하고 해결했다. 메뉴 focus의 React commit 순서와 공유 export target 중복은 제품 소스에서 수정했다. 새 접힘 UI는 실제 summary 조작으로 테스트했고, 퇴역한 sidebar overflow 기대·모호한 빈 상태 selector는 새 계약에 맞춰 수정했다.
- 옵션 보존 테스트는 포함 프로필 변경이 기존 템플릿 선택을 해제하는 정상 동작과 접힘 자체를 구분하도록 준비 순서를 고쳤다. 템플릿 선택이 준비된 상태임을 먼저 확인하고 접기/펼치기 전후 값을 검증한다.
- 하네스 공백 검증은 한 전체 실행에서 실패했다. 그 실행의 실패 화면에는 공백 대신 `k`가 저장되어 있었으며 입력 변경 원인은 확정하지 않았다. 동일 assertion을 유지한 독립 5회 및 이후 전체 실행은 통과했다. 재시도 설정·테스트 삭제·예외 억제로 통과시키지 않았다.
- 기존 Vite 500kB 초과 bundle 경고, native 의존성 컴파일 경고, Biome 설정 deprecated 정보는 남아 있다. 이번 단계에서 의존성·설정을 임의 변경하지 않았다.

### 실제 화면·행동 근거

Library와 Settings를 light/dark, 1180×760/1024×720의 조합으로 실행하여 8화면을 기록했다. 사용자 DB·실제 API 키·LLM을 사용하지 않았으며 임시 앱과 DB는 정리했다. OS의 테마 설정은 변경하지 않았다.

| 검증 | 결과 |
|---|---|
| Library 3열 | 두 크기·양 테마에서 표시, shell과 각 패널의 가로 넘침 없음 |
| 최소 창 검색·필터 | 198px 폭의 세 제어가 수직으로 배치되어 선택값을 읽을 수 있음 |
| 선택한 프롬프트 행 | 기본/최소 창에서 전체 행이 viewport 안에 표시됨 |
| Settings 진입·복귀 | 사이드바·native 메뉴·Cmd+,가 같은 화면으로 연결, 검색·선택·원래 request DOM·설정 미저장 입력 보존 |
| Settings의 native Search 메뉴 | Library를 다시 표시하고 검색 제어에 focus, 입력·초안 유지 |
| Settings 공개 라벨 | Default model의 실제 input ID와 label 연결 확인. 영어 accessible name과 보이는 이름을 일치시킴 |
| 양 테마 설정 저장 | 실제 Settings 제어를 선택·저장하고 선택값·저장된 선호도·유효 테마를 일치시킴 |
| 관리자·Privacy 목적지 | 별도 관리 화면·기존 manager selectionRequest·Library 복귀·컴파일러 초안 보존 |
| 추가 옵션 | 텍스트·선택·변수·포함 checkbox 값과 DOM identity가 접기/펼치기 뒤 유지됨 |
| Settings·관리 화면 단순 진입 | 기록한 분석/컴파일/검사/백업/설정·키 쓰기 IPC 호출이 없음 |
| 프로젝트 변경·컴파일러 export | 미바인딩 상태의 저장/내보내기 차단과 명시적 재바인딩 후 동작 유지 |

로컬 근거(게시 제외): UX workspace의 `.working/stage3-runtime-results.json`. 같은 폴더의 8개 PNG는 최종 코드 화면이다. renderer 캡처와 자동 UI 동작을 새로운 OS hit-test·창 드래그 수동 통과로 확대 해석하지 않는다. Stage 2의 사용자 드래그 확인은 해당 보고서의 근거 그대로 유지한다.

## 잔여 위험

- 공백 하네스 입력이 `k`로 바뀌었던 1회 실행의 원인은 미확정이다. 실패 사실과 독립/전체 재확인을 구분하여 보존한다.
- 기존 Stage 2의 OS 설정 직접 전환·최초 표시 전체 프레임·native 창 버튼 전수 손동작 한계는 유지한다. 이번 단계는 새 수동 OS 인증이 아니다.
- 전체 접근성 인증·새 선택적 UX 리뷰·전체 UI 번역을 수행한 것은 아니다. 보이는 라벨·focus·keyboard 진입과 승인된 두 테마를 관련 범위에서 확인했다.
- 직접 편집, 기본 새 버전 저장, 독립 복제 선택, 미저장 선택/닫기 보호는 아직 기존 동작이므로 Task #31 전체 완료가 아니다.

## 다음 단계 영향

- Stage 4는 현재 저장 상세 위에 직접 편집 상태와 복사·새 버전·복제 행동을 연결한다. 기존 compiled-output guard를 단순 삭제하지 않는다.
- 저장 성공과 이후 태그/검색 refresh 실패를 분리하고, 이동/닫기는 실제 저장 결과를 사용한다.
- 작업 공간 전환·manager 목적지·단일 compiler export target·추가 옵션의 mounted 상태를 보존한다.
- `local/task31` 변경은 미커밋이다. 원본 `master`의 tracked 변경은 없으며 사용자 BMAD 설치·미추적 산출물을 보존했다.

## 승인 요청

- Stage 3 산출물과 검증 결과·한계를 검토하고 Stage 4의 직접 편집·안전한 저장 구현 진입을 명시적으로 승인한다.
- Stage 4/5, commit·push·PR은 아직 승인되지 않았으며 실행하지 않았다.
