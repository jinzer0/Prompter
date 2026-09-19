# Task #7 Stage 4 보고서 — upgrade와 draft release 검증

작성일: 2026-09-19
Issue: [#7](https://github.com/jinzer0/Prompter/issues/7)
Milestone: M011

## 요약

Merged `origin/master` source commit `bb4452e382ebf2e462070da9d23c0fc7acab1d84`에서 rebuild된 v0.1.1 signed assets를 사용해 v0.1.0-to-v0.1.1 isolated upgrade smoke와 non-public draft release upload/clean-room verification을 완료했다. Draft release는 아직 public으로 게시하지 않았다.

## Source and assets

- Release source commit: `bb4452e382ebf2e462070da9d23c0fc7acab1d84`
- Tag: `v0.1.1` pushed to origin
- Draft release: `draft=true`, `prerelease=false`
- Draft assets:
  - `Prompter-0.1.1-mac-arm64.dmg`
  - `Prompter-0.1.1-mac-arm64.zip`
  - `SHA256SUMS`

`SHA256SUMS`:

```text
f8830f2eb136be06351229f850348e0578301648444d23b4d90fe24734fb932f  Prompter-0.1.1-mac-arm64.zip
b9c63063084c547242dbbb1e23d4c273eb0ca16bcbf5ed964d9c548f025b8786  Prompter-0.1.1-mac-arm64.dmg
```

## Upgrade verification

| 항목 | 결과 | 근거 |
|---|---|---|
| v0.1.0 checksum | OK | Downloaded `Prompter-0.1.0-mac-arm64.dmg` SHA-256 matched `30dd8618cb9b63594424d174a95a8b7b98661309005bc9db79cc564094762e15`. |
| isolated userData | OK | Upgrade test used a temporary `PROMPTER_USER_DATA_DIR`, not real user data. |
| data preservation | OK | v0.1.0-created `Upgrade QA Project` was visible after launching v0.1.1 against the same isolated data. |
| safeStorage continuity | OK | Synthetic OpenAI key status reported present and masked in v0.1.1. The synthetic key was deleted before cleanup. |
| cleanup | OK | Download, mount, extracted app, and isolated user data temp paths were removed; v0.1.0 DMG was detached. |

Upgrade smoke result:

```json
{"dataPreserved":true,"keyPreserved":true,"maskedKeyPresent":true}
```

## Draft release verification

| 항목 | 결과 | 근거 |
|---|---|---|
| tag | OK | `v0.1.1` was created and pushed after confirming no prior local/remote tag. |
| draft release | OK | `gh release view v0.1.1` reports `tagName=v0.1.1`, `isDraft=true`, `isPrerelease=false`. |
| asset allowlist | OK | Draft contains exactly DMG, ZIP, and `SHA256SUMS`. |
| clean-room download | OK | `gh release download v0.1.1` into a fresh temp directory downloaded exactly the three allowlisted files. |
| downloaded checksum | OK | `shasum -a 256 -c SHA256SUMS` passed for downloaded ZIP and DMG. |

## Commands run

```bash
gh release view v0.1.0 --json tagName,targetCommitish,isDraft,isPrerelease,assets,body,url
gh release download v0.1.0 --pattern Prompter-0.1.0-mac-arm64.dmg
shasum -a 256 Prompter-0.1.0-mac-arm64.dmg
hdiutil attach -readonly -nobrowse -mountpoint <mount> Prompter-0.1.0-mac-arm64.dmg
ditto -x -k release/v0.1.1/Prompter-0.1.1-mac-arm64.zip <temp-dir>
node --input-type=module <isolated Playwright/Electron upgrade smoke>
hdiutil detach <mount>
git tag -a v0.1.1 bb4452e382ebf2e462070da9d23c0fc7acab1d84 -m "Prompter v0.1.1"
git push origin v0.1.1
gh release create v0.1.1 release/v0.1.1/Prompter-0.1.1-mac-arm64.dmg release/v0.1.1/Prompter-0.1.1-mac-arm64.zip release/v0.1.1/SHA256SUMS --draft --title "Prompter v0.1.1" --notes-file /tmp/v0.1.1-notes.md
gh release view v0.1.1 --json tagName,targetCommitish,isDraft,isPrerelease,assets,url
gh release download v0.1.1 --dir <temp-dir> --pattern Prompter-0.1.1-mac-arm64.dmg --pattern Prompter-0.1.1-mac-arm64.zip --pattern SHA256SUMS
shasum -a 256 -c SHA256SUMS
```

## 다음 경계

Stage 5 requires explicit publication approval before converting the existing draft release to public. README installation text and final report are updated only after public release verification.
