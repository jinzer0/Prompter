# Task #7 Stage 5 보고서 — public release, README, cleanup 준비

작성일: 2026-09-19
Issue: [#7](https://github.com/jinzer0/Prompter/issues/7)
Milestone: M011

## 요약

작업지시자의 전체 승인 지시에 따라 Stage 4에서 검증한 existing draft release를 public release로 전환했다. Public metadata와 clean-room download checksum을 재검증했고, README 설치 안내를 v0.1.1 signed/notarized release 상태로 갱신했다.

## Public release verification

| 항목 | 결과 | 근거 |
|---|---|---|
| release URL | OK | `https://github.com/jinzer0/Prompter/releases/tag/v0.1.1` |
| draft status | OK | `isDraft=false` |
| prerelease status | OK | `isPrerelease=false` |
| tag | OK | `tagName=v0.1.1` |
| assets | OK | Public release contains `Prompter-0.1.1-mac-arm64.dmg`, `Prompter-0.1.1-mac-arm64.zip`, `SHA256SUMS`. |
| public download checksum | OK | Clean-room `gh release download v0.1.1` followed by `shasum -a 256 -c SHA256SUMS` passed for ZIP and DMG. |

## Public asset hashes

```text
f8830f2eb136be06351229f850348e0578301648444d23b4d90fe24734fb932f  Prompter-0.1.1-mac-arm64.zip
b9c63063084c547242dbbb1e23d4c273eb0ca16bcbf5ed964d9c548f025b8786  Prompter-0.1.1-mac-arm64.dmg
```

## README update

- Installation now points to `Prompter-0.1.1-mac-arm64.dmg`.
- Unsigned first-launch warning was replaced with signed/notarized/stapled status.
- Upgrade note says to re-enter the OpenAI key in Settings if key status does not carry over.
- Maintainer command description no longer says public installation remains on v0.1.0.

## Commands run

```bash
gh release edit v0.1.1 --draft=false --prerelease=false
gh release view v0.1.1 --json tagName,targetCommitish,isDraft,isPrerelease,assets,url
gh release download v0.1.1 --dir <temp-dir> --pattern Prompter-0.1.1-mac-arm64.dmg --pattern Prompter-0.1.1-mac-arm64.zip --pattern SHA256SUMS
shasum -a 256 -c SHA256SUMS
git diff --check
```

## 다음 경계

Final report PR must be pushed, merged, and then Issue #7 can be closed. Task worktree/branch cleanup follows merge verification.
