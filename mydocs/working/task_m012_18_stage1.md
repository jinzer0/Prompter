# Task #18 Stage 1 보고서 — Dialog shell primitive 설계

## 변경

- `renderer/src/components/ui/dialog.tsx`를 추가했다.
- native `<dialog>` 기반 `DialogShell`, Escape cancel 처리 `handleDialogKeyDown`, focus 복귀 helper `focusDialog`를 공용화했다.
- shell은 기존 Card composition, max width, backdrop, `aria-labelledby`, `aria-describedby`, `aria-modal` 구조를 유지한다.

## 검증

- `npm run typecheck` 통과.
- `npm run lint` 통과. 기존 Biome config deprecation info만 출력됐다.
- `git diff --check` 통과.
