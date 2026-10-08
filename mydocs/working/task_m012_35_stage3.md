# Task #35 Stage 3 보고서 — 실제 서명·공증 및 격리 설치 검증

GitHub Issue: [#35](https://github.com/jinzer0/Prompter/issues/35)
구현계획서: [task_m012_35_impl.md](../plans/task_m012_35_impl.md)
Stage: 3 — 자동 검증 및 사용자 OS 손동작 QA 완료

## 단계 목적

작업지시자의 “승인 stage3승인”에 따라 실제 Developer ID 서명·Apple 공증·격리 설치 QA를 실행했다. 처음 notary profile 부재로 중단된 뒤 작업지시자의 “등록완료”에 따라 재개했다. 공개 게시 승인은 포함하지 않는다.

후보 source commit은 `55fc76292693c5c6af72df61f9878611d6dfb135`다. 실행 전 `local/task35`는 clean이었고 Stage 2 검증 SHA `8b2a66cc0fb2e92a2762fb72264241becc0bf0bd`와의 diff는 Stage 2 보고와 오늘할일 두 문서뿐이다. 제품 tree는 같다. 이후 보고 커밋이나 merge SHA를 후보 source/tag 대상으로 대신 사용하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| release/v0.1.2/Prompter-0.1.2-mac-arm64.zip | 실제 서명·공증·staple된 앱의 최종 ZIP, ignored 로컬 후보 |
| release/v0.1.2/Prompter-0.1.2-mac-arm64.dmg | 실제 서명·공증·staple된 최종 DMG, ignored 로컬 후보 |
| release/v0.1.2/SHA256SUMS | 최종 ZIP·DMG checksum, ignored 로컬 후보 |
| .omo/evidence/release-macos/v0.1.2/{app,dmg}/notarization-final.json | 각 Apple Accepted 및 issues 빈 배열의 sanitized receipt, ignored 로컬 evidence |
| mydocs/working/task_m012_35_stage3.md | 실제 후보·검증·실패 복구·사용자 수동 QA 회신 기록 |
| mydocs/orders/20261008.md | Stage 3 완료 및 결과 승인 대기 상태 |

## 본문 변경 정도 / 본문 무손실 여부

제품 코드·dependency·테스트·공식 문서 변경 없음. 기존 앱/사용자 DB/Applications를 덮어쓰지 않았다. 기존 Stage 1/2 기록을 보존했다. signing identity/profile의 실제 값·개인 키·raw 인증 출력은 문서/출력/evidence에 남기지 않았다. local 후보/receipts/runtime/스크린샷은 커밋하지 않는다.

## 검증 결과

실행일: 2026-10-08, Asia/Seoul(+09:00). darwin arm64, Node 24.15.0, Electron dependency/native target 43.0.0, full Xcode 27.0(Build 27A266a).

실행 명령 및 검사:

```bash
git status --short
git rev-parse HEAD
git diff 8b2a66cc0fb2e92a2762fb72264241becc0bf0bd HEAD --name-only
# 입력 존재와 인증은 출력 비노출 방식으로만 검사
npm run package:release:macos
# 기존 validateFinalNotarizationEvidence로 app/dmg receipts 검사
# ZIP ditto 추출; DMG hdiutil verify/readonly mount/ditto 복사/detach
# codesign --verify [--deep] --strict / stapler validate / spctl assessment
# plutil JSON으로 bundle identity/version 검사
# 각 복사본의 실제 Contents/MacOS/Prompter를 Playwright Electron으로 실행
# 각기 다른 PROMPTER_USER_DATA_DIR로 DB·테마·본문 복사/저장·재시작/종료 검사
# release/v0.1.2에서 shasum -a 256 -c SHA256SUMS
```

- 최초 release 실행은 build PASS 후 coordinator preflight FAIL(exit 1). 출력은 일반 실패 문구만 남겼다. 비노출 진단에서 Keychain·지정 identity 유일성은 PASS, notary connectivity는 `MISSING_KEYCHAIN_PROFILE`였다. 후보/evidence 디렉터리가 없고 source clean임을 확인했다. 이 시점에는 실제 서명/제출을 하지 않았다.
- 사용자 profile 등록 완료 후 `notarytool history` 비노출 점검 PASS. 같은 source SHA와 후보/evidence 부재를 재확인 후 동일 release 명령 재실행: **PASS, exit 0**. 기존 coordinator가 서명·각 제출의 Accepted/log 검증·staple·Gatekeeper·archive/mount 검증·checksum 생성까지 완료했다. 이전 제출 상태가 없는 실패였으므로 artifact-bound 재개 또는 중복 제출을 하지 않았다.
- 실제 Apple app 제출: `7d36b364-16f8-47df-a22f-41483754753f`, Accepted, issues `[]`. app receipt hash `eb370fe712c2e26a0de669d60da922b854aafae1c77e9b5215612dd3a6862d2b`는 제출용 임시 ZIP의 hash이며 아래 최종 staple된 ZIP hash와 구분한다.
- 실제 Apple DMG 제출: `124ee84c-c41e-4fec-a7ad-e070380b7345`, Accepted, issues `[]`. 제출 artifact hash `f54fd2f24ac79f155663099afb29e7f5ab3a3b6a7d01e5fad105500f00621e3a`는 staple 전 제출 bytes이며 최종 DMG hash와 구분한다.
- 후보 allowlist 정확히 세 파일, app/dmg receipt 검증 PASS.
- ZIP 추출본 및 DMG readonly mount에서 복사한 앱 각각: strict/deep signature·stapled ticket·Gatekeeper execute PASS. DMG image verify·strict signature·stapled ticket·Gatekeeper open PASS, mount/detach PASS.
- 양 앱 plist: `com.jinzer0.prompter`, short version/build version 모두 `0.1.2` PASS.
- **실제 packaged app 자동 QA**: ZIP/DMG 복사본 각각 Library 실행, `app.getPath("userData")`로 임시 경로 일치 확인, 임시 DB 프로젝트/프롬프트 생성, light/dark HTML theme와 Electron nativeTheme 확인, 본문 공백 보존 복사, Cmd+S 저장, 종료·재실행 후 본문/테마 영속성 PASS. clipboard는 테스트 전 값으로 복원했다. 실제 사용자 DB나 OpenAI 호출은 사용하지 않았다.
- 초기 dark 전환 직후 스크린샷은 일부 control이 이전 색으로 남은 중간 frame을 포착했다. 이를 최종 visual PASS로 삼지 않았다. dark 재실행/2 animation frames 이후 본문 computed color `rgb(247, 248, 248)`, background `rgb(20, 21, 22)`, color-scheme dark 확인 및 settled screenshot 재확인. 이후 사용자 손동작 QA에서 모두 정상 회신을 받았다.
- 수동 QA 앱의 직접 detached spawn 시도는 프로세스가 종료되어 창이 나타나지 않았다. 최초 안내에서 창을 확인하지 않은 한계를 보존한다. 사용자의 지적 후 `/usr/bin/open -n --env PROMPTER_USER_DATA_DIR=…`로 동일 격리 DMG 복사본을 LaunchServices 실행했고, System Events에서 PID 65076의 native 창 1개 존재와 frontmost를 확인했다. 기존 사용자 DB를 사용하지 않았다.
- **사용자 OS 손동작 QA**: 테마 전환·편집·복사·새 버전 저장·빨간 닫기 버튼의 취소/초안 보존·저장 후 종료 확인을 요청했다. 작업지시자가 2026-10-08 09:36(+09:00, 대화 표시 시각)에 “qa 완료 모두 정상”으로 회신했다. 사용자 관찰 근거로 기록하며 자동 assertion 또는 개별 항목별 별도 로그를 얻었다고 주장하지 않는다.
- 최종 checksum 재검증 ZIP/DMG 모두 OK. source는 자동 QA 이후에도 동일 SHA/clean이었다(보고 문서 작성 전).
- 사용자 QA 회신 후 ZIP/DMG checksum 재검증도 모두 OK다. 수동 QA는 추출·복사본에서 수행했으며 최종 후보 bytes를 변경하지 않았다.
- 기존 Electron native compile 경고·esbuild main 1.5 MB 표시·Vite 500 kB 초과 경고 유지. 경고 억제나 dependency remediation 없음.

### 최종 후보 bytes

| 파일 | bytes | SHA-256 |
|---|---:|---|
| Prompter-0.1.2-mac-arm64.zip | 124235140 | 083b71c5e0491607d1cf320e77a604119e72c719359eabb46c79a03d3a3cd8d3 |
| Prompter-0.1.2-mac-arm64.dmg | 139707568 | d0281dd7073f91ea9848deda7ac9f2b9b3322fd25866ada0a962a20784d5809f |
| SHA256SUMS | 190 | 5c0c36383136672b6080b2e7d0a8676027efb67d294a92243ce91508a92fff5e |

로컬 QA 근거는 `/var/folders/17/pstbgvvx179d3c10ln70s7g00000gn/T/prompter-task35-qa-zCs3dB`에 보존했다. `qa-summary.json`, `behavior-summary.json`, 초기/테마 스크린샷 및 `zip-dark-settled.png`, ZIP/DMG 복사본과 임시 user-data가 있다. 이 임시 경로는 재부팅/OS cleanup 이후 소실될 수 있다. 세션 release 출력은 `artifact://26`(raw)/`artifact://27`이며 영구 저장소 근거가 아니므로 핵심 결과를 본문에 기록했다.

## 잔여 위험

- 사용자 OS 손동작 QA는 모두 정상 회신을 받았다. 다만 Finder 다운로드 quarantine 첫 실행 경험은 별도 확인하지 않았고 quarantine attribute를 추가한 다운로드 시뮬레이션도 미실행이다. 로컬 격리 실행·Gatekeeper 평가와 실제 공개 다운로드 경험은 구분한다.
- Stage 3 검증 완료는 최종 보고 승인·PR 게시·merge·공개 승인을 의미하지 않는다.
- 의존성 PR #29/#30/#33 보류·기존 위험 유지. 현재 취약점 수치는 재조회하지 않았으며 공개 전 실제 위험을 다시 확인해야 한다.
- push/PR/merge/tag/Release/upload/latest/README 최신 설치 안내 변경은 미실행이다. 실제 공개 최신은 v0.1.1이다.

## 다음 단계 영향

- 후보 source SHA와 위 최종 bytes를 유지한다. candidate를 임의 재빌드/삭제/교체하거나 과거 tag/Release/assets를 변경하지 않는다.
- 사용자 손동작 QA 회신을 반영해 Stage 3 보고와 오늘할일만 로컬 커밋한다. 다음 최종 보고 작성·구현 PR 게시/merge와 Stage 4 공개는 별도 승인 대상이다.

## 승인 요청

- Stage 3 산출물·검증 결과 승인과 후보 검증 최종 보고 작성·구현 PR 게시 진행 승인을 요청한다. PR merge 및 Stage 4 실제 tag/Release/assets 공개는 별도 승인이 필요하다.
