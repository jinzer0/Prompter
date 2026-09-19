# Task #7 Stage 3 보고서 — DMG Notarization과 최종 무결성 검증

작성일: 2026-09-19
Issue: [#7](https://github.com/jinzer0/Prompter/issues/7)
Milestone: M011

## 요약

`npm run package:release:macos`의 successful rerun에서 final DMG와 `SHA256SUMS`까지 생성됐다. DMG Notarization은 Accepted이며, DMG staple/signature/Gatekeeper, read-only mount, mounted app staple/signature/Gatekeeper, checksum 검증을 별도로 재확인했다.

## 산출물

Ignored local final assets:

- `release/v0.1.1/Prompter-0.1.1-mac-arm64.zip`
- `release/v0.1.1/Prompter-0.1.1-mac-arm64.dmg`
- `release/v0.1.1/SHA256SUMS`

Ignored local evidence:

- `.omo/evidence/release-macos/v0.1.1/dmg/notarization-final.json`

Tracked report:

- `mydocs/working/task_m011_7_stage3.md`

## Final asset manifest

`SHA256SUMS`:

```text
7ef96de4c3285661594e7676706e22517cf1d18cb5ed5ce1dfdc6baf67861d5c  Prompter-0.1.1-mac-arm64.zip
3317489c33f87be8cf27fab987c61af78405d6e22d7d1958ad7321e2565eb035  Prompter-0.1.1-mac-arm64.dmg
```

Local sizes at verification time:

- DMG: `139976511` bytes
- ZIP: `124214492` bytes
- `SHA256SUMS`: `190` bytes

## 검증 결과

| 항목 | 결과 | 근거 |
|---|---|---|
| DMG Notarization | OK | dmg `notarization-final.json`: status `Accepted`, issues `[]`, submission id recorded in ignored evidence. |
| checksum | OK | `shasum -a 256 -c SHA256SUMS` reported both ZIP and DMG `OK`. |
| DMG staple | OK | `xcrun stapler validate Prompter-0.1.1-mac-arm64.dmg` passed. |
| DMG signature | OK | `codesign --verify --verbose=4 Prompter-0.1.1-mac-arm64.dmg` passed. |
| DMG Gatekeeper | OK | `spctl --assess --type open --context context:primary-signature --verbose=4` accepted the DMG with `source=Notarized Developer ID`. |
| ZIP extracted app | OK | Extracted `Prompter.app` passed `codesign --verify --deep --strict`, `stapler validate`, and `spctl --assess --type execute`. |
| mounted app | OK | Read-only mounted app passed `stapler validate`, `codesign --verify --deep --strict`, and `spctl --assess --type execute`; DMG was detached cleanly. |
| smoke | OK | `npm run test:smoke` passed 49/49 after release packaging. |

## Commands run

```bash
npm run package:release:macos
shasum -a 256 -c SHA256SUMS
xcrun stapler validate Prompter-0.1.1-mac-arm64.dmg
codesign --verify --verbose=4 Prompter-0.1.1-mac-arm64.dmg
spctl --assess --type open --context context:primary-signature --verbose=4 Prompter-0.1.1-mac-arm64.dmg
ditto -x -k Prompter-0.1.1-mac-arm64.zip <temp-dir>
codesign --verify --deep --strict --verbose=4 <temp-dir>/Prompter.app
xcrun stapler validate <temp-dir>/Prompter.app
spctl --assess --type execute --verbose=4 <temp-dir>/Prompter.app
hdiutil attach -readonly -nobrowse -mountpoint <mount> Prompter-0.1.1-mac-arm64.dmg
xcrun stapler validate <mount>/Prompter.app
codesign --verify --deep --strict --verbose=4 <mount>/Prompter.app
spctl --assess --type execute --verbose=4 <mount>/Prompter.app
hdiutil detach <mount>
npm run test:smoke
```

## 다음 경계

Stage 4 may proceed with v0.1.0-to-v0.1.1 isolated upgrade verification and non-public draft release preparation. No tag, GitHub Release upload, or public publication has been performed yet.
