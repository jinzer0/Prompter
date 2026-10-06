# Task #31 Stage 1 — UX 계약·시안 결과와 검증 한계

GitHub Issue: [#31](https://github.com/jinzer0/Prompter/issues/31)
구현계획서: [task_m012_31_impl.md](../plans/task_m012_31_impl.md)
Stage: 1
상태: UX 계약·시안 확정, 결과 승인 대기. 실제 OS 드래그 검증은 미완료이며 전체 검증 통과를 뜻하지 않는다.

## 단계 목적

실제 앱의 네이티브 UX 문제를 재현하고 합의된 사용자 흐름에 맞는 시각·행동 계약과 핵심 시안을 확정한다.

## 산출물

UX 작업 공간: `_bmad-output/initiative-prompter-ux-refactor/ux-native-desktop/`.

| 파일 | 변경 요약 |
|---|---|
| `.memlog.md` | 사용자 합의·Stage 1 승인·실제 측정·오류 정정·오른쪽 패널 A안 선택 기록 |
| 저장소 루트 `DESIGN.md`, `docs/ux/EXPERIENCE.md` | 공식 시각·행동 계약으로 승격, status: final. 제품 구현 완료를 뜻하지 않음 |
| `docs/ux/mockups/key-library.html`, `key-settings.html`, `key-unsaved.html` | 사용자가 방향을 확인한 세 시안의 공식 참조 경로 |
| `ux-native-desktop.md` | 공식 계약 경로 참조. 작업 공간에 중복 최종 계약을 남기지 않음 |
| `.working/current-observations.json` | 실제 Electron 창의 레이아웃·테마·선택 후 화면 관찰 |
| `.working/current-initial.png`, `current-1280.png`, `current-settings.png`, `current-selected.png` | renderer 화면 캡처. native 창 프레임 검증을 대체하지 않음 |
| `.working/key-library.html`, `key-settings.html`, `key-unsaved.html` | A안의 라이트·다크 정적 검토 시안 |
| `.working/review-library.png`, `review-settings.png`, `review-unsaved.png`, `mock-verification.json` | Chromium 시각 검토 캡처 및 frame·외부 자산 검사 |
| `.working/palette-contrast.json`, `review-checklist.md` | 기존 팔레트 대비 수치와 시안 검토 기준 |
| `.working/minimum-frame-check.json`, `contract-verification.json` | 최소 크기 mock 실험 및 최종 계약의 YAML·토큰·링크 기본 검사 |
| `reconcile-scratch.md`, `editorial-review.md` | 사용자 참고 입력 대조와 구조→문장 편집 점검 결과 |
| `README.md`, `AGENTS.md` | 공식 UX 계약 링크 및 승인된 목표 규칙 반영. 현재 배포 기능과 구분 |
| 수행·구현계획서 및 오늘할일 | 승인 경계와 Stage 1 진행 상태 기록 |

## 본문 변경 정도 / 본문 무손실 여부

제품 소스는 변경하지 않았다. 루트 DESIGN.md는 기존 시각 기준을 canonical 토큰·섹션 구조로 정리했다. 기존 컴포넌트·보안·접근성 의미를 보존하며 사용자 승인된 양 테마·창 크기·3패널 A안에 맞춰 상충한 dark-only·가로 스크롤 규칙을 교체했다. 새 행동 계약은 직접 저장·복제·컴파일 적용·미저장 보호와 기존 기능 진입 경로를 명시한다.

사용자 설치와 기존 작업은 보존했다. 탐색용 task31 `node_modules` 임시 링크와 주 checkout의 이번 작업 전용 handoff 사본은 정리했다. 생성된 build/runtime 산출물은 제품 PR에 포함하지 않는다. native 모듈 rebuild는 수행하지 않았다.

## 검증 결과

실행 명령:

```bash
npm run build:electron
./node_modules/.bin/vite build
```

결과:

- Electron bundle과 renderer build 성공. Vite의 minified 500kB 초과 chunk 경고는 남아 있다. 전체 build/typecheck/test gate를 실행한 것은 아니다.
- Playwright Electron launcher로 `NODE_ENV=test`와 새 `PROMPTER_USER_DATA_DIR`를 지정해 앱을 실행했다. 실제 사용자 DB·키를 사용하지 않았다.
- preload ping=pong 확인, 창 크기 변경, Settings 메뉴 진입, Light 선택/저장, 테스트 프로젝트·프롬프트 생성/선택을 수행했다. LLM·유지보수·백업 실행은 하지 않았다.
- 초기 viewport 1024x768에서 shell scrollWidth=1088px: 가로 넘침 64px 재현.
- 같은 상태의 사이드바 clientHeight=718px, scrollHeight=7432px. 좁은 탐색 영역에 설정·관리 작업이 집중된다.
- 초기 컴파일러 clientHeight=718px, scrollHeight=3371px. 프롬프트 선택 후에도 상단에는 컴파일 입력이 남고 저장된 내용은 하단에 있다.
- 1280x800에서는 shell scrollWidth=1280px로 전체 가로 넘침이 없다. 좁은 초기 창과 넓은 창을 구분한다.
- Light 선택 후 임시 DB의 settings에서 app_theme=light를 read-only로 확인했다. 화면 computed color-scheme은 dark, shell 배경은 rgb(8,9,10)이었다.
- 초기 조사 정정: 시스템/라이트/다크 선택 UI와 저장 경로는 이미 존재한다. 신규 옵션 추가가 아니라 기존 설정과 실제 시각 반영 연결을 수정해야 한다.
- CSS drag 영역 수는 0개였다. 이는 native 창 이동 원인 확정 근거가 아니다.
- 별도 native 창 실행 후 실제 desktop screenshot으로 macOS 창 버튼이 표시됨을 관찰했다. 전체 desktop screenshot은 다른 앱이 포함되어 제품 작업 공간에 복사하지 않았다.
- desktop drag 도구 호출은 입력 스키마 검증에서 실패해 실제 입력이 전달되지 않았다. 이후 전경 앱 변경을 확인해 추가 desktop 조작을 하지 않았다. 실제 OS 드래그 검증은 미완료다.
- 세 검토 HTML을 Chromium에서 관찰한 후 캡처·시각 검토했다. 1440px viewport에서 각 화면의 1180px 제안 frame은 가로 넘침이 없으며 각각 light/dark 2개 frame이 있다. script 및 외부 asset은 0개다. 실제 앱의 최소 크기나 기능 검증은 아니다.
- 기존 팔레트의 일부 작은 텍스트 조합은 대비 4.5:1에 미달한다. 정량 결과를 palette-contrast.json에 기록했으며 전체 접근성 통과를 주장하지 않는다.
- 미저장 목업의 대상은 다른 프롬프트 선택으로 제한했다. Settings 진입에 새 확인 정책을 추가하는 것으로 해석하지 않는다.
- `open` 명령으로 세 HTML을 기본 브라우저에 열었고 사용자는 이 시안 방향으로 계약을 정리하도록 확인했다.
- 최소1024×720 mock CSS 실험에서 세 열 188/280/554px, shell 가로 넘침 없음, 오른쪽 영역은 내부 세로 스크롤이 필요했다(668px 가용 높이, 685px 내용). 실제 Electron 최소 창 검증과는 구분한다.
- Ruby/Psych 기본 검사 통과: 두 계약의 final 상태·YAML 필수 그룹, 26개 light/dark 색상 값 짝, 64개 토큰 참조 해석, 17개 컴포넌트 이름 일치, canonical 섹션, 19개 로컬 링크와 sources 경로 확인.
- bmad-ux의 필수 문서 편집 절차를 structure→prose 순서로 수행했다. 구조 지적 2건·표현 지적 3건을 반영하고 기록했다. 사용자가 생략한 추가 UX·행동·접근성 reviewer 검증은 실행하지 않았다.
- `git diff --check` 통과. 제품 코드 변경이 없어 전체 제품 test/typecheck/lint gate를 추가 실행하지 않았다.

## 확정된 시안 구성

사용자는 오른쪽 패널 A안을 선택했다. 선택한 프롬프트 내용·복사·새 버전 저장을 상단 우선으로 두고 컴파일러는 아래 보조 영역에 둔다. 필수 3패널은 유지하며 복제 저장은 별도 동작이다.

추가 확정 사항:

- 기본 창1180×760·최소1024×720, 3패널을 숨기지 않고 지원.
- 복사는 현재 편집 내용이며 저장과 분리.
- 컴파일 결과는 확인 후 명시적으로 편집에 적용. dirty 내용 교체는 확인, 적용 후 자동 저장 없음.
- 복제 저장 성공 후 새 복제본을 선택해 편집. 원본은 불변이며 저장 중 후속 변경을 조용히 버리지 않음.
- 현재 세 시안으로 충분하며 나머지 결과 적용·관리 화면은 계약 표로 구현(spine-only).

세부 열 너비·타이포그래피·컨트롤 수치는 기존 규칙과 최종 계약에 따른 구현 시작점이다. 창 제어는 목업에서 중립색 원으로만 표현했고 실제 제품은 macOS 창 버튼을 사용한다.

## 잔여 위험

- native 드래그·OS 창 프레임은 renderer 자동화로 검증되지 않았다.
- 최소 창·테마·저장·복제·미저장 보호는 설계 계약이며 실제 기능은 구현 단계에서 검증해야 한다.
- 전체 접근성·키보드/OS 동작 검증은 미실행이다. 정적 시안과 기본 문서 검사를 제품 QA로 대체하지 않는다.
- 소스 guard·접근성·compiled sections를 바꾸는 제품 구현은 아직 승인되지 않았다.

## 다음 단계 영향

Stage 2에서는 기존 App theme 설정/저장 계약을 재사용하고 시각 적용을 연결한다. 기본 직접 편집 흐름이 컴파일 결과 생성에 종속되지 않도록 기존 persistence 경계를 검토해야 한다.

## 승인 요청

UX 계약·시안 산출물과 위 검증 한계를 검토한다. 미완료 OS 드래그 검증을 창 구현 단계에서 재현·검증할 항목으로 넘기는 것에 대한 승인과 Stage 2 진입 승인을 별도로 요청한다. 승인 전 제품 코드 수정·커밋·PR은 진행하지 않는다.
