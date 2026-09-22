# Task #17 최종 결과보고서 — Prompt 선택형 카드 공용 SelectableCard 추출

## 요약

- `renderer/src/components/ui/selectable-card.tsx`를 추가했다.
- `PromptAssetCard`와 `PromptSearchResultCard`가 공용 selected card button shell을 사용하도록 변경했다.
- 기존 title/badge/metadata/preview와 onSelect 동작은 유지했다.

## 변경 파일

mydocs/orders/20260922.md
mydocs/plans/task_m012_17.md
mydocs/plans/task_m012_17_impl.md
mydocs/working/task_m012_17_stage1.md
mydocs/working/task_m012_17_stage2.md
renderer/src/components/prompt-asset-card.tsx
renderer/src/components/prompt-search-result-card.tsx
renderer/src/components/ui/selectable-card.tsx

## 검증

- `npm run typecheck` 통과
- `npm run lint` 통과; 기존 Biome config deprecation info만 출력
- `git diff --check` 통과

## 리스크와 후속

- 공용 shell은 prompt 도메인 데이터를 받지 않도록 제한했다.

## PR 준비 상태

- 작업 브랜치: `local/task{n}`
- PR 대상: `master`
- 이슈: https://github.com/jinzer0/Prompter/issues/{n}
