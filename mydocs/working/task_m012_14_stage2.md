# Task #14 Stage 2 보고서 — macOS titlebar 시각 검증

## 변경

- 제품 소스 추가 변경 없음.
- `hiddenInset` 옵션이 포함된 Electron main bundle을 build 후 Playwright smoke로 창 생성과 preload bridge를 포함한 전체 smoke suite를 검증했다.

## 검증

- `npm run build` 통과.
- `npm run test:smoke` 통과: 49 passed.
- 최초 `npm run test:smoke`는 `dist-electron/main.cjs`가 없어 실패했고, build 선행 후 재실행해 통과했다.

## 다음 단계 승인 대기

Stage 3에서 최종 보고서를 작성하고 PR 준비 검증을 수행한다.
