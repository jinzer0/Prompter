# macOS 서명 릴리스 안내

이 안내는 Issue #35의 Prompter v0.1.2 ARM64 macOS 릴리스 준비를 위한 메인테이너 문서다.
Issue #6에서 추가한 서명 경로를 현재 후보 버전에 맞춘 것이며, v0.1.2의 패키징·서명·공증·게시
완료를 주장하지 않는다. 공개 최신 배포본과 README 설치 링크는 v0.1.1을 유지한다.
이 경로는 GitHub Release 게시, 태그 생성·이동, asset 업로드, 공개 설치 안내 변경을 수행하지 않는다.

## 릴리스 경계

Prompter에는 두 가지 macOS 패키징 경로가 있다.

- `npm run package`는 앱을 빌드한 뒤 현재 지원되는 로컬 아키텍처용 unsigned 산출물을
  `release/`에 만든다.
- `npm run make`는 `npm run package`를 호출하므로 같은 unsigned 로컬 경로다.
- `npm run package:release:macos`는 먼저 `scripts/macos/release-version-preflight.mjs`를
  실행하고 빌드한 뒤 `scripts/release-macos.mjs`를 통해 signed 릴리스 coordinator를 실행한다.

signed 경로는 빌드, native rebuild, 번들링, Apple 사전 점검, 후보 생성, evidence 기록 전에
정확한 버전 `0.1.2`를 요구하며 ARM64만 지원한다. coordinator는 버전별 후보 디렉터리가 없는지
확인하고, 현재 플랫폼·아키텍처, 깨끗한 Git worktree, 선택한 Xcode, 서명 identity, 잠금 해제된
Keychain, notary profile, Apple notary 연결을 사전 점검한 뒤에만 후보를 예약하거나 변경한다.
환경에서는 다음 두 비밀값이 아닌 변수 이름을 통해서만 설정을 읽는다.

- `PROMPTER_SIGNING_IDENTITY`
- `PROMPTER_NOTARY_PROFILE`

릴리스 명령 전에 로컬 셸 또는 비밀 관리 세션에서 값을 설정한다. 변수의 실제 값은 문서,
스크립트, 추적 파일, 스크린샷, 터미널 기록, 이슈 댓글, evidence에 기록하지 않는다.

## Xcode 요구 사항

Command Line Tools만이 아닌 전체 Xcode 설치가 필요하다. 릴리스 전에 선택하고 두 조회 명령으로
확인한다.

```bash
sudo /usr/bin/xcode-select --switch /Applications/Xcode.app/Contents/Developer
/usr/bin/xcode-select -p
/usr/bin/xcodebuild -version
```

선택한 developer 디렉터리는 `Xcode.app/Contents/Developer`로 끝나야 하며,
`xcodebuild -version`은 Xcode를 보고해야 한다. coordinator도 조립·서명 전에 표준 시스템
명령으로 같은 조건을 확인한다.

## 서명 identity 요구 사항

유효한 Developer ID Application 인증서와 대응하는 개인 키를 login Keychain에 준비한다.
릴리스 경로는 정확히 하나의 지정한 서명 identity가 사용 가능해야 한다. identity가 없거나,
중복되거나, 형식이 잘못되거나, Keychain 잠금으로 사용할 수 없으면 앱 조립 전에 중단한다.

identity 값을 추적 메모에 복사하지 않고 사용 가능 여부를 확인한다.

```bash
/usr/bin/security find-identity -v -p codesigning
/usr/bin/security show-keychain-info
```

coordinator는 중첩 코드를 먼저, helper 앱을 다음에, 바깥쪽 `Prompter.app`을 마지막에 서명한다.
서명 후 앱에는 strict 코드 서명 검증을 적용하며 DMG도 이미지 서명 후 strict 검증을 거친다.

## Notary profile 요구 사항

