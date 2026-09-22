# Task #15 최종 결과보고서 — 공용 Checkbox UI wrapper 도입

## 요약

- `renderer/src/components/ui/checkbox.tsx`를 추가했다.
- app-lock, backup import, maintenance scan, privacy settings, project context, compiler suggested tags의 raw checkbox를 wrapper로 교체했다.
- label/htmlFor/id 연결을 명시해 Biome a11y 규칙과 accessible name을 유지했다.

## 변경 파일

mydocs/orders/20260922.md
mydocs/plans/task_m012_15.md
mydocs/plans/task_m012_15_impl.md
mydocs/working/task_m012_15_stage1.md
mydocs/working/task_m012_15_stage2.md
renderer/src/components/app-lock/app-lock-settings-panel.tsx
renderer/src/components/backup/backup-import-actions.tsx
renderer/src/components/maintenance/maintenance-scan-controls.tsx
renderer/src/components/privacy/privacy-settings-panel.tsx
renderer/src/components/project-context-profile-editor.tsx
renderer/src/components/project-context-profile-selector.tsx
renderer/src/components/prompt-compiler-analysis.tsx
renderer/src/components/ui/checkbox.tsx

## 검증

- `npm run typecheck` 통과
- `npm run lint` 통과; 기존 Biome config deprecation info만 출력
- `git diff --check` 통과

## 리스크와 후속

- checkbox 외 switch/radio 추상화는 의도적으로 제외했다.

## PR 준비 상태

- 작업 브랜치: `local/task{n}`
- PR 대상: `master`
- 이슈: https://github.com/jinzer0/Prompter/issues/{n}
