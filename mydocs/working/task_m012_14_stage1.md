# Task #14 Stage 1 보고서 — Window 옵션 적용

## 변경

- `electron/window-options.ts`의 `BrowserWindowConstructorOptions` 반환값에 `titleBarStyle: "hiddenInset"`를 추가했다.
- 기존 `width`, `height`, `show`, `title`, `webPreferences` 보안 옵션은 변경하지 않았다.

## 검증

- `npm run typecheck` 통과.
- `git diff --check` 통과.

## 다음 단계 승인 대기

Stage 2에서 Electron smoke 또는 앱 실행 기반 창 생성/타이틀바 시각 확인을 진행한다.
