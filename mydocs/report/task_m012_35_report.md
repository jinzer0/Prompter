# Task #35 최종 보고서 — v0.1.2 macOS ARM64 후보 검증 및 구현 PR

GitHub Issue: [#35](https://github.com/jinzer0/Prompter/issues/35)
마일스톤: M012

## 작업 요약

- 대상 이슈: #35
- 마일스톤: M012
- 단계 수: 계획 4단계 중 Stage 1–3 완료. **Stage 4 공개 배포는 미실행**이며 이 문서는 구현 PR 게시 시점의 후보 검증 최종 보고다. 전체 이슈 완료 보고로 혼동하지 않는다.
- 작업 목적: 최신 macOS UX·테마 개선을 v0.1.2 ARM64 서명·공증 릴리스로 배포하기 위해 정확한 버전 계약과 검증된 로컬 후보를 준비했다.
- 작업지시자가 “Stage 3 결과 승인 및 최종 보고 작성·PR 게시 진행 승인”으로 Stage 3 결과와 이 보고 작성 및 Open PR 게시를 승인했다. PR merge·tag/Release/assets 공개 승인은 포함하지 않는다.
- 작업 브랜치 `local/task35`, 전용 `Prompter-task35` worktree. 게시 브랜치는 `publish/task35`, PR base는 `master`다. 원본 master·사용자 BMAD·미추적 자료·기존 앱/DB를 보존한다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| package.json, package-lock.json | root 버전만 0.1.2 | dependency resolution/scripts/allowScripts 변경 없음 |
| scripts/macos/release-version-preflight.mjs, release-support.mjs | production signed gate가 정확히 0.1.2만 허용 | legacy alias/fallback 없음, trust 경계 보존 |
| tests/macos-release-contract.test.ts | production 버전 및 maintainer trust 안내 계약 | 배포 계약 회귀 |
| tests/package-macos-coordinator-{app-recovery,artifact-drift,boundaries,cached-accepted,dmg-app-refresh,dmg-recovery,final-receipts,signing-fingerprint-recovery,signing-target-recovery,success}.test.mjs | signed 경로/파일명과 실제 invalid 값·타입·무mutation 회귀 정합화 | 재개/소유권/rollback/Apple 경계 기존 의미 보존 |
| tests/support/macos-coordinator-fixtures.mjs, macos-coordinator-support.mjs, macos-package-fixtures.mjs | signed fixture 0.1.2 정합화 | 일반 packaging 0.1.1 예제 유지 |
| README.md, docs/release-macos.md, docs/qa-checklist.md | 기존 공식 위치의 준비/검증 안내만 갱신 | 공개 다운로드 최신 v0.1.1 유지 |
| mydocs/plans/task_m012_35{,_impl}.md | 승인된 수행/구현 계획 | 단계·문서 위치·source/공개 경계 |
| mydocs/working/task_m012_35_stage{1,2,3}.md | 준비 회귀·전체 gates·실제 Apple 및 사용자 QA 근거 | synthetic/자동 Electron/실제 Apple/사용자 손동작 구분 |
| mydocs/orders/20261006.md, 20261007.md, 20261008.md | 날짜별 승인·진행 기록 | 과거 기록 보존 |
| mydocs/report/task_m012_35_report.md | 구현 PR 시점의 최종 후보 보고 | Stage 4 후 공개 검증 결과로 갱신 예정 |

binary·receipts·runtime·스크린샷·agent state는 로컬 ignored 근거이며 Git에 포함하지 않는다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| README.md | 기존 루트 | README.md | OK | maintainer 준비 문구만 0.1.2, 공개 설치 v0.1.1 |
| 릴리스 안내 | 기존 docs | docs/release-macos.md | OK | 수행/구현 계획의 기존 공식 위치 |
| QA 체크리스트 | 기존 docs | docs/qa-checklist.md | OK | 후보 버전/경로 정합화 |
| 계획/단계/최종 보고/오늘할일 | 기존 mydocs | plans/working/report/orders | OK | 승인된 내부 작업 문서 위치 |
| 공개 릴리스 노트 | GitHub Release 본문 | 미생성 | 공개 승인 대기 | 신규 changelog/공식 문서 루트 없음 |

`docs/plan/plan.md`는 수정하지 않았고 `docs/draft/`는 범위 밖이다.

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| production signed 허용 버전 | 정확히 0.1.1 | 정확히 0.1.2 |
| 전체 Vitest | #26 baseline 163파일·1182개 PASS | Stage 2 163파일·1201개 PASS |
| Electron smoke | #26 baseline 65개 PASS | fresh build 이후 65개 PASS |
| v0.1.2 로컬 후보 | 없음 | ZIP·DMG·SHA256SUMS 정확히 3파일 |
| 실제 공개 최신 | v0.1.1 | v0.1.1 유지(공개 승인 대기) |

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
| Stage 4 공개·다운로드 검증 | 미실행 — 별도 공개 승인 필요. 이슈 종료 조건은 아직 충족하지 않음 |

### 단계별 검증 결과

- [Stage 1](../working/task_m012_35_stage1.md), `8b2a66c`: exact gate/회귀/안내 정합화. 최초 focused 2실패는 설치 Electron.app 부재였고 기존 install/native 스크립트 후 동일 union PASS. 실패를 보존했다.
- [Stage 2](../working/task_m012_35_stage2.md), `55fc762`: 전체 gates PASS. 실제 검증 source는 `8b2a66cc0fb2e92a2762fb72264241becc0bf0bd`다.
- [Stage 3](../working/task_m012_35_stage3.md), `c67f358`: 실제 후보 source는 **`55fc76292693c5c6af72df61f9878611d6dfb135`**이며 Stage 2와 제품 tree 동일, 보고 commit과 구분한다. 최초 notary profile 부재 preflight 실패는 사용자 등록 후 복구했다. 직접 detached launch 종료를 LaunchServices 재실행/창 존재 확인으로 복구했다. 2026-10-08 사용자 QA 모두 정상 회신을 반영했다.
- 이번 보고/PR 준비는 문서만 변경하므로 제품 전체 gates를 중복 실행하지 않는다. 게시 직전 candidate checksum과 diff-check를 재검증한다.

### 후보 source 및 최종 artifact

승인 대상 공개 tag의 향후 정확한 source는 `55fc76292693c5c6af72df61f9878611d6dfb135`다. 실제 tag는 아직 생성하지 않았다. PR head/report/merge SHA로 이를 대신하지 않는다. 병합 방식은 이 후보 source가 master 이력에 포함되는지를 보장해야 하며 squash/rebase 후 존재하지 않는 source를 검토·병합됐다고 주장하지 않는다.

| 파일 | bytes | SHA-256 |
|---|---:|---|
| Prompter-0.1.2-mac-arm64.zip | 124235140 | 083b71c5e0491607d1cf320e77a604119e72c719359eabb46c79a03d3a3cd8d3 |
| Prompter-0.1.2-mac-arm64.dmg | 139707568 | d0281dd7073f91ea9848deda7ac9f2b9b3322fd25866ada0a962a20784d5809f |
| SHA256SUMS | 190 | 5c0c36383136672b6080b2e7d0a8676027efb67d294a92243ce91508a92fff5e |

로컬 위치: `release/v0.1.2/`. 실제 Apple submission IDs와 제출 전 artifact hashes, sanitized receipts 위치는 Stage 3 보고에 있다. 제출 bytes hash와 staple 후 최종 asset hash를 혼동하지 않는다. 게시 직전 checksum 재검증은 ZIP/DMG 모두 OK이며 SHA256SUMS 자체 hash도 위 표와 일치했다.

## 잔여 위험과 후속 작업

### 잔여 위험

- 의존성 PR #29(Electron)/#30(undici)/#33(axios)은 사용자 결정에 따라 보류. 취약점 해소를 주장하지 않는다. 과거 GitHub 수치를 현재값으로 재사용하지 않고 공개 직전 실제 위험을 재조회해 공개 승인 요청에 제시한다.
- native compile·Biome deprecated info·esbuild/Vite bundle 크기 경고 유지, 억제 없음.
- quarantine 다운로드 첫 실행 시뮬레이션 미실행. 실제 Apple 검증/로컬 설치 QA/사용자 손동작 결과와 공개 다운로드 경험은 다르다.
- 로컬 QA screenshots/runtime는 임시 디렉터리이며 OS cleanup으로 소실될 수 있다. 장기 핵심 근거는 Stage 보고에 기록했다.
- 공개 전 README는 실제 최신 v0.1.1 유지. 기존 v0.1.0/v0.1.1 tag/Release/assets 수정·교체 금지.

### 후속 작업 후보

- 별도 새 이슈 제안 없음. 남은 작업은 같은 #35의 PR review/승인된 merge와 Stage 4 별도 공개 승인·실제 게시·다운로드 checksum·안내 갱신·완료 정리다.
- 보류된 dependency PR은 #35 이후 작업지시자의 지시에 따라 검토한다. 자동 재개하지 않는다.

## 작업지시자 승인 요청

- Stage 3 결과 및 이 최종 후보 보고 작성·Open PR 게시 진행은 이번 사용자 지시로 승인됐다. 구현 PR을 게시하되 **merge는 별도 승인 대기**다.
- 실제 공개는 후보 source SHA·최종 세 파일·checksums·최신 dependency 위험을 제시한 **Stage 4 별도 승인** 전까지 실행하지 않는다.
- #35 전체 완료·이슈 close·브랜치/worktree 정리는 실제 공개 확인과 승인 범위 충족 이후다.
