# M012 Task #31 Stage 2 — 네이티브 창과 양 테마 기반

GitHub Issue: [#31](https://github.com/jinzer0/Prompter/issues/31)
구현계획서: [task_m012_31_impl.md](../plans/task_m012_31_impl.md)
Stage: 2
상태: 구현·자동 검증 완료, 수동 확인과 한계 기록 완료. 단계 보고 및 Stage 3 진입 승인 대기

## 단계 목적

승인된 1180×760 초기 창과 1024×720 최소 창, 네이티브 제목 막대, 시스템/라이트/다크 동기화를 구현한다. Stage 1에서 이관한 실제 창 드래그 확인을 포함한다. Settings 분리, 컴파일러 정보 재배치, 직접 편집·저장·미저장 보호는 구현하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `electron/appearance-service.ts`, `appearance-ipc.ts` | main이 선호도·유효 테마를 소유하고 검증된 초기 스냅샷과 변경 이벤트 제공 |
| `electron/ipc-contract.ts`, `ipc-types.ts`, `ipc-trusted-sender.ts`, `bridge.ts`, `preload.ts` | 타입·Zod 검증·trusted sender·캐시된 appearance bridge 및 구독 해제 |
| `electron/db/repositories/settings.ts` | 기존 `app_theme` 재사용, defaults 쓰기·재조회 트랜잭션으로 실패 시 전체 롤백 |
| `electron/main.ts`, `window-options.ts` | `hiddenInset`, 승인 크기, 테마별 창 배경, 준비된 화면 표시와 이벤트 정리 |
| `renderer/src/lib/appearance.ts`, `hooks/use-appearance.ts`, `main.tsx`, `app.tsx` | React 표시 전 테마 적용, snapshot/event 연동, 잠금 화면을 포함한 공통 제목 막대 |
| `renderer/src/styles.css`, `components/shell/app-shell.tsx` | 양 테마 토큰, 최소 창의 3열 유지, 외곽 창 연결, 드래그/본문 no-drag 경계 및 reduced motion |
| `renderer/src/components/settings-defaults-form.tsx`, `components/app-lock/lock-screen.tsx`, `components/ui/{badge,button,tabs}.tsx` | 실제 appearance 상태와 선택 표시 일치, 테마 토큰 적용, 버튼 줄바꿈 회귀 방지 |
| `tests/appearance-{contract,service,ui}.test.ts`, `vitest.config.ts` | 초기화·계약·잘못된 값·저장 실패·롤백·구독 정리 검증 및 명시적 테스트 수집 |
| 기존 bridge·shell-menu·window-security·Electron smoke 및 Insights·Privacy 테스트 | native chrome 높이, 최소 크기, 가로 넘침 금지, 제거된 gutter와 appearance 회귀 반영 |
| `docs/ux/mockups/`, UX 작업 공간의 동일 시안 | 정적 표시 요소에 의미 역할·section 적용. 시각 배치·정책·시안 수는 변경하지 않음 |
| UX 작업 공간 `.working/stage2-runtime-results.json`, `stage2-{light,dark}-{1180,1024}.png` | 격리된 실제 Electron 실행 수치와 양 테마 화면 근거 |

단계 보고는 승인된 `mydocs/working/`에 작성한다. 제품 계약의 진실 원천은 여전히 루트 `DESIGN.md`와 `docs/ux/EXPERIENCE.md`다. 신규 제품 문서 위치나 별도 테마 설정 저장소·DB migration은 추가하지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

제품 코드 작업이다. 기존 Library·Insights·Privacy·잠금·Settings·컴파일러의 데이터와 보안 경계를 유지한다. 잠금 중에도 제공하는 appearance 정보에는 라이브러리 데이터나 시크릿이 없다. 기존 settings 쓰기 경로 두 개가 같은 appearance 서비스를 거치며 저장 성공 전에 native 상태를 변경하지 않는다.

최소 창에서 3열을 유지하기 위한 shell의 폭·외곽 여백·gutter 조정은 창 기반 작업에 포함했다. Stage 3의 설정 화면 분리·사이드바 정보 정리·내부 패널 정리·컴파일러 추가 옵션·사용자 문구 작업을 완료한 것으로 취급하지 않는다.

## 검증 결과

실행 명령:

```bash
npm run typecheck
npm run lint
npm test -- tests/appearance-contract.test.ts tests/appearance-service.test.ts tests/appearance-ui.test.ts tests/phase9-contract.test.ts tests/main-window-security.test.ts tests/electron-contract-shell-menu.test.ts tests/electron-contract-bridge-surface.test.ts
npm test
npm run build
./node_modules/.bin/vite build
./node_modules/.bin/playwright test
 git diff --check
```

- 집중 Vitest: 7파일, 45테스트 통과.
- 전체 Vitest: 160파일, 1104테스트 통과. Node용 native rebuild는 기존 `npm test` 경로 사용.
- build: 통과. Electron용 native rebuild는 기존 build 경로 사용. 마지막 드래그 CSS 수정 뒤 renderer bundle 재생성.
- 최종 전체 Electron 회귀: **49테스트 통과**. build로 Electron ABI를 준비한 뒤 Playwright를 직접 실행했다. 최초 전체 실행에서 Privacy의 오래된 16px gutter 기대만 실패했고 새 창 레이아웃 계약에 맞춰 수정한 뒤 전체 재실행했다.
- 최종 lint·typecheck·diff-check: 통과. 오류/경고 억제나 테스트 삭제 없이 수정했다.
- 기존 경고·정보: Vite의 500kB 초과 bundle 경고, native 의존성 컴파일 경고, Biome `recommended` 설정의 deprecated 정보. 이번 단계에서 의존성이나 설정을 임의 변경하지 않았다.
- 정적 시안의 의미 요소 수정은 Biome 통과를 위해 양쪽 사본에 동일 적용했다. 추가 UX 리뷰나 접근성 인증으로 간주하지 않는다.

### 실제 Electron 실행

일회성 userData/DB와 테스트 환경에서 실행했다. 사용자 DB·실제 API 키·LLM 호출을 사용하지 않았다.

| 시나리오 | 결과 |
|---|---|
| dark/light 선호도 저장 후 앱 종료·재실행 | 두 모드 모두 선호도·유효 테마 유지 |
| 1180×760, 양 테마 | 210/280/690px의 세 패널 표시, shell clientWidth=scrollWidth=1180 |
| 1024×720, 양 테마 | 210/280/534px의 세 패널 표시, shell clientWidth=scrollWidth=1024 |
| native 창 배경·renderer color-scheme | dark `#08090A`, light `#F7F8F8`와 유효 테마 일치 |
| system 선호도에서 nativeTheme updated | dark/light 이벤트가 renderer까지 전달되고 선호도는 system 유지 |
| reduced-motion | New Project 버튼의 transitionDuration `0s` |
| 지정 제목 막대 드래그 | 사용자 직접 확인: **“창이 정상적으로 움직임”** |
| 제목 막대/본문 영역 분리 | Electron smoke에서 chrome=drag, root=none, 본문·창 버튼 여유 영역=no-drag 확인 |

자동 computer 입력은 일반 native 제목 막대 대조 창을 이동했지만 CSS 드래그 창은 이동시키지 못했다. 이를 제품 실패나 자동 검증 통과로 단정하지 않았다. 제목 막대가 drag를 소유하고 상위 root의 no-drag를 제거한 최종 CSS를 빌드·적용한 뒤 사용자 손동작으로 확인했다. 사용자 답변 후 제어 탭의 실행 상태가 사라져 전후 좌표를 다시 수집하지 못했으므로, 수동 통과의 근거는 사용자 응답이다.

실행 근거는 로컬 UX workspace의 `.working/stage2-runtime-results.json`에 기록했다(게시 제외). 네 장의 실제 renderer 화면은 동일 폴더에 보관했다. 사용자 데스크톱의 다른 앱이 담긴 전체 화면 캡처는 제품 산출물로 복사하지 않았다. 마지막 격리 실행의 임시 DB와 대조 창은 정리했으며 테스트 앱을 종료했다.

## 잔여 위험과 검증 한계

- OS 설정 자체의 라이트/다크 전환은 수행하지 않았다. 실제 Electron `nativeTheme` 변경 이벤트와 전체 bridge 연동, OS 변화 분기는 각각 실제 실행과 단위 테스트로 검증했다. 이는 OS 설정 직접 조작의 수동 검증과 구분한다.
- 최초 표시 전 snapshot 적용과 `show:false`/`ready-to-show` 구성은 코드·테스트로 확인했다. 최초 표시의 모든 프레임을 촬영해 flash 부재를 증명한 것은 아니다.
- native 창 버튼은 실제 화면에서 가시성을 확인했다. 최소화·확대·닫기 버튼 각각의 손동작과 모든 텍스트 선택 위치의 OS hit-test를 전수 검증하지 않았다. 본문 no-drag·입력 조작·기존 닫기/잠금 흐름은 CSS/전체 Electron 회귀로 확인했다.
- 전체 접근성 인증이나 선택적 UX 리뷰를 추가 수행한 것은 아니다. 기존 시안 대비 검토 한계는 유지한다.
- 독립 작업자의 제한 시간 종료로 최종 receipt는 없었다. 남은 변경을 부모 작업에서 확인하고 전체 검증을 수행했다.

## 다음 단계 영향

- Stage 3은 기존 appearance 서비스·토큰·공통 native chrome 위에서 Settings 분리와 정보 구조를 구현한다. 테마 선호도를 별도 저장하지 않는다.
- 선택/초안 보존, 컴파일러 옵션 접힘, 개발자 문구 정리는 아직 기존 동작이다.
- 직접 편집·새 버전·복제·미저장 보호는 Stage 4다. 기존 compiled-output 저장 guard를 임의 삭제하지 않는다.
- 원본 checkout은 `master`이며 tracked 변경 없이 보존했다. 사용자 BMAD 설치·미추적 파일은 유지했다. 전용 `local/task31` 변경은 모두 미커밋이다.

## 승인 요청

- Stage 2의 산출물·수동 확인·검증 한계를 검토하고 Stage 3 진입을 명시적으로 승인한다.
- Stage 3 이후 구현·commit·push·PR은 아직 승인되지 않았으며 실행하지 않았다.
