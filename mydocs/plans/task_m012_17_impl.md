# Prompt 선택형 카드 공용 SelectableCard 추출 구현계획서

수행계획서: [`task_m012_17.md`](task_m012_17.md)
GitHub Issue: [#17](https://github.com/jinzer0/Prompter/issues/17)
마일스톤: M012

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | SelectableCard primitive 작성 | `renderer/src/components/ui/selectable-card.tsx` 또는 동등 파일 | `npm run typecheck`, `git diff --check` |
| 2 | Prompt 카드 적용 | `renderer/src/components/prompt-asset-card.tsx`, `renderer/src/components/prompt-search-result-card.tsx` | `npm run typecheck`, `npm run lint`, focused UI 검증 또는 관련 테스트, `git diff --check` |
| 3 | 검증과 최종 보고 | `mydocs/working/task_m012_17_stage3.md`, `mydocs/report/task_m012_17_report.md` | `npm run typecheck`, `npm run lint`, `git status --short`, `git diff --check` |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| task 계획/보고 문서 | `mydocs/` | `mydocs/plans`, `mydocs/working`, `mydocs/report` | OK | 내부 task 산출물이다. |
| 공식 제품 문서 | 해당 없음 | 해당 없음 | OK | 이번 task는 제품/사용자 문서 변경을 포함하지 않는다. |

## Stage 1 — SelectableCard primitive 작성

### 산출물

- `renderer/src/components/ui/selectable-card.tsx` 또는 동등 파일

### 변경 내용

- button shell, selected state, focus/hover class를 공용화한다.
- prompt 도메인 데이터를 받지 않는 presentation primitive로 둔다.

### 검증

```bash
`npm run typecheck`
`git diff --check`
```

### 커밋

```text
Task #17 Stage 1: SelectableCard primitive 추가
```

## Stage 2 — Prompt 카드 적용

### 산출물

- `renderer/src/components/prompt-asset-card.tsx`
- `renderer/src/components/prompt-search-result-card.tsx`

### 변경 내용

- 두 카드가 공용 shell을 사용하게 하고 내부 title/badge/meta/preview 구조는 보존한다.
- aria-pressed와 onClick 동작을 유지한다.

### 검증

```bash
`npm run typecheck`
`npm run lint`
focused UI 검증 또는 관련 테스트
`git diff --check`
```

### 커밋

```text
Task #17 Stage 2: Prompt 카드에 SelectableCard 적용
```

## Stage 3 — 검증과 최종 보고

### 산출물

- `mydocs/working/task_m012_17_stage3.md`
- `mydocs/report/task_m012_17_report.md`

### 변경 내용

- 표시 정보와 선택 동작 보존 검증을 정리한다.
- 최종 PR 준비 상태를 보고한다.

### 검증

```bash
`npm run typecheck`
`npm run lint`
`git status --short`
`git diff --check`
```

### 커밋

```text
Task #17 Stage 3 + 최종 보고서: SelectableCard 추출 완료
```

## 공통 작업 규칙

- 각 Stage 완료 후 `mydocs/working/task_m012_17_stage{N}.md`에 검증 결과와 변경 요약을 기록한다.
- Stage 경계를 넘기 전 작업지시자 승인을 받는다.
- 사용자 또는 다른 작업자의 변경을 되돌리지 않는다.
- PR 준비 전 `mydocs/report/task_m012_17_report.md`를 작성한다.
