# Task #17 Stage 2 보고서 — Prompt 카드에 SelectableCard 적용

## 변경

- `PromptAssetCard`와 `PromptSearchResultCard`가 공용 `SelectableCard` shell을 사용하도록 변경했다.
- 기존 title, badge, metadata, preview 구조와 `onSelect` 동작은 보존했다.
- 선택/비선택 border, hover, focus ring class는 primitive로 이동했다.

## 검증

- `npm run typecheck` 통과.
- `npm run lint` 통과. 기존 Biome config deprecation info만 출력됐다.
- `git diff --check` 통과.
