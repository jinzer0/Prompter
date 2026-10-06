# M012 통합 검증 실패 후속 수정 구현계획서

수행계획서: [`task_m012_27.md`](task_m012_27.md)
GitHub Issue: [#27](https://github.com/jinzer0/Prompter/issues/27)
마일스톤: M012

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | Phase 19 test import 갱신 | test import/callsite 수정, stage report | `npm run typecheck`, focused Phase 19 test |
| 2 | Biome runtime state 제외 | `biome.json` 설정 수정, stage report | `npm run lint`, `git diff --check` |
| 3 | 통합 재검증과 최종 보고 | 전체 검증 결과, 최종 보고서 | typecheck/lint/test/build/smoke/status/diff |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| task 계획/보고 문서 | `mydocs/` | `mydocs/plans`, `mydocs/working`, `mydocs/report` | OK | 내부 task 산출물이다. |
| 공식 제품 문서 | 해당 없음 | 해당 없음 | OK | 이번 task는 제품/사용자 문서 변경을 포함하지 않는다. |

## Stage 1 — Phase 19 test import 갱신

### 산출물

- `tests/phase19-privacy-renderer-ui.test.ts`
- `mydocs/working/task_m012_27_stage1.md`

### 변경 내용

- `privacy-warning-dialog`에서 import하던 stale helper import를 제거한다.
- `renderer/src/components/ui/dialog`에서 `focusDialog`, `handleDialogKeyDown`를 import한다.
- test callsite의 `focusPrivacyDialog` 호출을 `focusDialog`로 갱신한다.
- 테스트 의미와 assertions는 유지한다.

### 검증

```bash
npm run typecheck
npm test -- tests/phase19-privacy-renderer-ui.test.ts
git diff --check
```

### 커밋

```text
Task #27 Stage 1: Phase 19 dialog helper 테스트 import 갱신
```

## Stage 2 — Biome runtime state 제외

### 산출물

- `biome.json`
- `mydocs/working/task_m012_27_stage2.md`

### 변경 내용

- Biome v2 설정 구조를 유지하며 `.gjc/` runtime state가 검사 대상에 포함되지 않도록 제외한다.
- 제품 source와 task 문서 lint 범위는 유지한다.
- `.gjc/` 파일 자체는 수정하지 않는다.

### 검증

```bash
npm run lint
git diff --check
```

### 커밋

```text
Task #27 Stage 2: Biome에서 agent runtime state 제외
```

## Stage 3 — 통합 재검증과 최종 보고

### 산출물

- `mydocs/working/task_m012_27_stage3.md`
- `mydocs/report/task_m012_27_report.md`

### 변경 내용

- #26에서 실패한 검증 gate를 전체 재실행한다.
- 결과와 남은 한계를 최종 보고서에 기록한다.
- PR 준비 상태를 확인한다.

### 검증

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:smoke
git status --short
git diff --check
```

### 커밋

```text
Task #27 Stage 3 + 최종 보고서: 통합 검증 실패 후속 수정 완료
```

## 공통 작업 규칙

- 제품 런타임 코드는 변경하지 않는다.
- dependency remediation은 이번 task에서 다루지 않는다.
- 검증 실패가 추가로 나오면 수정 범위인지 판단해 보고하고, 범위 밖이면 후속 task로 분리한다.
