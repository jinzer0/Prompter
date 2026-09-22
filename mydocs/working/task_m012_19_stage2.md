# Task #19 Stage 2 보고서 — Metric UI primitive 적용

## 변경

- Backup `CountGrid`와 Privacy `PrivacyScanCounts`가 `MetricGrid`/`MetricCard`를 사용하도록 변경했다.
- Insights `InsightMetric`이 같은 `MetricCard` primitive를 사용하되 기존 border, padding, uppercase label, 16px value 스타일을 유지한다.
- progress/chart 성격의 `InsightProgress`는 수행계획 제외 범위에 따라 변경하지 않았다.

## 검증

- `npm run typecheck` 통과.
- `npm run lint` 통과. 기존 Biome config deprecation info만 출력됐다.
- `git diff --check` 통과.
