# 반복 텍스트와 muted surface 스타일 primitive 정리 구현계획서

수행계획서: [`task_m012_16.md`](task_m012_16.md)
GitHub Issue: [#16](https://github.com/jinzer0/Prompter/issues/16)
마일스톤: M012

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | 반복 패턴 확정과 primitive 작성 | `renderer/src/components/ui/text.tsx` 또는 동등 파일, `renderer/src/components/ui/muted-well.tsx` 또는 동등 파일 | `npm run typecheck`, `git diff --check` |
| 2 | 제한적 적용 | backup/privacy/app-lock/harness 중 승인 대상 파일 | `npm run typecheck`, `npm run lint`, 반복 class focused grep, `git diff --check` |
| 3 | 검증과 최종 보고 | `mydocs/working/task_m012_16_stage3.md`, `mydocs/report/task_m012_16_report.md` | `npm run typecheck`, `npm run lint`, `git status --short`, `git diff --check` |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| task 계획/보고 문서 | `mydocs/` | `mydocs/plans`, `mydocs/working`, `mydocs/report` | OK | 내부 task 산출물이다. |
| 공식 제품 문서 | 해당 없음 | 해당 없음 | OK | 이번 task는 제품/사용자 문서 변경을 포함하지 않는다. |

## Stage 1 — 반복 패턴 확정과 primitive 작성

### 산출물

- `renderer/src/components/ui/text.tsx` 또는 동등 파일
- `renderer/src/components/ui/muted-well.tsx` 또는 동등 파일

### 변경 내용

- 반복도 높은 텍스트/surface class 조합만 선정한다.
- semantic element를 호출부가 보존할 수 있는 API로 작성한다.

### 검증

```bash
`npm run typecheck`
`git diff --check`
```

### 커밋

```text
Task #16 Stage 1: 텍스트와 muted surface primitive 추가
```

## Stage 2 — 제한적 적용

### 산출물

- backup/privacy/app-lock/harness 중 승인 대상 파일

### 변경 내용

- 선정된 영역에만 primitive를 적용하고 일회성 스타일은 유지한다.
- 기존 copy, aria role, output/status 의미를 보존한다.

### 검증

```bash
`npm run typecheck`
`npm run lint`
반복 class focused grep
`git diff --check`
```

### 커밋

```text
Task #16 Stage 2: 반복 스타일 primitive 적용
```

## Stage 3 — 검증과 최종 보고

### 산출물

- `mydocs/working/task_m012_16_stage3.md`
- `mydocs/report/task_m012_16_report.md`

### 변경 내용

- 적용 범위와 제외한 반복 패턴의 사유를 보고한다.
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
Task #16 Stage 3 + 최종 보고서: 반복 스타일 primitive 정리 완료
```

## 공통 작업 규칙

- 각 Stage 완료 후 `mydocs/working/task_m012_16_stage{N}.md`에 검증 결과와 변경 요약을 기록한다.
- Stage 경계를 넘기 전 작업지시자 승인을 받는다.
- 사용자 또는 다른 작업자의 변경을 되돌리지 않는다.
- PR 준비 전 `mydocs/report/task_m012_16_report.md`를 작성한다.
