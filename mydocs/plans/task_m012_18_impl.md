# dialog shell과 alert dialog 패턴 공용화 구현계획서

수행계획서: [`task_m012_18.md`](task_m012_18.md)
GitHub Issue: [#18](https://github.com/jinzer0/Prompter/issues/18)
마일스톤: M012

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | Dialog primitive 설계 | `renderer/src/components/ui/dialog.tsx` 또는 동등 파일 | `npm run typecheck`, `git diff --check` |
| 2 | Privacy/Backup dialog 적용 | `privacy-warning-dialog.tsx`, backup dialog 계열 파일 | `npm run typecheck`, `npm run lint`, dialog 관련 focused test, `git diff --check` |
| 3 | 접근성 검증과 최종 보고 | `mydocs/working/task_m012_18_stage3.md`, `mydocs/report/task_m012_18_report.md` | `npm run typecheck`, `npm run lint`, `git status --short`, `git diff --check` |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| task 계획/보고 문서 | `mydocs/` | `mydocs/plans`, `mydocs/working`, `mydocs/report` | OK | 내부 task 산출물이다. |
| 공식 제품 문서 | 해당 없음 | 해당 없음 | OK | 이번 task는 제품/사용자 문서 변경을 포함하지 않는다. |

## Stage 1 — Dialog primitive 설계

### 산출물

- `renderer/src/components/ui/dialog.tsx` 또는 동등 파일

### 변경 내용

- native `<dialog>` 기반 shell을 유지한다.
- Card composition, aria 속성, max width, backdrop class, action region 패턴을 공용화한다.

### 검증

```bash
`npm run typecheck`
`git diff --check`
```

### 커밋

```text
Task #18 Stage 1: Dialog shell primitive 추가
```

## Stage 2 — Privacy/Backup dialog 적용

### 산출물

- `privacy-warning-dialog.tsx`
- backup dialog 계열 파일

### 변경 내용

- 도메인 copy와 confirm/cancel 로직은 호출부에 남긴다.
- Escape cancel, initial safe focus, restore focus를 유지한다.

### 검증

```bash
`npm run typecheck`
`npm run lint`
dialog 관련 focused test
`git diff --check`
```

### 커밋

```text
Task #18 Stage 2: Privacy와 Backup dialog shell 공용화
```

## Stage 3 — 접근성 검증과 최종 보고

### 산출물

- `mydocs/working/task_m012_18_stage3.md`
- `mydocs/report/task_m012_18_report.md`

### 변경 내용

- focus/keyboard/ARIA 검증 결과를 정리한다.
- 남은 dialog 예외가 있으면 사유를 기록한다.

### 검증

```bash
`npm run typecheck`
`npm run lint`
`git status --short`
`git diff --check`
```

### 커밋

```text
Task #18 Stage 3 + 최종 보고서: Dialog shell 공용화 완료
```

## 공통 작업 규칙

- 각 Stage 완료 후 `mydocs/working/task_m012_18_stage{N}.md`에 검증 결과와 변경 요약을 기록한다.
- Stage 경계를 넘기 전 작업지시자 승인을 받는다.
- 사용자 또는 다른 작업자의 변경을 되돌리지 않는다.
- PR 준비 전 `mydocs/report/task_m012_18_report.md`를 작성한다.
