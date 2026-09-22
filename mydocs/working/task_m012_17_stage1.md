# Task #17 Stage 1 보고서 — SelectableCard primitive 작성

## 변경

- `renderer/src/components/ui/selectable-card.tsx`를 추가했다.
- native button 기반으로 selected state, `aria-pressed`, card surface, hover, focus-visible ring을 공용화했다.
- prompt 도메인 데이터를 받지 않는 presentation primitive로 유지했다.

## 검증

- `npm run typecheck` 통과.
- `npm run lint` 통과. 기존 Biome config deprecation info만 출력됐다.
- `git diff --check` 통과.
