# M012 디자인 리팩토링 통합 검증 구현계획서

수행계획서: [`task_m012_26.md`](task_m012_26.md)
GitHub Issue: [#26](https://github.com/jinzer0/Prompter/issues/26)
마일스톤: M012

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | 검증 기준선 확인 | 기준선 보고서 | branch, issue/PR state, `git diff --check` |
| 2 | 정적/단위 검증 | typecheck/lint/test 결과 | `npm run typecheck`, `npm run lint`, `npm test` |
| 3 | Electron smoke와 최종 보고 | smoke 결과, 최종 보고서 | `npm run build`, `npm run test:smoke`, status/diff check |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| task 계획/보고 문서 | `mydocs/` | `mydocs/plans`, `mydocs/working`, `mydocs/report` | OK | 내부 task 산출물이다. |
| 공식 제품 문서 | 해당 없음 | 해당 없음 | OK | 이번 task는 제품/사용자 문서 변경을 포함하지 않는다. |

## Stage 1 — 검증 기준선 확인

### 산출물

- `mydocs/working/task_m012_26_stage1.md`

### 변경 내용

- `local/task26`이 최신 `origin/master` 기준인지 확인한다.
- `#14-#19`, PR `#20-#25`, Issue `#26` 상태를 확인한다.
- 제품 코드 변경 없이 task 문서 산출물만 유지한다.

### 검증

```bash
git status --short --branch
git diff --check
gh issue view 26 --repo jinzer0/Prompter --json number,state,milestone,labels,url
gh pr view 20-25 --repo jinzer0/Prompter
```

### 커밋

```text
Task #26 Stage 1: 통합 검증 기준선 확인
```

## Stage 2 — 정적/단위 검증

### 산출물

- `mydocs/working/task_m012_26_stage2.md`

### 변경 내용

- TypeScript, Biome, Vitest 검증을 실행한다.
- 실패가 있으면 수정하지 않고 명령, 오류, 범위, 후속 판단을 기록한다.

### 검증

```bash
npm run typecheck
npm run lint
npm test
git diff --check
```

### 커밋

```text
Task #26 Stage 2: 정적 검증과 단위 테스트 결과 기록
```

## Stage 3 — Electron smoke와 최종 보고

### 산출물

- `mydocs/working/task_m012_26_stage3.md`
- `mydocs/report/task_m012_26_report.md`

### 변경 내용

- build 산출물을 만든 뒤 Electron smoke를 실행한다.
- 모든 검증 결과와 한계를 최종 보고서에 정리한다.
- PR 생성 준비 상태를 확인한다.

### 검증

```bash
npm run build
npm run test:smoke
git status --short
git diff --check
```

### 커밋

```text
Task #26 Stage 3 + 최종 보고서: M012 통합 검증 완료
```

## 공통 작업 규칙

- 검증 실패를 제품 코드 수정으로 처리하지 않는다.
- 문서 산출물 외 변경이 발생하면 원인을 확인하고 필요한 경우 삭제하거나 별도 승인을 받는다.
- Stage 경계마다 보고서를 남긴다.
