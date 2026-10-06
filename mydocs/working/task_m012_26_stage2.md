# Task #26 Stage 2 보고서 — 정적 검증과 단위 테스트 결과

## 실행 명령

```bash
npm run typecheck
npm run lint
npm test
git diff --check
```

## 결과

- `npm run typecheck`: 실패.
  - `tests/phase19-privacy-renderer-ui.test.ts`가 `privacy-warning-dialog`에서 더 이상 export하지 않는 `focusPrivacyDialog`, `handlePrivacyDialogKeyDown`을 import한다.
  - 오류:
    - `TS2305: Module '"../renderer/src/components/privacy/privacy-warning-dialog"' has no exported member 'focusPrivacyDialog'.`
    - `TS2305: Module '"../renderer/src/components/privacy/privacy-warning-dialog"' has no exported member 'handlePrivacyDialogKeyDown'.`
- `npm run lint`: 실패.
  - `.gjc/_session-*`와 `.gjc/state/sdk/*` runtime JSON 파일 포맷 이슈가 Biome 대상에 포함됐다.
  - 제품/renderer source lint 오류는 관찰되지 않았다.
- `npm test`: 실패.
  - 157 files 중 156 passed, 1 failed.
  - 1068 tests 중 1067 passed, 1 failed.
  - 실패 테스트: `tests/phase19-privacy-renderer-ui.test.ts > Phase 19 privacy renderer UI > uses Escape as cancel and restores the previously focused control`.
  - 원인: `focusPrivacyDialog is not a function`; dialog helper가 `renderer/src/components/ui/dialog.tsx`로 이동했지만 테스트 import가 갱신되지 않았다.
- `git diff --check`: 통과.

## 판단

- M012 통합 후 unit/typecheck 기준에서 회귀가 존재한다.
- 제품 런타임 로직 실패가 아니라 테스트 import가 #18 dialog shell 공용화 이후 새 위치를 따라가지 못한 문제로 보인다.
- 수행계획 범위상 이 task에서는 제품/테스트 코드를 수정하지 않고 후속 수정 이슈가 필요하다고 기록한다.

## 2026-10-06 재검증 Stage 2

앞 절의 FAIL과 후속 제안은 과거 실행 기록이다. 아래가 최신 기준선의 Stage 2 결과이며,
아직 Stage 3 build/Electron smoke 또는 최종 통합 판정을 대체하지 않는다.

### 승인 및 실행 환경

- 작업지시자의 “stage2 진행해”로 typecheck/lint/전체 Vitest 실행 승인을 받았다.
- 전용 `Prompter-task26`, `local/task26`에서 실행했다.
  검증 HEAD는 `b1fbb822d3e2907cf4dffd8093c7424259e5ac49`, 통합 기준선은
  `origin/master`의 `e3c44a6f05e1df9085d080350f1c5c1e7d309f47`이다.
- worktree에 node_modules가 없어 `npm ci`로 기존 lockfile 그대로 설치했다.
  package.json/package-lock.json과 제품/테스트 source는 변경하지 않았다.
- `npm test`의 기존 `electron:install` 및 `native:node` 스크립트를 사용했다.
  Node 24.15.0, arm64에서 native rebuild 후 Vitest를 실행했다.

### 실행 결과

| 명령 | 결과 | 근거 |
|---|---|---|
| `npm ci` | PASS | 기존 lockfile로 228 packages 설치, exit 0 |
| `npm run typecheck` | PASS | Electron/renderer/tests TypeScript 검사, exit 0 |
| `npm run lint` | PASS | Biome 597파일 검사, fixes 없음, deprecated info 1건 유지, exit 0 |
| `npm test` | PASS | Vitest 163파일/1182테스트 통과, exit 0 |
| `git diff --check` | PASS | exit 0 |
| source/lockfile 보존 | PASS | 검증 후 git status clean, 기준선 대비 제품·테스트·설정·lockfile diff 없음 |

### 경고 및 한계

- npm은 package.json allowScripts 우선 적용으로 .npmrc 설정 무시, esbuild/fsevents 6개 package의
  install script 차단, 일부 dependency deprecated 경고를 출력했다. 승인 설정을 완화하지 않았다.
  설치와 Stage 2 명령은 통과했지만 fresh build 결과는 Stage 3에서 별도로 확인해야 한다.
- Biome recommended deprecated info와 native 컴파일 경고는 그대로 유지했다.
- 이전 stale import 실패가 이번 전체 typecheck/Vitest에서 재현되지 않았고 lint도 통과했다.
  의존성 취약점 해소·OS 수동 UX·원격 CI·배포 검증을 수행한 것으로 확대하지 않는다.
- 원본 checkout의 tracked 변경 없음도 확인했다. 사용자 BMAD/미추적 데이터는 보존했다.
- Stage 2 완료. Stage 3의 `npm run build` 후 `npm run test:smoke` 및 최종 보고 승인 대기.
  push/PR/Issue 종료·의존성 정리·배포는 실행하지 않았다.
