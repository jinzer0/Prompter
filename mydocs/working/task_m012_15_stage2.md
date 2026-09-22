# Task #15 Stage 2 보고서 — Checkbox wrapper 사용처 적용

## 변경

- app-lock, backup import, maintenance scan, privacy settings, project context, compiler suggested tags의 raw checkbox를 `Checkbox` wrapper로 교체했다.
- Biome의 label-control 판정을 유지하기 위해 각 label에 `htmlFor`를 부여하고 각 checkbox에 stable `id`를 연결했다.
- 기존 checked/disabled/onChange 로직과 표시 copy는 변경하지 않았다.

## 검증

- `npm run typecheck` 통과.
- `npm run lint` 통과. 기존 Biome config deprecation info만 출력됐다.
- `git diff --check` 통과.

## 다음 단계 승인 대기

Stage 3에서 최종 검증과 보고서를 작성한다.
