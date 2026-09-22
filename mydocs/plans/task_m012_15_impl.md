# 공용 Checkbox UI wrapper 도입 구현계획서

수행계획서: [`task_m012_15.md`](task_m012_15.md)
GitHub Issue: [#15](https://github.com/jinzer0/Prompter/issues/15)
마일스톤: M012

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | Checkbox primitive 설계 | `renderer/src/components/ui/checkbox.tsx` | `npm run typecheck`, `git diff --check` |
| 2 | Raw checkbox 사용처 교체 | app-lock/backup/maintenance/privacy/project-context/compiler 관련 승인 대상 파일 | `npm run typecheck`, `npm run lint`, focused grep: raw checkbox 잔여 확인, `git diff --check` |
| 3 | 검증과 최종 보고 | `mydocs/working/task_m012_15_stage3.md`, `mydocs/report/task_m012_15_report.md` | `npm run typecheck`, `npm run lint`, `git status --short`, `git diff --check` |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| task 계획/보고 문서 | `mydocs/` | `mydocs/plans`, `mydocs/working`, `mydocs/report` | OK | 내부 task 산출물이다. |
| 공식 제품 문서 | 해당 없음 | 해당 없음 | OK | 이번 task는 제품/사용자 문서 변경을 포함하지 않는다. |

## Stage 1 — Checkbox primitive 설계

### 산출물

- `renderer/src/components/ui/checkbox.tsx`

### 변경 내용

- 기존 UI wrapper API와 동일하게 단순 props pass-through 구조를 우선한다.
- inline checkbox와 설명 row에 필요한 최소 class 구성을 정의한다.

### 검증

```bash
`npm run typecheck`
`git diff --check`
```

### 커밋

```text
Task #15 Stage 1: Checkbox UI primitive 추가
```

## Stage 2 — Raw checkbox 사용처 교체

### 산출물

- app-lock/backup/maintenance/privacy/project-context/compiler 관련 승인 대상 파일

### 변경 내용

- raw `<input type="checkbox">` 사용처를 공용 wrapper로 교체한다.
- accessible name, checked, disabled, onChange 동작을 유지한다.

### 검증

```bash
`npm run typecheck`
`npm run lint`
focused grep: raw checkbox 잔여 확인
`git diff --check`
```

### 커밋

```text
Task #15 Stage 2: Checkbox wrapper 사용처 적용
```

## Stage 3 — 검증과 최종 보고

### 산출물

- `mydocs/working/task_m012_15_stage3.md`
- `mydocs/report/task_m012_15_report.md`

### 변경 내용

- UI 동작 회귀가 없는지 focused 검증 결과를 정리한다.
- PR 준비 상태와 남은 예외 사용처가 있으면 보고한다.

### 검증

```bash
`npm run typecheck`
`npm run lint`
`git status --short`
`git diff --check`
```

### 커밋

```text
Task #15 Stage 3 + 최종 보고서: Checkbox wrapper 정리 완료
```

## 공통 작업 규칙

- 각 Stage 완료 후 `mydocs/working/task_m012_15_stage{N}.md`에 검증 결과와 변경 요약을 기록한다.
- Stage 경계를 넘기 전 작업지시자 승인을 받는다.
- 사용자 또는 다른 작업자의 변경을 되돌리지 않는다.
- PR 준비 전 `mydocs/report/task_m012_15_report.md`를 작성한다.
