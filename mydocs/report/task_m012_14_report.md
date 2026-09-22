# Task #14 최종 결과보고서 — macOS BrowserWindow titlebar hiddenInset 적용

## 요약

- `electron/window-options.ts`에 `titleBarStyle: "hiddenInset"`를 추가했다.
- 기존 BrowserWindow 크기, title, preload/security webPreferences는 유지했다.
- build 후 Playwright smoke 49개가 통과했다.

## 변경 파일

electron/window-options.ts
mydocs/orders/20260922.md
mydocs/plans/task_m012_14.md
mydocs/plans/task_m012_14_impl.md
mydocs/working/task_m012_14_stage1.md
mydocs/working/task_m012_14_stage2.md

## 검증

- `npm run typecheck` 통과
- `npm run build` 통과
- `npm run test:smoke` 통과: 49 passed
- `git diff --check` 통과

## 리스크와 후속

- 실제 traffic light 위치는 smoke로 창 생성까지 검증했으며, 추가 미세 padding 조정은 별도 이슈로 분리한다.

## PR 준비 상태

- 작업 브랜치: `local/task{n}`
- PR 대상: `master`
- 이슈: https://github.com/jinzer0/Prompter/issues/{n}
