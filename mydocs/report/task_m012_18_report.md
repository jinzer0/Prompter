# Task #18 최종 결과보고서 — dialog shell과 alert dialog 패턴 공용화

## 요약

- `renderer/src/components/ui/dialog.tsx`를 추가해 `DialogShell`, `focusDialog`, `handleDialogKeyDown`을 공용화했다.
- `BackupDialog`와 `PrivacyWarningDialog`가 공용 dialog shell을 사용하도록 변경했다.
- Escape cancel, focus restore, safe cancel initial focus selector, ARIA 연결을 유지했다.

## 변경 파일

mydocs/orders/20260922.md
mydocs/plans/task_m012_18.md
mydocs/plans/task_m012_18_impl.md
mydocs/working/task_m012_18_stage1.md
mydocs/working/task_m012_18_stage2.md
renderer/src/components/backup/backup-dialog.tsx
renderer/src/components/privacy/privacy-warning-dialog.tsx
renderer/src/components/ui/dialog.tsx

## 검증

- `npm run typecheck` 통과
- `npm run lint` 통과; 기존 Biome config deprecation info만 출력
- `git diff --check` 통과

## 리스크와 후속

- 도메인별 confirm/cancel 로직은 호출부에 남겨 공용 shell이 비즈니스 흐름을 소유하지 않게 했다.

## PR 준비 상태

- 작업 브랜치: `local/task{n}`
- PR 대상: `master`
- 이슈: https://github.com/jinzer0/Prompter/issues/{n}