릴리스 전에 이름이 있는 `notarytool` Keychain profile을 만든다. Apple의
`xcrun notarytool store-credentials` 절차를 대화형 또는 로컬 비밀 관리 도구로 수행한다.
profile 이름은 추적 파일에 넣지 않고 `PROMPTER_NOTARY_PROFILE`을 통해 전달한다.

릴리스 전에 저장된 profile로 Apple notary 서비스에 연결할 수 있는지 확인한다.

```bash
/usr/bin/xcrun notarytool history --keychain-profile "${PROMPTER_NOTARY_PROFILE}" --output-format json
```

릴리스 경로는 Keychain profile 인증만 사용한다. Apple 계정 값, 앱 전용 비밀번호,
API 키 파일 경로, 원시 개인 키 내용, 임의 인증 플래그는 받지 않는다.

## 서명 릴리스 명령

필수 변수가 이미 셸에 설정된 깨끗한 ARM64 macOS worktree에서만, 해당 단계 승인 후 실행한다.
Issue #35 Stage 1은 준비 계약 정합화이며 실제 Apple 서명·공증 실행은 Stage 3 승인 범위다.

```bash
npm run package:release:macos
```

명령은 실패 시 닫힌 경계로 중단한다. 실패하면 게시, 부분 asset allowlist, 태그 명령,
릴리스 명령을 진행하지 않는다. 실패한 후보를 숨기거나 교체하려고 불변 릴리스 태그를 재작성하지 않는다.

### 신뢰 경로 기준점

설정된 source root의 부모 디렉터리가 로컬 릴리스 및 공증 evidence 디렉터리의 신뢰 경로
기준점이다. coordinator는 기준점을 한 번 해석한 뒤, 데이터 생성 또는 재귀 삭제 전에 그 아래
모든 경로 구성 요소가 symbolic link가 아닌 실제 디렉터리인지 확인한다. 기준점 또는 그 상위의
symbolic link는 해석되며, macOS의 `/var` → `/private/var` 플랫폼 alias도 그 자체로 릴리스를
무효화하지 않는다. 기준점 밖의 릴리스·evidence 경로나 소유 트리 안의 symbolic link 아래 경로는
Apple 명령 또는 트리 밖 변경 전에 거절한다.

## 공증 흐름

coordinator는 서로 다른 두 artifact를 Apple에 제출한다.

1. `Prompter.app`을 담은 임시 ZIP을 최종 후보 디렉터리 밖에 만들고 먼저 제출한다.
2. staple된 앱으로 최종 DMG를 만들고 서명한 뒤 별도로 제출한다.

임시 앱 ZIP에는 staple하지 않으며 원시 `.app` bundle을 직접 업로드하지 않는다.
앱과 DMG는 각각 `Accepted` 상태와 경고·오류 없는 검토된 notary log가 있어야 다음 단계로 간다.
각 제출 gate는 `Accepted`와 빈 issues 배열 또는 정확히 소문자 `info`인 issue 레코드만 허용한다.

Evidence는 ignored 로컬 경로 `.omo/evidence/release-macos/v0.1.2/app`과
`.omo/evidence/release-macos/v0.1.2/dmg` 아래에 보관한다. 복구 중 artifact bytes, 활성 notary log,
resume record, submit claim 파일은 일시 상태이며 성공 후 제거한다. 각 종류별 root에는 정확히
`submissionId`, `status: "Accepted"`, `artifactKind`, `artifactSha256`, 경고·오류 없는 `issues`를
담은 감사 receipt `notarization-final.json`만 남긴다. 최종 receipt는 재개 상태가 아니며,
완료 후 QA에 사용하고 이후 깨끗한 재실행의 새로운 앱·DMG 제출을 막지 않는다. identity 값,
profile 값, 개인 키, credential 값, 로컬 키 경로, 전체 환경 덤프, 원시 notary payload를 넣지 않는다.

