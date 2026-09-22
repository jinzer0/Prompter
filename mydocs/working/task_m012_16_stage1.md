# Task #16 Stage 1 보고서 — 텍스트와 muted surface primitive 추가

## 변경

- `renderer/src/components/ui/text.tsx`에 `HelperText`, `MetaLabel`, `StatusText`를 추가했다.
- `renderer/src/components/ui/muted-well.tsx`에 compact muted surface용 `MutedWell`을 추가했다.
- primitive는 기존 DESIGN.md typography/surface class 조합을 그대로 기준으로 삼았다.

## 검증

- `npm run typecheck` 통과.
- `npm run lint` 통과. 기존 Biome config deprecation info만 출력됐다.
- `git diff --check` 통과.
