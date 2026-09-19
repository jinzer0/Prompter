# Prompter v0.1.1 서명 및 Notarization 공개 릴리스 수행계획서

GitHub Issue: [#7](https://github.com/jinzer0/Prompter/issues/7)
선행 구현 Issue: [#6](https://github.com/jinzer0/Prompter/issues/6)
마일스톤: M011

## 목적

병합된 `origin/master`의 Prompter v0.1.1 소스에서 ARM64 macOS 앱, ZIP, DMG를 Developer ID 서명, Apple Notarization, staple, Gatekeeper, checksum 검증까지 완료하고, 승인된 GitHub Release로 게시한다.

이 task는 Issue #6의 구현 PR이 병합된 뒤 시작하는 실제 릴리스 실행 경계다. Apple 및 GitHub release 서비스와 상호작용하는 단계는 비밀정보를 노출하지 않고 fail-closed로 수행한다.

## 배경

Issue #6 PR #8은 2026-09-19T08:19:32Z에 merge commit `b97b89b5adf4413371adb02a015580a863ff6331`로 `master`에 병합됐다. 구현 head `1816e96ef7f4ab907c550ac47d52a385f724fde4`는 `origin/master`에 포함되고 Issue #6은 종료됐다.

Issue #7은 `.omo/plans/apple-developer-id-notarization-release.md` Todos 9–14에 해당한다. 구현 이슈에서 만든 `npm run package:release:macos`, signing/notary 모듈, `docs/release-macos.md`, `docs/qa-checklist.md`를 실제 credentialed release flow에서 검증한다.

## 범위

### 포함

- `origin/master` exact merge commit에서 release worktree와 `local/task7` branch 시작
- release task 수행계획서, 구현계획서, 단계 보고서, 최종 보고서 작성
- host/branch/version/tag/release/Xcode/identity/Keychain/notary/GitHub/network preflight
- ARM64 app/ZIP/DMG signing, app 및 DMG 별도 Notarization, staple, Gatekeeper, mount/extract smoke 검증
- `v0.1.0`에서 `v0.1.1`로 isolated data 및 safeStorage 호환성 검증
- immutable `v0.1.1` tag, non-public draft release, allowlisted assets clean-room 검증
- 명시적 publication approval 이후 release 공개, README 설치 안내 갱신, 최종 보고 PR, issue/branch/worktree cleanup

### 제외

- Issue #6 구현 변경 재개 또는 pipeline code 구조 변경
- x64/universal, PKG, MAS, auto-update, CI release
- 승인 없는 tag/release rewrite, draft 공개, force push, asset clobber
- Apple credential, private key, notary profile content, OpenAI API key, real user data 저장 또는 출력
- `docs/plan`, `docs/draft`, `.omo` 계획 체크박스 수정

## 설계 방향

- release worktree는 `origin/master` exact merge commit에서 시작하고, dirty/diverged state에서는 중단한다.
- credential names만 입력으로 사용한다: `PROMPTER_SIGNING_IDENTITY`, `PROMPTER_NOTARY_PROFILE`.
- app submission ZIP은 최종 asset이 아니며, final public asset은 `Prompter-0.1.1-mac-arm64.zip`, `Prompter-0.1.1-mac-arm64.dmg`, `SHA256SUMS`만 허용한다.
- Notarization timeout/unknown은 같은 bytes를 자동 재제출하지 않고 retained evidence로 resume한다.
- README의 signed/notarized 설치 안내는 실제 public release 검증 뒤에만 갱신한다.
- safeStorage continuity가 실패하면 자동 migration을 만들지 않고 승인된 key re-entry 안내로 문서화한다.

## 문서 위치 판단

| 파일 | 분류 | 대상 독자 | 선택 위치 | 대안 위치 | 선택 이유 |
|---|---|---|---|---|---|
| `README.md` | 공식 사용자 설치 문서 | 사용자/기여자 | 저장소 루트 | `docs/` | 기존 설치 안내 진실 원천이며 공개 release 후 signed/notarized install path를 반영해야 한다. |
| `mydocs/plans/task_m011_7.md`, `mydocs/plans/task_m011_7_impl.md` | 작업 계획 | 내부 작업자 | `mydocs/plans/` | `docs/` | Hyper-Waterfall 승인과 복원용 내부 산출물이다. |
| `mydocs/working/task_m011_7_stage{N}.md` | 단계 보고 | 내부 작업자 | `mydocs/working/` | `docs/` | 단계별 증거 보존용 산출물이다. |
| `mydocs/report/task_m011_7_report.md` | 최종 보고 | 내부 작업자/유지관리자 | `mydocs/report/` | `docs/` | task 완료 증거와 release receipt를 보존한다. |

`docs/release-macos.md`와 `docs/qa-checklist.md`는 이번 task의 운영 근거로 사용한다. 새 운영 정책이 발견되지 않으면 수정하지 않는다. `docs/plan`과 `docs/draft`는 읽기 전용이다.

## 예상 변경 파일

신규:

- `mydocs/orders/20260919.md`
- `mydocs/plans/task_m011_7.md`
- `mydocs/plans/task_m011_7_impl.md`
- `mydocs/working/task_m011_7_stage1.md`
- `mydocs/working/task_m011_7_stage2.md`
- `mydocs/working/task_m011_7_stage3.md`
- `mydocs/working/task_m011_7_stage4.md`
- `mydocs/working/task_m011_7_stage5.md`
- `mydocs/report/task_m011_7_report.md`

수정:

- `README.md` (public release 검증 및 publication approval 후)
- `mydocs/orders/20260919.md`

커밋되지 않는 산출물:

- `release/v0.1.1/**`
- local ignored notary/signing evidence
- downloaded/mounted/extracted QA temp artifacts

## 잠정 단계

- **Stage 1 — release worktree와 secret-safe preflight**
  - `local/task7`을 `origin/master` exact merge commit에서 시작하고 task 문서를 커밋한다.
  - host, branch, version, tag/release 부재, GitHub auth, Xcode, signing identity, Keychain, notary profile preflight를 redacted evidence로 검증한다.
- **Stage 2 — app/ZIP signing과 Notarization**
  - offline gates를 재실행하고 app phase를 수행해 final ZIP을 만들고 extracted app까지 검증한다.
- **Stage 3 — DMG signing, Notarization, mount 검증과 checksum**
  - stapled app에서 DMG를 만들고 separate notary/staple/mount/smoke/checksum을 완료한다.
- **Stage 4 — v0.1.0 upgrade와 draft release 검증**
  - isolated user data로 upgrade/safeStorage 결과를 분류하고 non-public draft release와 clean-room download를 검증한다.
- **Stage 5 — publication approval, public release, README와 최종 보고**
  - publication approval 뒤 draft를 공개하고 API/download/hash 검증, README 갱신, report PR/merge/cleanup을 완료한다.

## 검증 계획

### 단계별 검증

- Stage 1
  - `git rev-parse HEAD`, `git rev-parse origin/master`, `git status --short --branch`
  - `node -p "require('./package.json').version"`
  - `git ls-remote --tags origin v0.1.1`, `gh release view v0.1.1`
  - Xcode, identity, Keychain, notary profile, `gh auth status` redacted checks
- Stage 2
  - focused tests, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`
  - `npm run package:release:macos` app/ZIP phase evidence
  - codesign/stapler/spctl/extract/smoke checks
- Stage 3
  - hdiutil verify, DMG codesign/notary/staple, mounted app signature/ticket/Gatekeeper/smoke
  - `shasum -a 256 -c SHA256SUMS`
- Stage 4
  - v0.1.0 published checksum verification
  - isolated upgrade smoke and safeStorage status classification
  - `gh release view` draft metadata and clean-room asset download checksum
- Stage 5
  - public release API metadata, clean-room download checksum, README truthfulness, final report PR merge, branch/worktree cleanup

### 통합 검증

- `v0.1.1` tag and public release point at the expected merged SHA.
- Public assets are exactly DMG, ZIP, and `SHA256SUMS`.
- Every final asset passes signature, notary, staple, Gatekeeper, smoke, and checksum checks.
- No secret or real user data appears in git, logs, release assets, or docs.
- `git diff --check` passes before each commit/PR boundary.

## 리스크

- **Apple credential absence or locked Keychain**: Stage 1 records a human-only blocker and stops before artifact mutation.
- **Notarization warning/rejection/timeout**: warning/rejection blocks downstream steps; timeout is resumed with retained evidence and no automatic resubmission.
- **Irreversible tag/release mutation**: tag/draft/publication require explicit approval and exact allowlist checks.
- **safeStorage discontinuity**: if isolated test proves key re-entry is required, document the re-entry path instead of building migration.

## 승인 요청 사항

- Issue #7을 `local/task7`에서 시작하고, 위 Stage 1–5 경계로 실제 release execution을 진행한다.
- README는 public release verification 뒤 signed/notarized install 안내를 반영한다.
- Apple/GitHub publication 단계는 각 Stage evidence와 publication approval 조건을 만족할 때만 진행한다.
