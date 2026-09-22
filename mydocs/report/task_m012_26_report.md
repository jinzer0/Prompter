# Task #26 최종 결과보고서 — M012 디자인 리팩토링 통합 검증

## 요약

- 최신 `master` 기반 `local/task26`에서 M012 디자인 리팩토링 통합 검증을 수행했다.
- PR `#20-#25`와 Issue `#14-#19` 병합/종료 상태를 확인했다.
- `git diff --check`와 Electron smoke는 통과했다.
- `npm run typecheck`, `npm run build`, `npm test`는 `tests/phase19-privacy-renderer-ui.test.ts`의 stale import 때문에 실패했다.
- `npm run lint`는 `.gjc` runtime state JSON 파일이 Biome 대상에 포함되어 실패했다.

## 검증 결과

| 항목 | 결과 | 근거 |
|---|---|---|
| 기준선 확인 | OK | `local/task26` 최신 `origin/master` 기준, PR `#20-#25` merged, Issue `#14-#19` closed |
| `git diff --check` | OK | Stage 1-3 모두 통과 |
| `npm run typecheck` | FAIL | `tests/phase19-privacy-renderer-ui.test.ts`가 제거된 `focusPrivacyDialog`, `handlePrivacyDialogKeyDown` export를 import |
| `npm run lint` | FAIL | `.gjc/_session-*`, `.gjc/state/sdk/*` runtime JSON formatting 이슈가 Biome 대상에 포함됨 |
| `npm test` | FAIL | 157 files 중 1 failed, 1068 tests 중 1 failed; `focusPrivacyDialog is not a function` |
| `npm run build` | FAIL | build 선행 typecheck에서 동일 import 오류로 중단 |
| `npm run test:smoke` | OK with limitation | 49 passed; 단, fresh build 실패 후 기존 산출물 사용 가능성 있음 |

## 실패 원인

### Phase 19 renderer unit test stale import

`#18` dialog shell 공용화로 focus/Escape helper가 `renderer/src/components/ui/dialog.tsx`의 `focusDialog`, `handleDialogKeyDown`로 이동했다. 하지만 `tests/phase19-privacy-renderer-ui.test.ts`는 여전히 `renderer/src/components/privacy/privacy-warning-dialog`에서 기존 이름을 import한다.

관찰된 오류:

```text
TS2305: Module '"../renderer/src/components/privacy/privacy-warning-dialog"' has no exported member 'focusPrivacyDialog'.
TS2305: Module '"../renderer/src/components/privacy/privacy-warning-dialog"' has no exported member 'handlePrivacyDialogKeyDown'.
TypeError: focusPrivacyDialog is not a function
```

### Biome 대상에 runtime `.gjc` state 포함

`npm run lint`가 `.gjc/_session-*` 및 `.gjc/state/sdk/*` JSON runtime 파일을 검사했고 formatting 실패를 보고했다. 해당 파일들은 제품 source가 아니라 agent runtime state로 보인다.

## 후속 조치 제안

- 새 bug task로 `tests/phase19-privacy-renderer-ui.test.ts` import를 dialog helper의 새 위치/이름에 맞게 갱신한다.
- Biome/lint 대상에서 `.gjc/` runtime state를 제외할지 저장소 정책을 확인하고 별도 task로 처리한다.
- 후속 수정 후 `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:smoke`를 재실행한다.

## 결론

M012 디자인 리팩토링 통합 검증 최종 판정은 `FAIL`이다. 병합된 UI 리팩토링 자체의 Electron smoke는 통과했지만, stale unit test import와 lint 대상에 포함된 runtime state 때문에 기본 검증 gate가 green이 아니다.
