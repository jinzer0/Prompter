# Prompter v0.1.1 서명 릴리스 구현계획서

수행계획서: [`task_m011_7.md`](task_m011_7.md)
GitHub Issue: [#7](https://github.com/jinzer0/Prompter/issues/7)
마일스톤: M011

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | release worktree와 secret-safe preflight | task 문서, preflight report | branch/version/tag/release/Xcode/identity/Keychain/notary/GitHub checks |
| 2 | app/ZIP signing과 Notarization | signed/stapled app, final ZIP evidence | offline gates, codesign, notary log, stapler, spctl, extracted smoke |
| 3 | DMG signing, Notarization, mount 검증과 checksum | final DMG, SHA256SUMS evidence | hdiutil, DMG notary/staple, mounted app, smoke, checksum |
| 4 | upgrade와 draft release 검증 | upgrade result, non-public draft release | v0.1.0 checksum, isolated migration, draft asset clean-room verification |
| 5 | publication, README, report, cleanup | public release, README, final report PR | GitHub API, clean-room download, report PR merge, branch/worktree cleanup |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| `README.md` | 저장소 루트 | `README.md` | OK | Stage 5에서 public release 후 수정한다. |
| task 계획/보고 문서 | `mydocs/` | `mydocs/plans`, `mydocs/working`, `mydocs/report` | OK | 내부 task 산출물이다. |

## Stage 1 — release worktree와 secret-safe preflight

### 산출물

신규:

- `mydocs/orders/20260919.md`
- `mydocs/plans/task_m011_7.md`
- `mydocs/plans/task_m011_7_impl.md`
- `mydocs/working/task_m011_7_stage1.md`

### 변경 내용

- `local/task7` worktree가 `origin/master`와 같은 commit인지 확인한다.
- package version `0.1.1`, Issue #6 merge/closure, Issue #7 open/M011 상태를 기록한다.
- local/remote `v0.1.1` tag와 GitHub release가 없는지 확인한다.
- full Xcode, Apple signing identity, private key, unlocked Keychain, `PROMPTER_NOTARY_PROFILE`, GitHub auth, network reachability를 redacted output으로 확인한다.
- credential 값, Apple ID, key path/content, full environment dump는 기록하지 않는다.

### 검증

```bash
git rev-parse HEAD
git rev-parse origin/master
git status --short --branch
node -p "require('./package.json').version"
git tag --list v0.1.1
git ls-remote --tags origin v0.1.1
gh release view v0.1.1
xcode-select -p
xcrun --find codesign
xcrun --find notarytool
gh auth status -h github.com
npm run package:release:macos # only as fail-closed check when required credentials are absent
git diff --check
```

### 커밋

```text
Task #7: 수행 계획서 작성과 오늘할일 갱신
```

## Stage 2 — app/ZIP signing과 Notarization

### 산출물

- `mydocs/working/task_m011_7_stage2.md`
- ignored local release/evidence files under the release coordinator's configured directories

### 변경 내용

- focused tests, full offline gates, build를 재실행한다.
- `npm run package:release:macos` app phase로 app signing, app notary Accepted/log, staple validation, final ZIP 생성, extracted app 검증을 완료한다.
- final ZIP 이외의 submission ZIP은 release asset으로 남기지 않는다.

### 검증

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run package:release:macos
codesign --verify --deep --strict --verbose=4 <app>
xcrun stapler validate <app>
spctl --assess --type execute --verbose=4 <app>
git diff --check
```

### 커밋

```text
Task #7 Stage 1: v0.1.1 앱 서명과 Notarization 검증 완료
```

## Stage 3 — DMG signing, Notarization, mount 검증과 checksum

### 산출물

- `mydocs/working/task_m011_7_stage3.md`
- final local assets: `Prompter-0.1.1-mac-arm64.zip`, `Prompter-0.1.1-mac-arm64.dmg`, `SHA256SUMS` (ignored)

### 변경 내용

- stapled app에서 DMG를 생성하고 `hdiutil verify`, Developer ID signing, separate DMG Notarization, staple validation을 완료한다.
- read-only mount 후 contained app signature/ticket/Gatekeeper/smoke를 검증한다.
- 모든 byte mutation 이후에만 checksum을 생성한다.

### 검증

```bash
hdiutil verify <dmg>
codesign --verify --verbose=4 <dmg>
xcrun stapler validate <dmg>
spctl --assess --type open --verbose=4 <dmg>
shasum -a 256 -c SHA256SUMS
git diff --check
```

### 커밋

```text
Task #7 Stage 2: v0.1.1 DMG Notarization과 최종 무결성 검증 완료
```

## Stage 4 — upgrade와 draft release 검증

### 산출물

- `mydocs/working/task_m011_7_stage4.md`
- non-public GitHub draft release and local clean-room verification evidence

### 변경 내용

- published v0.1.0 unsigned DMG checksum을 검증한 뒤 isolated user data에서 synthetic project/prompt/API-key sentinel을 만든다.
- final signed v0.1.1 app으로 같은 isolated data를 열어 data preservation과 safeStorage outcome을 분류한다.
- release notes를 준비하고 explicit approval 뒤 immutable `v0.1.1` tag와 non-public draft release를 생성한다.
- draft assets exactly three allowlisted names and hashes를 clean-room download로 검증한다.

### 검증

```bash
gh release view v0.1.0
shasum -a 256 <downloaded-v0.1.0-dmg>
gh release view v0.1.1 --json tagName,targetCommitish,isDraft,isPrerelease,assets
shasum -a 256 -c SHA256SUMS
git diff --check
```

### 커밋

```text
Task #7 Stage 3: v0.1.0 업그레이드와 Draft Release 검증 완료
```

## Stage 5 — publication, README, report, cleanup

### 산출물

- `README.md`
- `mydocs/working/task_m011_7_stage5.md`
- `mydocs/report/task_m011_7_report.md`

### 변경 내용

- sanitized publication evidence를 제시하고 explicit approval 뒤 existing draft release를 공개한다.
- public release metadata, assets, clean-room download hash를 검증한다.
- README 설치 안내를 signed/notarized v0.1.1로 갱신하고 safeStorage re-entry notice가 필요한 경우만 반영한다.
- final report PR을 만들고 merge 후 Issue #7 close, branch/worktree cleanup을 완료한다.

### 검증

```bash
gh release view v0.1.1 --json tagName,targetCommitish,isDraft,isPrerelease,assets
shasum -a 256 -c SHA256SUMS
npm run typecheck
npm run lint
git diff --check
```

### 커밋

```text
Task #7 Stage 5 + 최종 보고서: v0.1.1 서명 배포 완료
```

## 검증

- 각 Stage report는 실행한 command와 redacted result만 기록한다.
- Apple credential, key path/content, profile secret, real user data는 어떤 산출물에도 기록하지 않는다.
- 실패한 검증은 단계 완료로 처리하지 않는다.
- public release 전에는 README를 signed install 상태로 바꾸지 않는다.

## 커밋

- Stage 1 task 문서 commit은 `Task #7: 수행 계획서 작성과 오늘할일 갱신`으로 작성한다.
- 이후 단계 커밋은 `Task #7 Stage {N}: ...` 또는 final report 규칙을 따른다.
- ignored binary/release evidence는 커밋하지 않는다.

## 단계 의존성

- Stage 2는 Stage 1 preflight가 통과하거나 human-only blocker가 해소된 뒤 진행한다.
- Stage 3은 Stage 2 final ZIP 검증 뒤 진행한다.
- Stage 4 draft release는 Stage 3 final assets 이후 진행한다.
- Stage 5 public release는 Stage 4 draft verification과 publication approval 이후 진행한다.

## 위험과 대응

- **Credential blocker**: missing/expired identity, locked Keychain, invalid profile은 human-only blocker로 기록하고 candidate mutation 전에 중단한다.
- **Apple service ambiguity**: unknown/timeout은 retained evidence resume만 허용하고 자동 재제출하지 않는다.
- **Release immutability**: tag/release는 rewrite/delete 없이 approval gate와 exact asset allowlist로만 진행한다.
- **Upgrade variance**: safeStorage key continuity failure는 migration 구현 대신 release note/README re-entry 안내로 처리한다.

## 승인 요청 사항

- 작업지시자의 “모두 승인하니 진행해” 지시에 따라 Stage 1 preflight까지 즉시 진행한다.
- Stage 2 이후 credentialed mutation, Stage 4 tag/draft, Stage 5 publication은 각 Stage gate와 approval receipt를 남긴 뒤 진행한다.
