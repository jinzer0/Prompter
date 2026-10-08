# Prompter

A local-first macOS app for turning rough ideas into reusable prompts for coding agents.

[Releases](https://github.com/jinzer0/Prompter/releases)

## Features

- **Prompt Compiler** - Turn an unfinished request into a structured prompt with optional OpenAI assistance.
- **Prompt Library** - Save, search, tag, organize, and version prompts by project.
- **Agent-ready exports** - Export prompts for Codex, Claude Code, Cursor, generic agents, `AGENTS.md`, and `SKILL.md`.
- **Templates and context** - Reuse prompt templates, harness requirements, and project context profiles.
- **Quality review** - Review prompt clarity and save improved versions.
- **Quick capture** - Bring clipboard text directly into the compiler.
- **Backup and maintenance** - Export, import, inspect, and clean up the local library.
- **Privacy controls** - Detect potentially sensitive content, encrypt backups, and lock the app with a passphrase.
- **Local-first storage** - Prompts stay on your Mac. No account or cloud service is required.

## Installation

### macOS (Apple Silicon)

1. Download `Prompter-0.1.2-mac-arm64.dmg` from
   [v0.1.2 Release](https://github.com/jinzer0/Prompter/releases/tag/v0.1.2).
2. Open the DMG and drag `Prompter.app` to `Applications`.
3. Launch Prompter from `Applications`.

The v0.1.2 Apple Silicon release is Developer ID signed, notarized, and stapled. If OpenAI key
status does not carry over from an older unsigned build, re-enter the key in Settings.

의존성 취약점은 이번 릴리스에서 해소하지 않았다. 공개 시점의 알려진 위험과 검증 한계는
[릴리스 노트](https://github.com/jinzer0/Prompter/releases/tag/v0.1.2)를 확인한다.

### From Source

Requires Node.js, npm, and the Xcode Command Line Tools.

```bash
git clone https://github.com/jinzer0/Prompter.git
cd Prompter
npm install
npm run dev
```

To create a local macOS app bundle, ZIP, and DMG:

```bash
npm run package
```

The packaged app is written to `release/`.

signed ARM64 macOS 릴리스를 준비하는 메인테이너는 로컬 셸에 필요한
서명 identity와 notary Keychain profile을 설정한 뒤 별도 릴리스 경로를 사용한다.
준비 조건과 검증 절차는 [macOS 릴리스 안내](docs/release-macos.md)를 따른다.

```bash
npm run package:release:macos
```

이 명령은 메인테이너 전용이며 정확한 버전 0.1.2 후보의 서명·공증을 위한 경로다.
명령 자체는 GitHub Release를 게시하거나 태그를 생성·재작성하지 않으며, 공개 게시는 별도
승인이 필요하다. Issue #35의 v0.1.2는 승인 후 실제 서명·공증 및 공개 다운로드 checksum 검증을
완료했다. 기존 v0.1.2 후보·태그·assets를 재실행으로 교체하지 않는다.

## Basic Use

아래는 공개 v0.1.2 배포본의 사용 흐름이다.

1. 프로젝트를 만들거나 선택한다.
2. Library에서 검색·태그 필터로 프롬프트를 찾고 행을 선택한다.
3. 오른쪽 상단 본문을 직접 편집하거나 ‘복사’로 현재 편집 내용을 복사한다.
   복사에는 컴파일이나 저장이 필요하지 않으며 앞뒤 공백·탭·개행도 유지한다.
4. Cmd+S 또는 ‘새 버전 저장’으로 같은 프롬프트에 새 current 버전을 만든다.
   변경이 없으면 새 버전을 만들지 않는다. 독립된 프롬프트가 필요하면 ‘복제하여 저장’에서
   제목을 확인한다. 복제는 현재 편집 내용을 사용하며 원본과 원본의 버전 이력은 바꾸지 않는다.
5. 미저장 상태에서 다른 프로젝트·프롬프트·이력을 선택하거나 창을 닫으면
   저장(Save)·버리기(Discard)·취소(Cancel)를 선택한다. 저장 실패 시 초안은 유지되고
   이동·닫기는 진행되지 않는다. 취소/Escape로 편집을 계속할 수 있다. 자동 저장은 없다.

컴파일은 선택 사항이다. 오른쪽 하단 Prompt Compiler에 요청을 입력해 별도 결과를 검토하고,
‘편집에 적용’을 명시적으로 눌러야 본문에 반영된다. 미저장 본문을 교체할 때는 확인을 거치며,
적용만으로 저장되지는 않는다. OpenAI 보조 기능도 선택 사항이며 Settings에서 API 키를 등록한다.

사이드바 ‘설정…’ 또는 Cmd+,로 별도 Settings 작업 공간을 연다. 화면 및 기본값, 키 관리,
앱 잠금, 백업, 수동 정리, 개인정보 설정을 다루며 ‘라이브러리로 돌아가기’로 기존 선택·편집·
컴파일 초안에 복귀한다. 진입만으로 초안을 버리거나 저장 확인·검사·정리·LLM 호출을 시작하지 않는다.
‘화면 및 기본값’의 테마는 시스템 따르기(system)·밝게(light)·어둡게(dark) 중 선택한 뒤
기존 기본값 저장 동작으로 적용한다. 저장한 선택은 재시작 후 유지되며 system은 macOS 테마를 따른다.

## UX 설계 기준

- [시각 계약](DESIGN.md): 네이티브 창 통합, 3패널 구성, 라이트·다크 토큰.
- [행동 계약](docs/ux/EXPERIENCE.md): 직접 복사·편집, 새 버전·복제 저장, 미저장 변경 보호.

두 계약은 [#31](https://github.com/jinzer0/Prompter/issues/31)의 승인된 목표 설계다.
시각·행동 기준은 이 두 문서가 소유하며 위 사용 안내는 별도의 최종 계약이 아니다.
공개 v0.1.2의 실제 검증 출처와 알려진 제한은 릴리스 노트에서 확인한다.

## Built With

Electron · React · TypeScript · SQLite

## Attribution

Created with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent).
