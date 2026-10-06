# Task #27 Stage 1 — Phase 19 dialog helper 테스트 import 갱신

GitHub Issue: [#27](https://github.com/jinzer0/Prompter/issues/27)
구현계획서: [task_m012_27_impl.md](../plans/task_m012_27_impl.md)
Stage: 1

## 단계 목적

#18 이후 이동한 dialog helper를 테스트가 실제 소유 모듈에서 참조하도록 갱신해 #26의 TypeScript 및 focused test 실패를 해소한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `tests/phase19-privacy-renderer-ui.test.ts` | `ui/dialog`에서 `focusDialog`, `handleDialogKeyDown`를 import하고 두 호출부 갱신 |
| `mydocs/orders/20260923.md` | 기존 #27 행에 Stage 1 완료 및 Stage 2 승인 대기 반영 |
| `mydocs/working/task_m012_27_stage1.md` | 단계 결과 기록 |

## 본문 변경 정도 / 본문 무손실 여부

테스트의 assertions, Escape 취소 및 포커스 복귀 검증 의미를 유지했다. 제품 런타임 코드와 Biome 설정은 변경하지 않았다. 기존 helper 이름을 유지하는 호환 alias도 추가하지 않았다.

## 검증 결과

2026-09-26 실행:

```bash
npx biome check tests/phase19-privacy-renderer-ui.test.ts
npm run typecheck
npm test -- tests/phase19-privacy-renderer-ui.test.ts
git diff --check
```

- 모두 종료 코드 0으로 통과했다.
- focused Vitest: `Test Files 1 passed (1)`, `Tests 8 passed (8)`.
- Biome deprecated 설정 안내 및 native rebuild의 libc++/함수 포인터 경고는 출력됐으며 숨기거나 설정을 바꾸지 않았다.

## 잔여 위험

- 전체 lint/test/build/smoke는 이번 Stage에서 실행하지 않았다.
- `.gjc/` runtime state lint 제외는 Stage 2 범위로 남아 있다.
- 테스트 명령이 better-sqlite3를 Node용으로 rebuild했다. Electron 검증에는 기존 `native:electron` 경로가 필요하다.

## 다음 단계 영향

Stage 2에서 `biome.json`의 기존 설정을 유지하며 `.gjc/` runtime state 제외를 적용하고 lint를 검증한다.

## 승인 요청

Stage 1 결과 검토 및 Stage 2 진입 승인.
