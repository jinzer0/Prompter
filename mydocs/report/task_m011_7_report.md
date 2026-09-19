# Task #7 최종 보고서 — Prompter v0.1.1 signed/notarized release

작성일: 2026-09-19
Issue: [#7](https://github.com/jinzer0/Prompter/issues/7)
Milestone: M011

## 결과

Prompter v0.1.1 ARM64 macOS release를 Developer ID signed, Apple Notarized, stapled, checksum-verified public GitHub Release로 게시했다.

- Public release: https://github.com/jinzer0/Prompter/releases/tag/v0.1.1
- Source commit for released assets: `bb4452e382ebf2e462070da9d23c0fc7acab1d84`
- Public assets:
  - `Prompter-0.1.1-mac-arm64.dmg`
  - `Prompter-0.1.1-mac-arm64.zip`
  - `SHA256SUMS`

## Stage summary

| Stage | 결과 | 증거 |
|---|---|---|
| Stage 1 | release worktree and secret-safe preflight completed | `mydocs/working/task_m011_7_stage1.md` |
| Stage 2 | app/ZIP signing and Notarization completed after codesign extraction fix | `mydocs/working/task_m011_7_stage2.md` |
| Stage 3 | DMG Notarization, mount validation, and checksums completed | `mydocs/working/task_m011_7_stage3.md` |
| Stage 4 | isolated v0.1.0 upgrade and non-public draft release verified | `mydocs/working/task_m011_7_stage4.md` |
| Stage 5 | public release, public download verification, and README update completed | `mydocs/working/task_m011_7_stage5.md` |

## Verification summary

- `npm run typecheck` passed.
- `npm run lint` passed with only the existing Biome deprecated `linter.recommended` info.
- `npm test` passed: 157 files / 1068 tests.
- Focused signing fingerprint recovery tests passed: 2 files / 23 tests.
- `npm run package:release:macos` completed on merged `origin/master` source after PR #11.
- App and DMG Notarization final receipts are `Accepted` with `issues: []`.
- `shasum -a 256 -c SHA256SUMS` passed locally, in draft clean-room download, and after public release.
- ZIP extracted app passed strict codesign verification, `stapler validate`, and Gatekeeper execute assessment.
- DMG passed `stapler validate`, codesign verification, and Gatekeeper open assessment with `context:primary-signature`.
- Mounted app passed `stapler validate`, strict codesign verification, and Gatekeeper execute assessment.
- `npm run test:smoke` passed 49/49.
- Isolated v0.1.0-to-v0.1.1 upgrade smoke preserved project data and synthetic OpenAI key status, then deleted the synthetic key and cleaned temp data.

## Public hashes

```text
f8830f2eb136be06351229f850348e0578301648444d23b4d90fe24734fb932f  Prompter-0.1.1-mac-arm64.zip
b9c63063084c547242dbbb1e23d4c273eb0ca16bcbf5ed964d9c548f025b8786  Prompter-0.1.1-mac-arm64.dmg
```

## Security and secret handling

- Apple signing identity and notary profile values were loaded from local `.env` without printing values.
- No Apple ID, password, private key, notary secret, OpenAI key, or real user data was committed.
- Synthetic upgrade key was deleted during upgrade smoke cleanup.
- Release artifacts remain ignored; only reports/docs/code fixes are tracked.

## Notable correction

Live release execution found that current `codesign` expects `--extract-certificates=<prefix>` rather than the separate-argument form used by the implementation. PR #11 merged the source/test correction before immutable `v0.1.1` tag and release publication. Release assets were rebuilt from merged source commit `bb4452e382ebf2e462070da9d23c0fc7acab1d84`.

## Remaining risk

- Same-user filesystem mutation and non-Apple command abortability remain residual operational risks already documented in the release pipeline reports.
- Future release automation should avoid creating a draft release before upgrade verification and should keep the release source commit visible in the release notes.

## Closure

Issue #7 can be closed after this final report/README PR is merged and `origin/master` contains the report commit. After merge, remove `local/task7` and temporary release worktrees that are no longer needed.
