# MetricGrid와 MetricCard 패턴 통합 구현계획서

수행계획서: [`task_m012_19.md`](task_m012_19.md)
GitHub Issue: [#19](https://github.com/jinzer0/Prompter/issues/19)
마일스톤: M012

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | Metric primitive 설계 | `renderer/src/components/ui/metric-card.tsx` 또는 동등 파일 | `npm run typecheck`, `git diff --check` |
| 2 | Insights/Backup/Privacy 적용 | `renderer/src/components/insights/insights-ui.tsx`, `renderer/src/components/backup/backup-panel-parts.tsx`, `renderer/src/components/backup/privacy-scan-counts.tsx` | `npm run typecheck`, `npm run lint`, focused UI 검증, `git diff --check` |
| 3 | 검증과 최종 보고 | `mydocs/working/task_m012_19_stage3.md`, `mydocs/report/task_m012_19_report.md` | `npm run typecheck`, `npm run lint`, `git status --short`, `git diff --check` |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| task 계획/보고 문서 | `mydocs/` | `mydocs/plans`, `mydocs/working`, `mydocs/report` | OK | 내부 task 산출물이다. |
| 공식 제품 문서 | 해당 없음 | 해당 없음 | OK | 이번 task는 제품/사용자 문서 변경을 포함하지 않는다. |

## Stage 1 — Metric primitive 설계

### 산출물

- `renderer/src/components/ui/metric-card.tsx` 또는 동등 파일

### 변경 내용

- `dl/dt/dd` semantics를 보존하는 MetricGrid/MetricCard API를 설계한다.
- compact muted surface와 숫자 강조 class를 공용화한다.

### 검증

```bash
`npm run typecheck`
`git diff --check`
```

### 커밋

```text
Task #19 Stage 1: MetricCard primitive 추가
```

## Stage 2 — Insights/Backup/Privacy 적용

### 산출물

- `renderer/src/components/insights/insights-ui.tsx`
- `renderer/src/components/backup/backup-panel-parts.tsx`
- `renderer/src/components/backup/privacy-scan-counts.tsx`

### 변경 내용

- 대상 count/metric UI가 공용 primitive를 사용하도록 교체한다.
- 표시 숫자와 label, semantic 구조를 유지한다.

### 검증

```bash
`npm run typecheck`
`npm run lint`
focused UI 검증
`git diff --check`
```

### 커밋

```text
Task #19 Stage 2: Metric UI primitive 적용
```

## Stage 3 — 검증과 최종 보고

### 산출물

- `mydocs/working/task_m012_19_stage3.md`
- `mydocs/report/task_m012_19_report.md`

### 변경 내용

- 적용 대상과 제외한 progress/chart 패턴을 보고한다.
- 최종 검증과 PR 준비 상태를 정리한다.

### 검증

```bash
`npm run typecheck`
`npm run lint`
`git status --short`
`git diff --check`
```

### 커밋

```text
Task #19 Stage 3 + 최종 보고서: MetricCard 통합 완료
```

## 공통 작업 규칙

- 각 Stage 완료 후 `mydocs/working/task_m012_19_stage{N}.md`에 검증 결과와 변경 요약을 기록한다.
- Stage 경계를 넘기 전 작업지시자 승인을 받는다.
- 사용자 또는 다른 작업자의 변경을 되돌리지 않는다.
- PR 준비 전 `mydocs/report/task_m012_19_report.md`를 작성한다.
