# Task #35 최종 보고서 — v0.1.2 macOS ARM64 서명·공증 및 공개 배포

GitHub Issue: [#35](https://github.com/jinzer0/Prompter/issues/35)
마일스톤: M012

## 작업 요약

- 대상 이슈: #35
- 마일스톤: M012
- 단계 수: Stage 1–4 및 공개 후 설치 안내/완료 기록·이슈 종료·근거 보존·브랜치/worktree 정리 완료.
- 작업 목적: 최신 macOS UX·테마 개선을 v0.1.2 ARM64 서명·공증 릴리스로 배포하기 위해 정확한 버전 계약과 검증된 로컬 후보를 준비했다.
- 작업지시자가 Stage 3 결과·최종 보고·PR 게시를 승인했고, “codex 리뷰 문제 없으면 merge진행해”에 따라 최신 head 리뷰 완료·지적 없음·bot +1 확인 후 PR #36을 merge했다. 이후 exact source/bytes와 미해소 위험을 제시하고 “Stage 4 공개 실행 승인”을 받아 공개했다.
- 작업 브랜치 `local/task35`, 전용 `Prompter-task35` worktree. 게시 브랜치는 `publish/task35`, PR base는 `master`다. 원본 master·사용자 BMAD·미추적 자료·기존 앱/DB를 보존한다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| package.json, package-lock.json | root 버전만 0.1.2 | dependency resolution/scripts/allowScripts 변경 없음 |
| scripts/macos/release-version-preflight.mjs, release-support.mjs | production signed gate가 정확히 0.1.2만 허용 | legacy alias/fallback 없음, trust 경계 보존 |
| tests/macos-release-contract.test.ts | production 버전 및 maintainer trust 안내 계약 | 배포 계약 회귀 |
| tests/package-macos-coordinator-{app-recovery,artifact-drift,boundaries,cached-accepted,dmg-app-refresh,dmg-recovery,final-receipts,signing-fingerprint-recovery,signing-target-recovery,success}.test.mjs | signed 경로/파일명과 실제 invalid 값·타입·무mutation 회귀 정합화 | 재개/소유권/rollback/Apple 경계 기존 의미 보존 |
| tests/support/macos-coordinator-fixtures.mjs, macos-coordinator-support.mjs, macos-package-fixtures.mjs | signed fixture 0.1.2 정합화 | 일반 packaging 0.1.1 예제 유지 |
| README.md, docs/release-macos.md, docs/qa-checklist.md | 기존 공식 위치의 준비/검증 안내 및 공개 후 설치 안내 갱신 | 최신 v0.1.2의 실제 공개 사실과 위험 명시 |
| mydocs/plans/task_m012_35{,_impl}.md | 승인된 수행/구현 계획 | 단계·문서 위치·source/공개 경계 |
| mydocs/working/task_m012_35_stage{1,2,3,4}.md | 준비 회귀·전체 gates·실제 Apple·사용자 QA 및 공개 검증 근거 | source/tag/asset/download bytes 구분 |
| mydocs/orders/20261006.md, 20261007.md, 20261008.md | 날짜별 승인·진행 기록 | 과거 기록 보존 |
| mydocs/report/task_m012_35_report.md | 최종 후보 보고에 공개 검증 결과 반영 | 공개 후 문서 commit과 immutable candidate source 구분 |

binary·receipts·runtime·스크린샷·agent state는 로컬 ignored 근거이며 Git에 포함하지 않는다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| README.md | 기존 루트 | README.md | OK | 공개 검증 후에만 설치 링크/버전 v0.1.2로 전환 |
| 릴리스 안내 | 기존 docs | docs/release-macos.md | OK | 수행/구현 계획의 기존 공식 위치 |
| QA 체크리스트 | 기존 docs | docs/qa-checklist.md | OK | 후보 버전/경로 정합화 |
| 계획/단계/최종 보고/오늘할일 | 기존 mydocs | plans/working/report/orders | OK | 승인된 내부 작업 문서 위치 |
| 공개 릴리스 노트 | GitHub Release 본문 | v0.1.2 Release 본문 | OK | 한국어 변경/설치/검증/위험 기록, 새 changelog 없음 |

`docs/plan/plan.md`는 수정하지 않았고 `docs/draft/`는 범위 밖이다.

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| production signed 허용 버전 | 정확히 0.1.1 | 정확히 0.1.2 |
| 전체 Vitest | #26 baseline 163파일·1182개 PASS | Stage 2 163파일·1201개 PASS |
| Electron smoke | #26 baseline 65개 PASS | fresh build 이후 65개 PASS |
| v0.1.2 로컬 후보 | 없음 | ZIP·DMG·SHA256SUMS 정확히 3파일 |
| 실제 공개 최신 | v0.1.1 | v0.1.2, latest API 확인 |

이전 결과는 이전 기준선 관측이며 현재 source의 테스트 수를 추정하지 않았다.

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| exact version 및 fail-closed 거절 | OK — focused 30파일·319개 PASS. invalid 값/타입/missing 및 build/외부 명령/candidate/evidence 무mutation 검증 |
| dependency/native 계약 보존 | OK — root version 외 package/lock JSON 변경 없음. 기존 native:node/native:electron만 사용 |
| 전체 통합 회귀 | OK — typecheck/lint(597파일)/Vitest 163파일·1201개 PASS |
| fresh build 후 전체 smoke | OK — build PASS 이후 Electron 65개 PASS |
| 실제 Apple 서명·공증 | OK — coordinator exit 0, app/DMG Accepted 및 issues 빈 배열 |
| artifact trust 및 설치 자동 QA | OK — strict signatures/staple/Gatekeeper/image/readonly mount/plist/checksum, ZIP/DMG 실제 packaged 앱의 DB·theme·copy/save/relaunch/close PASS |
| 사용자 OS 손동작 | OK — 격리 DMG 복사본 LaunchServices native 창 확인 후 “qa 완료 모두 정상” 회신. 자동 assertions와 분리 |
| Stage 4 공개·다운로드 검증 | OK — exact tag source/3 assets/크기·digest/latest API 및 실제 다운로드 checksum 검증 |

### 단계별 검증 결과

- [Stage 1](../working/task_m012_35_stage1.md), `8b2a66c`: exact gate/회귀/안내 정합화. 최초 focused 2실패는 설치 Electron.app 부재였고 기존 install/native 스크립트 후 동일 union PASS. 실패를 보존했다.
- [Stage 2](../working/task_m012_35_stage2.md), `55fc762`: 전체 gates PASS. 실제 검증 source는 `8b2a66cc0fb2e92a2762fb72264241becc0bf0bd`다.
- [Stage 3](../working/task_m012_35_stage3.md), `c67f358`: 실제 후보 source는 **`55fc76292693c5c6af72df61f9878611d6dfb135`**이며 Stage 2와 제품 tree 동일, 보고 commit과 구분한다. 최초 notary profile 부재 preflight 실패는 사용자 등록 후 복구했다. 직접 detached launch 종료를 LaunchServices 재실행/창 존재 확인으로 복구했다. 2026-10-08 사용자 QA 모두 정상 회신을 반영했다.
- 이번 보고/PR 준비는 문서만 변경하므로 제품 전체 gates를 중복 실행하지 않는다. 게시 직전 candidate checksum과 diff-check를 재검증한다.
- [Stage 4](../working/task_m012_35_stage4.md): 공개 승인 후 2026-10-08 14:11:07(+09:00) v0.1.2 게시. draft/prerelease false, latest v0.1.2, 3 assets 업로드/다운로드 검증 완료. 공개 후 문서 검증 결과는 Stage 4 보고에 기록한다.

### 후보 source 및 최종 artifact

공개 tag `v0.1.2`의 실제 source는 `55fc76292693c5c6af72df61f9878611d6dfb135`다. GitHub tag ref API의 commit SHA로 확인했다. PR #36 merge SHA는 `ea094c3e0b4d03e9b01e88e8b231a809da820cdb`이며 source가 master 이력에 포함된다. 이후 보고/설치 안내 commit은 tag/source와 별개다.

| 파일 | bytes | SHA-256 |
|---|---:|---|
| Prompter-0.1.2-mac-arm64.zip | 124235140 | 083b71c5e0491607d1cf320e77a604119e72c719359eabb46c79a03d3a3cd8d3 |
| Prompter-0.1.2-mac-arm64.dmg | 139707568 | d0281dd7073f91ea9848deda7ac9f2b9b3322fd25866ada0a962a20784d5809f |
| SHA256SUMS | 190 | 5c0c36383136672b6080b2e7d0a8676027efb67d294a92243ce91508a92fff5e |

로컬 위치: `release/v0.1.2/`. 실제 Apple submission IDs와 제출 전 artifact hashes, sanitized receipts 위치는 Stage 3 보고에 있다. 제출 bytes hash와 staple 후 최종 asset hash를 혼동하지 않는다. 게시 직전 checksum 재검증은 ZIP/DMG 모두 OK이며 SHA256SUMS 자체 hash도 위 표와 일치했다.

공개 URL: https://github.com/jinzer0/Prompter/releases/tag/v0.1.2 . latest API에서 파일명/수/size/digest/uploaded 상태 모두 일치했다. 별도 빈 임시 디렉터리로 세 파일을 실제 다운로드하여 ZIP·DMG checksum OK 및 SHA256SUMS 자체 hash 일치를 확인했다. 기존 릴리스/tag/assets는 변경하지 않았다.

## 잔여 위험과 후속 작업

### 잔여 위험

- 의존성 PR #29(Electron)/#30(undici)/#33(axios)은 사용자 결정에 따라 보류. 공개 승인 요청 전/실행 직전 API 재조회 모두 열린 Dependabot 알림 24건(Critical 1·High 10·Medium 9·Low 4)이었다. 과거 push 알림 15건과 구분하며 취약점 해소를 주장하지 않는다. Release notes와 README에서 알려진 위험을 안내한다.
- native compile·Biome deprecated info·esbuild/Vite bundle 크기 경고 유지, 억제 없음.
- quarantine 다운로드 첫 실행 시뮬레이션 미실행. 실제 Apple 검증/로컬 설치 QA/사용자 손동작 결과와 공개 다운로드 경험은 다르다.
- 최초 QA screenshots/runtime의 임시 디렉터리 소실 위험을 줄이기 위해 완료 정리 시 로컬 `_bmad-output/retained-task35`로 복사하고 원본/복사본 bytes를 검증했다. Git에는 포함하지 않는다. 장기 핵심 근거는 Stage 보고에 기록했다.
- 공개 전 README v0.1.1을 유지했고 실제 게시/다운로드 검증 후에만 v0.1.2로 갱신했다. 기존 v0.1.0/v0.1.1 tag/Release/assets 수정·교체 금지.

### 후속 작업 후보

- 별도 새 이슈 제안 없음. #35 완료. 의존성 위험 검토는 별도 후속 지시 대상이다.
- 보류된 dependency PR은 #35 이후 작업지시자의 지시에 따라 검토한다. 자동 재개하지 않는다.

## 작업지시자 승인 요청

- Stage 3 결과·PR 게시·PR #36 merge 및 Stage 4 공개는 각각 명시 승인 후 수행했다.
- 공개 후 문서 PR #39도 최신 head a385ae9의 Codex 리뷰 완료·지적 없음·bot +1을 확인한 후 별도 승인으로 merge했다. merge SHA `54c93b6fc2bb30cac565c9a8cb4a6a8cb1e12bb2`, 시각 2026-10-08 15:51:37 +09:00. 원격 checks는 빈 배열이며 CI PASS를 주장하지 않는다.
- 작업지시자가 “#35 완료 기록·이슈 종료·근거 보존 후 브랜치/worktree 정리”를 승인했다. 2026-10-08 21:53:10 +09:00 Issue #35 CLOSED 확인. 원격 publish/task35·로컬 local/task35 및 Prompter-task35 worktree 제거, master 복귀 확인. 기존 앱/사용자 DB/BMAD·타 작업 자료는 보존했다.

## 완료 근거 보존 및 검증

- 보존 위치: `_bmad-output/retained-task35/`(ignored/untracked 로컬 자료, 미커밋).
- `release/`, `.omo/`, `test-results/`, `packaged-qa/`를 복사했다. 후보 ZIP/DMG/SHA256SUMS, app/dmg sanitized receipts, smoke screenshots와 packaged 앱/QA user-data가 포함된다.
- 894개 일반 파일을 SHA-256으로 원본/복사본 일치 검증, symlink는 link target 일치 확인. `preservation-manifest.json`에 relative path/bytes/hash와 candidate source를 기록했다. 이후 owned task worktree만 제거했다.
- 보존한 ZIP/DMG `shasum -c SHA256SUMS` 모두 OK, SHA256SUMS 자체 hash `5c0c36383136672b6080b2e7d0a8676027efb67d294a92243ce91508a92fff5e` 일치. latest 공개 API의 tag/3 assets/digests도 승인된 공개 bytes와 같았다.
- 원본 master의 사용자 tracked 변경 없음 확인, 기존 미추적 BMAD/skills 자료 보존. 완료 기록은 제품/태그/assets와 별도의 사후 문서 commit이다. 전체 제품 tests는 문서만 변경하므로 반복하지 않고 diff-check로 검증한다.
