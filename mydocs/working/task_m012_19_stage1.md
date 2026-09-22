# Task #19 Stage 1 보고서 — Metric primitive 설계

## 변경

- `renderer/src/components/ui/metric-card.tsx`를 추가했다.
- `MetricGrid`는 `dl` grid를, `MetricCard`는 `dt/dd` 기반 compact metric card를 담당한다.
- 기본 class는 backup/privacy count card와 같은 compact muted surface를 기준으로 두고, Insights는 class override로 기존 크기를 유지하게 했다.

## 검증

- `npm run typecheck` 통과.
- `npm run lint` 통과. 기존 Biome config deprecation info만 출력됐다.
- `git diff --check` 통과.