`notarytool submit`이 반환한 acknowledgement UUID는 제한된 `notarytool info` polling과 log
조회 전에 artifact에 결속된 상태로 저장한다. polling 또는 log 조회가 실패하면 같은 Keychain
profile로 `notarytool info`와 `notarytool log`를 통해 재개하고 같은 bytes를 다시 제출하지 않는다.
캐시된 Accepted receipt만으로는 신뢰하지 않는다. 모든 재개는 staple, Gatekeeper, 최종 archive,
checksum, 게시 인접 작업 전에 Apple 상태와 log를 새로 확인한다. 다시 확인한 상태가 `Accepted`이며
issues에 경고·오류가 없어야 staple 또는 패키징을 계속한다.

## 최종 artifact 계약

최종 후보 디렉터리는 `release/v0.1.2/`이며 성공하면 정확히 다음 파일만 포함할 수 있다.

- `Prompter-0.1.2-mac-arm64.zip`
- `Prompter-0.1.2-mac-arm64.dmg`
- `SHA256SUMS`

최종 ZIP은 앱의 staple과 검증이 끝난 뒤에만 만든다. 깨끗한 임시 디렉터리에 추출하고 포함된
앱을 검증한 뒤 DMG를 만든다. DMG는 검증, 서명, 제출, staple, 검증, Gatekeeper 평가를 거친 후
읽기 전용으로 mount하여 `Prompter.app`이 있는지 확인한다. ZIP·DMG 검증이 모두 통과한 뒤
`SHA256SUMS`를 마지막으로 기록한다.

`release/v0.1.2/`에 다른 파일을 추가하지 않는다. signed 명령 시작 전에 후보 디렉터리가 없어야
한다. 이미 존재하거나 실행 후 예상 밖 파일이 있으면 소유자를 파악하고 다른 작업에서 필요하지
않다는 사실을 확인한 뒤에만 제거한다.

## 공개 게시 경계

Issue #6의 서명 경로 준비와 Issue #7의 실제 배포는 과거 v0.1.1 작업의 경계다. 현재 공개 배포본은
v0.1.1이며, 과거 이슈가 아직 완료되지 않았다는 안내나 v0.1.0 unsigned 설치 안내를 적용하지 않는다.

현재 Issue #35에서는 Stage 1 준비, Stage 2 전체 회귀·source 고정, Stage 3 실제 서명·공증·설치
확인, Stage 4 공개 게시를 구분한다. signed 명령 성공만으로 게시 승인이 생기지 않는다.
최종 asset 검토, GitHub Release 생성, 태그 생성, 업로드, 공개 README 설치 안내 변경은 Stage 4의
별도 승인 후에만 수행한다. 그 전에는 v0.1.1 공개 설치 링크를 유지하고 v0.1.2 완료를 주장하지 않는다.

불변 태그를 재작성하지 않는다. 게시한 후보가 잘못되었으면 중단하고 이력을 고치는 대신
새 릴리스 작업을 승인받는다.

## 메인테이너 체크리스트

signed 명령 실행 전:

- 해당 실행 단계 승인을 확인한다.
- `git status --short`가 비어 있는지 확인한다.
- `release/v0.1.2/`가 없는지 확인한다. 빈 버전별 후보 디렉터리도 사용할 수 없다.
- 전체 Xcode가 선택되었고 `xcodebuild -version`이 Xcode를 보고하는지 확인한다.
- 정확히 하나의 준비된 Developer ID Application identity와 대응하는 개인 키가 Keychain에서
  사용 가능한지 확인한다.
- 이름이 있는 notarytool Keychain profile이 `history` 점검을 통과하는지 확인한다.
- Apple notary 서비스로 연결할 수 있는지 확인한다.
- signed 경로가 릴리스 게시, 태그, 업로드 명령을 실행하지 않는지 확인한다.

명령 성공 후 `docs/qa-checklist.md`의 signed 릴리스 항목을 점검한다. 모든 점검 통과와
Issue #35 Stage 4의 명시적 공개 승인 전에는 아무것도 게시하지 않는다.
