# macOS BrowserWindow titlebar hiddenInset 적용 구현계획서

수행계획서: [`task_m012_14.md`](task_m012_14.md)
GitHub Issue: [#14](https://github.com/jinzer0/Prompter/issues/14)
마일스톤: M012

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | Window 옵션 적용 | `electron/window-options.ts` | `npm run typecheck`, `git diff --check` |
| 2 | 창 생성 및 시각 확인 | `mydocs/working/task_m012_14_stage2.md` | `npm run test:smoke` 또는 앱 실행 확인, `git diff --check` |
| 3 | 최종 보고와 PR 준비 | `mydocs/report/task_m012_14_report.md` | `npm run typecheck`, `git status --short`, `git diff --check` |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| task 계획/보고 문서 | `mydocs/` | `mydocs/plans`, `mydocs/working`, `mydocs/report` | OK | 내부 task 산출물이다. |
| 공식 제품 문서 | 해당 없음 | 해당 없음 | OK | 이번 task는 제품/사용자 문서 변경을 포함하지 않는다. |

## Stage 1 — Window 옵션 적용

### 산출물

- `electron/window-options.ts`

### 변경 내용

- `BrowserWindowConstructorOptions` 반환 객체에 `titleBarStyle: "hiddenInset"`를 추가한다.
- `width`, `height`, `show`, `title`, `webPreferences` 기존 값을 변경하지 않는다.

### 검증

```bash
`npm run typecheck`
`git diff --check`
```

### 커밋

```text
Task #14 Stage 1: BrowserWindow hiddenInset 옵션 적용
```

## Stage 2 — 창 생성 및 시각 확인

### 산출물

- `mydocs/working/task_m012_14_stage2.md`

### 변경 내용

- Electron smoke 또는 앱 실행으로 창 생성과 titlebar 영역을 확인한다.
- traffic light와 shell 콘텐츠의 겹침 여부를 보고서에 기록한다.

### 검증

```bash
`npm run test:smoke` 또는 앱 실행 확인
`git diff --check`
```

### 커밋

```text
Task #14 Stage 2: macOS titlebar 시각 검증 완료
```

## Stage 3 — 최종 보고와 PR 준비

### 산출물

- `mydocs/report/task_m012_14_report.md`

### 변경 내용

- 최종 검증 결과와 변경 파일을 정리한다.
- PR 본문에 수동 시각 확인 한계를 명시한다.

### 검증

```bash
`npm run typecheck`
`git status --short`
`git diff --check`
```

### 커밋

```text
Task #14 Stage 3 + 최종 보고서: hiddenInset 적용 완료
```

## 공통 작업 규칙

- 각 Stage 완료 후 `mydocs/working/task_m012_14_stage{N}.md`에 검증 결과와 변경 요약을 기록한다.
- Stage 경계를 넘기 전 작업지시자 승인을 받는다.
- 사용자 또는 다른 작업자의 변경을 되돌리지 않는다.
- PR 준비 전 `mydocs/report/task_m012_14_report.md`를 작성한다.
