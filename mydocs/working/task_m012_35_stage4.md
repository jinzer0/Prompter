# Task #35 Stage 4 보고서 — v0.1.2 공개 배포 및 다운로드 검증

GitHub Issue: [#35](https://github.com/jinzer0/Prompter/issues/35)
구현계획서: [task_m012_35_impl.md](../plans/task_m012_35_impl.md)
Stage: 4

## 단계 목적

작업지시자에게 exact source SHA·ZIP/DMG/SHA256SUMS hashes·최신 미해소 위험을 제시한 뒤 “Stage 4 공개 실행 승인”을 받아 v0.1.2 macOS ARM64를 공개했다. 실제 배포 검증 뒤에만 README 설치 안내를 갱신했다. 최종 공개 후 문서 PR의 merge는 별도 승인 대기다.

PR #36은 Codex가 최신 head 6e4fe5f 리뷰 Completed, 지적 없음·bot +1 확인 후 작업지시자의 조건부 승인으로 merge됐다. merge SHA는 `ea094c3e0b4d03e9b01e88e8b231a809da820cdb`, 실제 후보 source `55fc76292693c5c6af72df61f9878611d6dfb135`는 master 이력에 포함된다. 후보 이후 제품 diff는 없고 보고 문서만 달랐다.

## 산출물

| 파일/산출물 | 변경 요약 |
|---|---|
| GitHub tag v0.1.2 | exact candidate source 55fc76292693c5c6af72df61f9878611d6dfb135 |
| GitHub Release v0.1.2 | 공개 latest, draft/prerelease false, 한국어 설치/변경/검증/알려진 위험 |
| Release ZIP·DMG·SHA256SUMS | 승인된 로컬 bytes 세 파일 업로드, 다운로드 checksum 확인 |
| README.md | 실제 최신 설치 파일/링크 v0.1.2 및 서명·공증 사실, 알려진 위험 링크 |
| docs/release-macos.md | 실제 공개 사실·source/보고 commit 구분, immutable 재실행 금지 안내 |
| mydocs/working/task_m012_35_stage4.md | 실제 게시 및 다운로드 검증 근거 |
| mydocs/report/task_m012_35_report.md | 후보 보고를 공개 검증 최종 결과로 갱신 |
| mydocs/orders/20261008.md | 승인·공개 성공·완료 기록 문서 PR 진행 상태 |

## 본문 변경 정도 / 본문 무손실 여부

제품/테스트/dependency 변경 없음. 공개 안내는 기존 승인된 README/docs 위치만 수정했다. 신규 공식 문서 루트/changelog는 만들지 않았다. QA 체크리스트는 실행 결과 장부가 아닌 절차이며 그대로 유지했고 실제 결과는 이 보고에 기록했다. Stage 1–3의 과거 실패·미실행·승인 기록은 보존했다. 기존 v0.1.0/v0.1.1 tag/Release/assets에는 mutation 명령을 실행하지 않았다.

## 검증 결과

실행 명령:

```bash
# source master 이력 포함/제품 동일성과 v0.1.2 tag/Release 부재 검사
# Dependabot open alerts API severity/count 재조회
# 로컬 최종 후보 checksum 및 SHA256SUMS hash 검사
gh release create v0.1.2 \
  release/v0.1.2/Prompter-0.1.2-mac-arm64.zip \
  release/v0.1.2/Prompter-0.1.2-mac-arm64.dmg \
  release/v0.1.2/SHA256SUMS \
  --target 55fc76292693c5c6af72df61f9878611d6dfb135 \
  --title 'Prompter v0.1.2 — macOS ARM64' \
  --notes-file /tmp/prompter-v0.1.2-release-notes.md --latest
# GitHub tag ref 및 releases/latest API 확인
# gh release download v0.1.2로 별도 빈 임시 디렉터리에 세 파일 다운로드
# 다운로드 디렉터리에서 shasum -a 256 -c SHA256SUMS 및 SHA256SUMS hash 확인
./node_modules/.bin/vitest run tests/macos-release-contract.test.ts
git diff --check
```

- 공개 시각: **2026-10-08 14:11:07 +09:00**, GitHub published_at `2026-10-08T05:11:07Z`를 변환했다.
- URL: https://github.com/jinzer0/Prompter/releases/tag/v0.1.2 . create exit 0.
- tag ref API는 `refs/tags/v0.1.2` object type commit 및 exact source `55fc76292693c5c6af72df61f9878611d6dfb135`를 반환했다. 보고/merge tip SHA로 태그를 만들지 않았다.
- latest API: tag_name v0.1.2, draft false, prerelease false. assets 정확히 세 개, 모두 uploaded. 이름/크기/digest가 승인된 후보와 일치했다.
- 별도 빈 디렉터리 `/var/folders/17/pstbgvvx179d3c10ln70s7g00000gn/T/prompter-task35-public.H19eBs1p1G`로 공개 assets를 실제 다운로드했다. ZIP·DMG `shasum -c` 모두 OK, SHA256SUMS 자체 hash도 후보와 일치했다. 다운로드 근거는 로컬 임시 파일이며 Git에 포함하지 않는다.
- 문서 갱신 후 release contract **1파일·2개 PASS**, diff-check PASS. 제품 코드 변경 없는 문서 작업이므로 전체 Vitest/build/smoke/native rebuild를 반복하지 않았다. Stage 2/3의 실제 제품 검증 근거를 유지한다.

| 공개 파일 | bytes | SHA-256 |
|---|---:|---|
| Prompter-0.1.2-mac-arm64.zip | 124235140 | 083b71c5e0491607d1cf320e77a604119e72c719359eabb46c79a03d3a3cd8d3 |
| Prompter-0.1.2-mac-arm64.dmg | 139707568 | d0281dd7073f91ea9848deda7ac9f2b9b3322fd25866ada0a962a20784d5809f |
| SHA256SUMS | 190 | 5c0c36383136672b6080b2e7d0a8676027efb67d294a92243ce91508a92fff5e |

실제 Apple 공증·staple·Gatekeeper/격리 packaged 앱/사용자 OS 손동작 근거는 [Stage 3](task_m012_35_stage3.md)에 있다. 이번 Stage는 이미 검증된 후보를 재빌드하지 않고 동일 bytes를 공개했다.

## 잔여 위험

- 공개 승인 요청 전 및 실행 직전 조회에서 열린 Dependabot 알림 **24건(Critical 1·High 10·Medium 9·Low 4)**. 과거 push의 15건 알림과 다른 API 관측이다. 저장소 alerts이지 최종 앱 전체 exploitability audit가 아니다. 위험 미해소를 Release notes 및 README 링크로 안내했다.
- dependency PR #29/#30/#33은 보류, native/Biome/bundle 경고 유지. 자동 remediation 없음.
- Finder 다운로드 quarantine 첫 실행 시뮬레이션 미실행. 실제 공개 download bytes checksum과 설치 OS 손동작은 별개 근거다.
- 최종 설치 안내·완료 기록의 문서 PR merge는 아직 수행하지 않았다. 공개 성공만으로 문서 master 반영/Issue close/cleanup 완료를 주장하지 않는다.

## 다음 단계 영향

- 공개 tag와 assets는 immutable로 유지한다. 이후 문서 commit/PR/merge는 candidate source/tag와 별개다.
- 공개 후 문서 PR review와 별도 merge 승인 후 master 동기화·#35 상태 기록/종료·필요 없는 작업 branch/worktree를 안전하게 정리한다. 로컬 후보/evidence는 정리 전에 저장 위치와 보존 필요를 확인한다.
- 의존성 PR 검토는 사용자 후속 지시까지 재개하지 않는다.

## 승인 요청

- Stage 4 공개 결과 및 최종 보고/설치 안내를 검토하고 공개 후 문서 PR merge와 #35 완료 정리를 승인한다.
