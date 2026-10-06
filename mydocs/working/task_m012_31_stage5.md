# M012 Task #31 Stage 5 — 통합 검증·안내 정합화

GitHub Issue: [#31](https://github.com/jinzer0/Prompter/issues/31)
구현계획서: [task_m012_31_impl.md](../plans/task_m012_31_impl.md)
상태: 자동 검증·안내 정합화·격리 runtime 및 사용자 OS 손동작 확인 완료. 최종 보고·Open PR 게시 승인 반영

## 승인과 변경 범위

같은 스레드의 “Stage 5 진입 승인”에 따라 진행했다. commit·push·PR·merge·Issue close는
승인 범위에 포함하지 않았다. 원본 checkout과 Stage 1–4의 미커밋 변경을 보존했다.

- `README.md`: 직접 찾기·편집·복사·새 버전·복제·미저장 보호를 기본 흐름으로 설명하고
  선택적 컴파일·명시적 적용·Settings/테마를 정리했다. 공개 v0.1.1과 현재 소스를 구분한다.
- `docs/qa-checklist.md`: Cmd+S 기준과 native/테마/직접 편집/닫기/잠금/수동 작업 공간 절차를
  실제 동작에 맞췄다. 실행 절차의 unchecked 항목을 검증 증거로 오인하지 않는다.
- `renderer/src/components/project-sidebar-section.tsx`: 실제 최종 화면에서 프로젝트명과
  에이전트 caption이 같은 줄을 경쟁하여 한글 이름이 과도하게 쪼개지는 문제를 확인했다.
  이름에 행 전체 폭을 주고 caption을 아래에 배치했다. 새 색상·패널·기능은 추가하지 않았다.
- `tests/native-workspace-ui.test.ts`: 기본/최소 폭에서 프로젝트 이름 폭과 caption의 수직 배치를
  검증한다. 최초 selector가 Library와 프로젝트 두 current 항목을 함께 잡은 실패를 기록하고
  실제 프로젝트 이름으로 범위를 수정했다. assertion은 유지했다.
- 계획·오늘할일·memlog에 승인과 근거를 기록했다. 단계 보고는 `mydocs/working/`,
  최종 보고 초안은 승인된 `mydocs/report/`에 둔다. 계약과 릴리스 절차는 복제하지 않았다.

## 자동 검증

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:smoke
./node_modules/.bin/playwright test
git diff --check
```

- 최종 Vitest: **163파일, 1167테스트 통과**.
- 최종 전체 Electron: **61테스트 통과**. `test:smoke`의 최초 신규 selector 실패 후 수정한
  같은 전체 Playwright 집합을 다시 실행해 61개 전부 확인했다.
- typecheck·lint·build·diff-check 통과. native Node/Electron 전환은 기존 스크립트를 사용했다.
- Settings·secret·backup·수동 maintenance·Insights/Privacy·잠금·compiler required sections 및
  프로젝트 binding을 기존 전체 회귀에 포함했다. 실제 API 키·실제 LLM 요청은 사용하지 않았다.
- 기존 native 컴파일 경고·Vite 500kB bundle 경고·Biome deprecated 설정 정보는 유지했다.
  테스트나 경고를 삭제·억제하여 성공으로 만들지 않았다.

## 실제 Electron runtime 근거

로컬 근거(게시 제외): UX workspace의 `.working/stage5-runtime-results.json`.
같은 `.working/`의 `stage5-{library,settings}-{light,dark}-{1180,1024,1440}.png` 12개와
`stage5-unsaved-{light,dark}-1024.png` 2개를 최종 코드로 기록했다.
대표 최소 Library·양 테마 dialog·Settings 화면을 읽어 확인했다.

| 시나리오 | 관찰 |
|---|---|
| 기본/최소/확대 창 | 1180×760, 1024×720, 1440×900. 양 테마 Library/Settings에서 shell clientWidth=scrollWidth |
| Library 세 열 | sidebar 210px, Library 280px, 상세 가변 폭 유지. Settings의 두 열 교체는 의도된 동작 |
| 프로젝트명 | 한글 이름이 행 폭을 사용하고 caption은 이름 아래. 측정 assertion과 최종 화면 확인 |
| 미저장 dialog | 양 테마 최소 창에서 512×159px, 창 내부 중앙. 초기 Cancel focus와 Escape 후 본문 보존 |
| 테마 저장/재시작 | 실제 UI 저장 뒤 같은 임시 DB 재시작. light/#F7F8F8, dark/#08090A renderer·native 일치 |
| system 반응 | Electron nativeTheme의 dark/light override 이벤트를 실제 전달하고 저장 선호도 system 유지 |
| quit 취소 | 실제 `app.quit()`에서 dirty 확인 후 Cancel. 창 1개·초안·projects 조회 유지, DB 조기 정리 없음 |
| macOS activate | clean 창을 닫은 뒤 실제 main activate handler를 호출. 새 창과 같은 저장 본문·DB 조회 복원 |

system 이벤트는 앱의 nativeTheme 테스트 주입이다. **OS Settings를 사람이 직접 전환한 증거가 아니다.**
quit/activate도 실제 Electron API 경로의 자동화이며 물리적 Cmd+Q·Dock 클릭으로 확대 해석하지 않는다.
초기 잘못된 return selector, 만료된 browser handle, assertion import 오류는 harness 실패였다.
성공한 최종 단일 runtime 실행의 JSON·이미지만 증거로 사용한다.
자동 runtime 앱·DB와 만료된 이전 소유 앱은 정리했다. 사용자 데이터·전체 desktop 이미지는 보관하지 않았다.

## OS 손동작 차단 이력과 사용자 확인

desktop tool의 첫 capture가 `COMPUTER_SCREENSHOT_FAILED`로 실패했다.
실패 후 coordinate 입력이나 OS 설정 조작을 재시도·우회하지 않았다.
초기에는 아래 항목을 미확인으로 두고 사용자에게 실제 검증을 요청했다.

1. system을 저장한 앱이 실제 macOS light/dark 설정 전환을 따르는지 확인.
2. 타이틀바 빈 영역 드래그와 본문/검색 텍스트 드래그 선택의 구분.
3. native 최소화·확대·빨간 닫기 버튼, 미저장 상태의 Cmd+Q 취소.
4. 최초 표시의 모든 프레임에서 flash가 없는지 확인. 전체 접근성 인증도 미실시.

Stage 2의 사용자 “창이 정상적으로 움직임” 확인은 당시 수동 근거로 유지하며,
이를 새 코드의 위 항목 전수 완료로 바꾸지 않는다.

이후 사용자에게 1–3의 실제 점검을 요청한 질문에서 **“세 항목 정상 확인”** 회신을 받았다.
실제 OS system 전환, 타이틀바/본문 hit-test 구분, native 버튼·dirty 닫기/Cmd+Q 취소는
사용자 수동 근거로 완료한다. 4의 전체 프레임 무flash·전체 접근성 인증은 여전히 미실시다.
자동 runtime·사용자 확인·desktop tool 실패를 서로 다른 근거로 유지한다.

사용자 확인용으로 별도 임시 DB의 **수동 검증 전용 프로젝트 / OS 창 동작 확인** 앱을 실행했다.
세션 소유권·PID·정리 경로는
로컬 `.working/stage5-manual-session.json`에 기록했다(게시 제외).
실제 라이브러리·API 키는 사용하지 않았다. 확인 후 해당 소유 앱·관리 monitor와 임시 경로만
정리했다. 세션 JSON의 최종 상태와 runtime JSON의 humanConfirmation에 결과를 기록했다.

## 결과와 승인 경계

최종 [보고서](../report/task_m012_31_report.md)에 수용 기준별 자동/사용자 수동/미실행을 매핑했다.
사용자 확인을 반영해 Stage 5 구현·검증·보고를 완료했다. 전체 프레임·전체 접근성·강제 종료
복구 또는 새로운 출시 완료를 주장하지 않는다. 최종 보고 검토와 게시 승인은 별개다.
commit·push·PR·배포·Issue close는 실행하지 않았다.
