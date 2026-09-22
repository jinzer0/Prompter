# Task #18 Stage 2 보고서 — Privacy와 Backup dialog shell 공용화

## 변경

- `BackupDialog`가 `DialogShell`과 `focusDialog`를 사용하도록 변경했다.
- `PrivacyWarningDialog`가 `DialogShell`과 `focusDialog`를 사용하도록 변경했다.
- Privacy/Backup 도메인 copy, confirm/cancel action, safe cancel initial focus selector는 유지했다.

## 검증

- `npm run typecheck` 통과.
- `npm run lint` 통과. 기존 Biome config deprecation info만 출력됐다.
- `git diff --check` 통과.
