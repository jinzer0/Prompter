# Task #26 Stage 2 보고서 — 정적 검증과 단위 테스트 결과

## 실행 명령

```bash
npm run typecheck
npm run lint
npm test
git diff --check
```

## 결과

- `npm run typecheck`: 실패.
  - `tests/phase19-privacy-renderer-ui.test.ts`가 `privacy-warning-dialog`에서 더 이상 export하지 않는 `focusPrivacyDialog`, `handlePrivacyDialogKeyDown`을 import한다.
  - 오류:
    - `TS2305: Module '"../renderer/src/components/privacy/privacy-warning-dialog"' has no exported member 'focusPrivacyDialog'.`
    - `TS2305: Module '"../renderer/src/components/privacy/privacy-warning-dialog"' has no exported member 'handlePrivacyDialogKeyDown'.`
- `npm run lint`: 실패.
  - `.gjc/_session-*`와 `.gjc/state/sdk/*` runtime JSON 파일 포맷 이슈가 Biome 대상에 포함됐다.
  - 제품/renderer source lint 오류는 관찰되지 않았다.
- `npm test`: 실패.
  - 157 files 중 156 passed, 1 failed.
  - 1068 tests 중 1067 passed, 1 failed.
  - 실패 테스트: `tests/phase19-privacy-renderer-ui.test.ts > Phase 19 privacy renderer UI > uses Escape as cancel and restores the previously focused control`.
  - 원인: `focusPrivacyDialog is not a function`; dialog helper가 `renderer/src/components/ui/dialog.tsx`로 이동했지만 테스트 import가 갱신되지 않았다.
- `git diff --check`: 통과.

## 판단

- M012 통합 후 unit/typecheck 기준에서 회귀가 존재한다.
- 제품 런타임 로직 실패가 아니라 테스트 import가 #18 dialog shell 공용화 이후 새 위치를 따라가지 못한 문제로 보인다.
- 수행계획 범위상 이 task에서는 제품/테스트 코드를 수정하지 않고 후속 수정 이슈가 필요하다고 기록한다.
