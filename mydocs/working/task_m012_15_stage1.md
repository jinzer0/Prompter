# Task #15 Stage 1 보고서 — Checkbox primitive 설계

## 변경

- `renderer/src/components/ui/checkbox.tsx`를 추가해 native checkbox wrapper를 정의했다.
- wrapper는 `InputHTMLAttributes<HTMLInputElement>` 기반으로 기존 checked/disabled/onChange semantics를 유지한다.
- 공용 class에 크기, accent, focus-visible ring, disabled 상태를 포함했다.

## 검증

- `npm run typecheck` 통과.
- `npm run lint` 통과. 기존 Biome config deprecation info만 출력됐다.
- `git diff --check` 통과.

## 다음 단계 승인 대기

Stage 2에서 승인된 raw checkbox 사용처를 공용 wrapper로 교체한다.
