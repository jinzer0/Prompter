# Task #7 Stage 2 보고서 — app/ZIP signing과 Notarization

작성일: 2026-09-19
Issue: [#7](https://github.com/jinzer0/Prompter/issues/7)
Milestone: M011

## 요약

Stage 2 offline gates와 release packaging을 실행했다. 첫 release run은 app Notarization Accepted 이후 final artifact signer fingerprint gate에서 `codesign --extract-certificates` CLI 형식 문제로 중단됐다. 이 blocker는 source에서 `--extract-certificates=<prefix>` 형식으로 교정하고 fixture/test를 갱신해 회귀 테스트를 통과시켰다. 중간 PR #11을 `master`에 병합한 뒤 `local/task7`을 `origin/master` merge commit `bb4452e382ebf2e462070da9d23c0fc7acab1d84`로 fast-forward하고 release evidence/assets를 재생성했다. 이후 `npm run package:release:macos`가 완료되어 signed/stapled app ZIP, DMG, `SHA256SUMS`가 생성됐다.

## 변경 파일

수정:

- `scripts/macos/signing.mjs`
- `tests/package-macos-coordinator-signing-fingerprint-recovery.test.mjs`
- `tests/support/macos-coordinator-fixtures.mjs`

신규:

- `mydocs/working/task_m011_7_stage2.md`

Ignored local evidence/assets:

- `.omo/evidence/release-macos/v0.1.1/app/notarization-final.json`
- `.omo/evidence/release-macos/v0.1.1/app/notary-5d2b45b5-fb98-4428-9679-26bec2a9e688.json`
- `release/v0.1.1/Prompter-0.1.1-mac-arm64.zip`

## 검증 결과

| 항목 | 결과 | 근거 |
|---|---|---|
| typecheck | OK | `npm run typecheck` passed after `npm ci`. |
| lint | OK | `npm run lint` passed with only existing Biome deprecated `linter.recommended` info. |
| full Vitest | OK | `npm test` passed: 157 files / 1068 tests. |
| focused certificate extraction regression | OK | `npm test -- tests/package-macos-coordinator-signing-fingerprint-recovery.test.mjs tests/package-macos-signing-flow.test.mjs` passed: 2 files / 23 tests. |
| release package command | OK after fix and merge | `npm run package:release:macos` completed with `macOS release artifacts are ready.` on merged `origin/master` source. |
| app Notarization | OK | app `notarization-final.json`: status `Accepted`, issues `[]`, submission id recorded in ignored evidence. |
| ZIP checksum | OK | `shasum -a 256 -c SHA256SUMS` reported `Prompter-0.1.1-mac-arm64.zip: OK`. |
| extracted ZIP app signature/ticket/Gatekeeper | OK | `ditto` extract, `codesign --verify --deep --strict --verbose=4`, `xcrun stapler validate`, and `spctl --assess --type execute --verbose=4` all passed. |
| smoke | OK | `npm run test:smoke` passed 49/49. |
| diff check | OK | `git diff --check` passed before commits. |

## Blocker and correction

Observed blocker:

- The release runner failed after app Notarization Accepted because `codesign --display --verbose=4 --extract-certificates <prefix> <app>` treated the prefix as a path on this toolchain and failed with `No such file or directory`.

Correction:

- `scripts/macos/signing.mjs` now invokes `codesign` with `--extract-certificates=<prefix>`.
- Test fixtures and signing fingerprint recovery assertions now expect/support the equals form.

## Commands run

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm test -- tests/package-macos-coordinator-signing-fingerprint-recovery.test.mjs tests/package-macos-signing-flow.test.mjs
npm run package:release:macos
shasum -a 256 -c SHA256SUMS
/usr/bin/ditto -x -k Prompter-0.1.1-mac-arm64.zip <temp-dir>
/usr/bin/codesign --verify --deep --strict --verbose=4 <temp-dir>/Prompter.app
/usr/bin/xcrun stapler validate <temp-dir>/Prompter.app
/usr/sbin/spctl --assess --type execute --verbose=4 <temp-dir>/Prompter.app
npm run test:smoke
git diff --check
```

## 다음 경계

The same successful release run also produced the DMG and `SHA256SUMS`; Stage 3 records the DMG/mount/checksum evidence separately. Tag creation, GitHub Release creation/upload, and public publication have not been performed.
