당신은 Prompter라는 Electron 데스크톱 앱을 개발하고 있습니다.

Prompter는 로컬 우선(local-first) 프롬프트 컴파일러이자 프롬프트 라이브러리입니다. 이 앱의 목적은 모호한 인간의 요청을 에이전트가 실행 가능한 프롬프트로 변환하고, 이를 버전 관리되는 프롬프트 자산으로 저장하며, Codex, Claude Code, Cursor 및 일반 LLM 에이전트에 사용할 수 있도록 내보내는 것입니다.

현재까지 완료되었다고 가정하는 단계:

Phase 0:

* Electron, React, TypeScript, Vite 기반 앱 골격
* main, preload, renderer 분리
* 안전한 Electron 기본 설정
* typed preload bridge
* IPC ping/pong 테스트

Phase 1:

* Tailwind CSS 기반 기본 UI
* 3단 레이아웃
* 재사용 가능한 기본 UI 컴포넌트

Phase 2:

* SQLite + Drizzle ORM + better-sqlite3 기반 로컬 DB
* DB는 Electron main process에서만 접근
* renderer는 typed IPC를 통해서만 DB 기능 호출
* Zod 기반 IPC 입력값 검증
* 주요 테이블 및 기본 CRUD 구현

Phase 3:

* 프로젝트 목록 UI가 실제 DB와 연결됨
* 프로젝트 생성 가능
* 프로젝트별 프롬프트 목록 표시 가능
* 새 프롬프트 수동 생성 가능
* prompt_asset과 첫 prompt_version 저장 가능
* 프롬프트 선택 시 current version 상세 표시 가능

Phase 4:

* 정적 템플릿 기반 프롬프트 컴파일러 UI 구현
* 생성된 프롬프트를 PromptAsset + PromptVersion으로 저장 가능

Phase 9:

* Settings UI 구현
* OpenAI API Key 안전 저장
* 기본 모델, 기본 에이전트, 기본 시나리오 설정 가능

Phase 5:

* OpenAI SDK는 Electron main process에서만 사용
* LLM 기반 analyze / compile 구현
* clarification question 생성 가능
* 최종 compiledPrompt 생성 가능
* 생성된 프롬프트를 PromptAsset + PromptVersion으로 저장 가능

Phase 6:

* 하나의 PromptAsset이 여러 PromptVersion을 가질 수 있음
* 버전 목록 표시 가능
* current version 지정 가능
* 기존 PromptAsset에 새 버전 추가 가능
* 간단한 version diff 확인 가능

Phase 7:

* SQLite FTS 기반 검색 구현
* 프로젝트, 태그, 시나리오, 대상 에이전트 필터 구현
* 태그 생성, 연결, 제거 가능
* LLM suggestedTags를 저장 흐름에 반영 가능

Phase 8:

* 선택된 PromptVersion을 여러 export format으로 변환 가능
* Markdown, Codex, Claude Code, Cursor, Generic Agent export 가능
* AGENTS.md snippet export 가능
* SKILL.md draft export 가능
* 클립보드 복사 가능
* 파일 내보내기 가능

이 작업은 Phase 10: polish / 테스트 / 패키징입니다.

목표:
Prompter를 실제로 사용할 수 있는 macOS Electron 앱 수준으로 다듬습니다. 기존 기능의 안정성을 점검하고, 테스트를 추가하고, 에러/로딩/빈 상태를 보강하고, 키보드 단축키와 앱 메뉴를 추가하며, macOS 패키징이 가능하도록 정리합니다.

중요:
새로운 제품 기능을 크게 추가하지 마세요.
프롬프트 실행 기능을 추가하지 마세요.
Codex, Claude Code, Cursor 같은 외부 코딩 에이전트를 직접 실행하지 마세요.
Codex CLI를 호출하지 마세요.
Claude Code CLI를 호출하지 마세요.
Cursor를 자동 실행하지 마세요.
프롬프트 실행 결과 저장 기능을 추가하지 마세요.
prompt_runs, agent_runs, execution_results, validation_results, run_logs를 만들거나 사용하지 마세요.
이번 단계는 안정화, 테스트, 보안 점검, UX polish, 패키징에만 집중합니다.

아키텍처 요구사항:

* 기존 main, preload, renderer 분리 구조를 유지합니다.
* renderer는 Node.js API, fs, path, process, shell, better-sqlite3, drizzle, safeStorage에 직접 접근하면 안 됩니다.
* renderer는 ipcRenderer를 직접 사용하면 안 됩니다.
* 모든 main process 기능은 preload bridge를 통해 제한적으로 노출되어야 합니다.
* IPC 입력값은 계속 Zod로 검증되어야 합니다.
* API Key와 secret은 renderer, logs, export content, settings table에 노출되면 안 됩니다.
* 테스트 추가를 이유로 보안 경계를 약화하지 마세요.

이번 단계에서 구현할 주요 작업:

1. 전체 기능 smoke test 정리

앱의 핵심 흐름이 깨지지 않는지 확인하고, 필요한 경우 작은 수정만 합니다.

확인할 핵심 흐름:

* 앱 실행
* 프로젝트 생성
* 프로젝트 선택
* 프롬프트 생성
* 정적 템플릿 기반 컴파일
* OpenAI API Key 저장 상태 확인
* LLM analyze
* clarification question 표시
* LLM compile
* PromptAsset + PromptVersion 저장
* 기존 PromptAsset에 새 버전 저장
* current version 지정
* 버전 diff 확인
* 검색
* 태그 생성
* 태그 연결/해제
* suggestedTags 저장 반영
* export format 생성
* 클립보드 복사
* 파일 내보내기
* 설정 저장 및 재로드

중요:

* 이 과정에서 발견되는 작은 버그는 수정합니다.
* 기능 범위를 넓히는 변경은 하지 않습니다.

2. 테스트 환경 구성

기존 프로젝트에 맞게 테스트 환경을 구성하거나 정리합니다.

권장:

* Vitest
* TypeScript 기반 unit test
* 필요한 경우 jsdom 또는 happy-dom
* main process 순수 함수 테스트
* shared formatter/schema 테스트

테스트 스크립트:

* test
* test:watch, 선택
* typecheck
* lint
* build

package.json scripts에 일관되게 추가합니다.

예:

* npm run test
* npm run typecheck
* npm run lint
* npm run build

프로젝트가 pnpm을 사용한다면 pnpm 기준으로 정리합니다.

3. Unit test 추가

다음 영역에 대한 unit test를 추가합니다.

A. prompt compiler formatter / static compiler

* 필수 섹션이 포함되는지 확인
* scenario별 지침이 반영되는지 확인
* targetAgent별 지침이 반영되는지 확인
* 빈 optional field 처리
* “Do not store prompt execution results.” 같은 out-of-scope 지침이 유지되는지 확인

B. export formatter

* Markdown export 구조 확인
* Codex export 구조 확인
* Claude Code export 구조 확인
* Cursor export 구조 확인
* Generic Agent export 구조 확인
* AGENTS.md snippet이 일회성 작업 지시를 과하게 포함하지 않는지 확인
* SKILL.md draft에 frontmatter, name, description, workflow, output format이 포함되는지 확인
* export content에 API Key 같은 secret이 포함되지 않는지 확인

C. slug / filename utility

* 한글 제목 처리
* 공백 처리
* 특수문자 제거
* 너무 긴 파일명 자르기
* 빈 제목 fallback 처리
* SKILL.md, AGENTS.snippet.md 기본 파일명 처리

D. Zod schemas

* CreateProjectInput
* CreatePromptAssetInput
* CreatePromptVersionInput
* PromptCompilerAnalyzeInput
* PromptCompilerCompileInput
* UpdateDefaultsInput
* SaveOpenAIKeyInput
* SearchPromptsInput
* ExportFormatSchema
* SavePromptToFileInput
* CopyTextInput

검증할 것:

* 빈 문자열 거부
* 허용되지 않는 scenario 거부
* 허용되지 않는 targetAgent 거부
* limit 범위 검증
* export format 검증
* API Key 입력 trim 처리

E. diff utility

* 추가된 줄 표시
* 삭제된 줄 표시
* 변경 없는 줄 표시
* 빈 문자열 비교
* 동일한 텍스트 비교
* 여러 줄 텍스트 비교

4. DB repository 테스트, 가능하면 구현

가능하다면 임시 SQLite DB를 사용해 repository 테스트를 추가합니다.

테스트 대상:

* createProject / listProjects
* createPromptAsset
* createPromptVersion
* createNextVersion
* setCurrentPromptVersion
* createTag
* attachTagToPrompt
* detachTagFromPrompt
* searchPrompts
* rebuildSearchIndex
* settings get/set

주의:

* 실제 userData DB를 테스트에서 건드리지 마세요.
* 테스트용 temp DB를 사용합니다.
* 테스트 종료 후 temp DB를 정리합니다.
* 이 작업이 현재 구조상 과하게 복잡하면 repository 테스트는 최소화하고 순수 함수 테스트를 우선합니다.

5. IPC handler 테스트 또는 smoke test

가능하면 IPC handler의 핵심 입력 검증을 테스트합니다.

테스트 대상:

* 잘못된 입력이 거부되는지
* 정상 입력이 service로 전달되는지
* 에러가 앱 crash 대신 구조화된 에러로 반환되는지

Electron IPC 전체를 실제로 띄우는 e2e 테스트까지는 필수 아닙니다.
이번 단계에서는 과도한 e2e 테스트 프레임워크 도입을 피하세요.
목표는 유지 가능한 최소 안정성입니다.

6. Loading / error / empty state 점검

앱 전체의 주요 UI 상태를 점검하고 부족한 부분을 보강합니다.

대상 화면:

* 프로젝트 목록
* 프롬프트 라이브러리
* 프롬프트 상세
* 프롬프트 컴파일러
* clarification question 영역
* 버전 목록
* diff view
* 검색 결과
* 태그 관리
* 설정 화면
* export dialog 또는 export menu

필수 상태:

* loading
* empty
* error
* saving
* deleting
* copied
* exported
* cancelled
* missing API key
* invalid API key format
* LLM response parse failure
* search result 없음
* selected prompt 없음
* selected version 없음

에러 메시지 요구사항:

* 사용자가 무엇을 해야 하는지 알 수 있어야 합니다.
* 내부 stack trace를 그대로 보여주지 마세요.
* API Key, DB path, secret file path를 노출하지 마세요.

7. 키보드 단축키 추가

macOS 중심으로 단축키를 추가합니다.

필수 단축키:

* Cmd+N: 새 프롬프트 생성 또는 새 프롬프트 입력 모드
* Cmd+Shift+N: 새 프로젝트 생성
* Cmd+F: 검색 입력창 focus
* Cmd+S: 현재 생성/편집 중인 프롬프트 저장
* Cmd+Shift+C: 현재 compiled prompt 복사
* Cmd+,: 설정 열기
* Esc: 열린 dialog 또는 panel 닫기, 가능한 경우

Windows/Linux 호환도 고려한다면 CmdOrCtrl을 사용합니다.

요구사항:

* 단축키는 Electron menu accelerator 또는 renderer keyboard handler 중 적절한 방식으로 구현합니다.
* 앱 메뉴와 UI 동작이 충돌하지 않게 합니다.
* 입력창에서 타이핑 중인 일반 키 동작을 방해하지 마세요.
* 단축키가 동작하지 않는 상황에서는 조용히 실패하지 말고 가능한 경우 상태를 유지합니다.
* 단축키는 UI tooltip 또는 메뉴에 표시하면 좋습니다.

8. macOS 앱 메뉴 추가

Electron app menu를 정리합니다.

권장 메뉴:

Prompter

* About Prompter
* Settings...
* Hide Prompter
* Hide Others
* Quit Prompter

File

* New Prompt
* New Project
* Save Prompt
* Export Prompt

Edit

* Undo
* Redo
* Cut
* Copy
* Paste
* Select All

View

* Reload, development only 또는 일반 reload
* Toggle Developer Tools, development only
* Zoom In
* Zoom Out
* Reset Zoom

Window

* Minimize
* Close
* Bring All to Front

Help

* Prompter Help, placeholder 가능

요구사항:

* 메뉴 클릭이 renderer에 필요한 액션을 전달할 수 있어야 합니다.
* 필요한 경우 main → renderer 이벤트를 안전하게 전달하는 preload bridge를 추가합니다.
* 광범위한 ipcRenderer 접근을 노출하지 마세요.
* 개발 전용 메뉴와 production 메뉴를 구분합니다.

9. 접근성 및 사용성 polish

기본적인 접근성 개선을 합니다.

체크리스트:

* 주요 버튼에 aria-label 또는 명확한 텍스트 제공
* 아이콘만 있는 버튼에는 accessible label 제공
* form input과 label 연결
* dialog focus 처리
* keyboard navigation 가능한 구조
* focus ring 제거하지 않기
* 색 대비가 너무 낮지 않게 조정
* error message가 입력 필드 근처에 표시되도록 정리
* 빈 상태에서 다음 행동 버튼 제공

UI polish:

* 버튼 disabled 상태 일관화
* toast 또는 inline status message 일관화
* 날짜 표시 일관화
* badge label 일관화
* panel spacing 정리
* 너무 긴 prompt preview truncation 처리
* 긴 compiled prompt 영역 스크롤 처리
* 창 크기 변경 시 UI가 심하게 깨지지 않게 처리

10. 보안 hardening 점검

Electron 보안 설정을 점검합니다.

확인할 것:

* nodeIntegration: false
* contextIsolation: true
* sandbox: 가능한 경우 true
* preload에서 필요한 최소 API만 노출
* ipcRenderer 직접 노출 없음
* renderer에서 Node.js API import 없음
* 외부 링크가 있다면 shell.openExternal을 안전하게 처리
* window.open 제한 또는 처리
* CSP 설정 가능하면 추가
* remote module 사용 금지
* eval 또는 unsafe-eval 사용 최소화
* secret 로그 출력 없음
* export content에 secret 포함 없음
* settings table에 API Key 평문 없음

가능하다면 renderer HTML에 기본 CSP를 추가합니다.
단, Vite/Electron 개발 환경과 충돌할 수 있으므로 production에서 우선 적용해도 됩니다.

11. 로그 및 에러 처리 정리

로그 정책을 정리합니다.

요구사항:

* 개발 로그와 production 로그를 구분합니다.
* API Key, secret, DB path, user file path를 불필요하게 로그에 남기지 않습니다.
* LLM 요청 전체를 민감정보와 함께 그대로 로그에 남기지 않습니다.
* IPC 에러는 사용자 친화적 메시지와 개발용 detail을 분리합니다.
* main process에서 uncaught error가 발생했을 때 앱이 완전히 조용히 죽지 않도록 최소한의 처리 추가를 고려합니다.

12. 빌드 설정 정리

production build가 가능하도록 설정을 정리합니다.

확인할 것:

* renderer build
* main build
* preload build
* asset path
* Vite production path
* Electron Forge 또는 현재 packaging tool 설정
* native dependency인 better-sqlite3 packaging 처리
* Drizzle migration 파일 포함 여부
* 앱 실행 시 production 환경에서도 DB 초기화와 migration이 동작하는지 확인
* userData 경로 사용 여부 확인
* 개발 DB와 production DB 혼동 방지

13. macOS 패키징

macOS 앱 패키징을 설정합니다.

요구사항:

* macOS용 app build 가능
* dmg 또는 zip 생성, 현재 도구에서 쉬운 방식 선택
* 앱 이름: Prompter
* bundle identifier 설정, 예:

  * com.local.prompter
  * 또는 프로젝트에 맞는 식별자
* 앱 아이콘 placeholder 또는 기본 아이콘 설정
* package script 추가
* make script 추가

주의:

* Apple Developer ID 인증서가 없다면 code signing과 notarization은 완전히 자동화하지 않아도 됩니다.
* 인증서가 없는 경우 unsigned local build로 명확히 정리합니다.
* code signing 설정이 없는 상태에서 무리하게 signing을 넣어 빌드를 깨뜨리지 마세요.
* notarization은 이번 단계에서 필수가 아닙니다.
* 단, 나중에 signing/notarization을 추가할 수 있도록 설정 위치를 정리해 둡니다.

14. 의존성 및 타입 정리

프로젝트 의존성을 정리합니다.

확인할 것:

* 사용하지 않는 패키지 제거
* 중복 패키지 제거
* any 타입 최소화
* TODO 주석 중 중요한 것 정리
* import path 정리
* shared type 중복 제거
* formatter, schema, IPC type의 naming 일관성 확인
* lint warning 가능한 한 제거

15. README 또는 개발 문서 작성

간단한 README를 작성하거나 갱신합니다.

포함할 내용:

* Prompter 설명
* 기술 스택
* 설치 방법
* 개발 실행 명령어
* 타입 검사 명령어
* 테스트 명령어
* 빌드 명령어
* macOS 패키징 명령어
* DB 위치 개요
* API Key 저장 방식 개요
* 보안 원칙
* 현재 MVP에 포함된 기능
* 명시적으로 제외된 기능

명시적으로 제외된 기능:

* 프롬프트 실행
* Codex 직접 실행
* Codex OAuth
* 실행 결과 저장
* agent run history
* 클라우드 동기화
* 팀 협업

16. 최종 수동 QA 체크리스트 작성

작업 후 사용할 수 있는 수동 QA 체크리스트를 문서로 작성합니다.

권장 파일:

* docs/qa-checklist.md
* 또는 README 안의 QA 섹션

체크리스트:

* 앱 시작
* 프로젝트 생성
* 프롬프트 생성
* LLM analyze
* LLM compile
* 저장
* 버전 추가
* current version 변경
* 검색
* 태그 추가/제거
* export
* 파일 저장
* 설정 저장
* API Key 삭제
* 앱 재시작 후 데이터 유지
* API Key 평문 노출 없음
* prompt_runs 관련 데이터 없음

17. 이번 단계에서 작은 버그 수정 허용 범위

허용:

* type error 수정
* broken import 수정
* UI 상태 누락 보강
* 저장 후 목록 갱신 누락 수정
* 검색 결과 preview 깨짐 수정
* export filename 오류 수정
* settings reload 오류 수정
* packaging path 오류 수정

금지:

* 새 대형 기능 추가
* 프롬프트 실행 기능 추가
* 외부 에이전트 실행 추가
* run history 추가
* cloud sync 추가
* 팀 기능 추가
* 복잡한 플러그인 시스템 추가

18. 테스트 / 확인 요구사항

다음 명령어가 통과해야 합니다.

* npm run typecheck 또는 pnpm typecheck
* npm run lint 또는 pnpm lint, 설정된 경우
* npm run test 또는 pnpm test
* npm run build 또는 pnpm build
* npm run package / make 또는 프로젝트에 정의된 macOS 패키징 명령어

수동 확인:

* 앱이 개발 모드에서 정상 실행됩니다.
* production build 앱도 실행됩니다.
* DB가 production 환경에서 userData 경로에 생성됩니다.
* 저장된 데이터가 앱 재시작 후 유지됩니다.
* API Key 평문이 settings table에 저장되지 않습니다.
* export content에 API Key가 포함되지 않습니다.
* renderer가 파일 시스템에 직접 접근하지 않습니다.
* prompt_runs 또는 실행 결과 관련 테이블/데이터가 생성되지 않습니다.

19. 이번 단계에서 구현하지 말 것

다음은 절대 구현하지 마세요.

* 프롬프트 실행 기능
* Codex CLI 실행
* Codex OAuth
* Claude Code 실행
* Cursor 실행
* 외부 앱 자동 실행
* prompt_runs
* agent_runs
* execution_results
* validation_results
* run_logs
* 실행 결과 저장
* export history 저장
* 클라우드 동기화
* 팀 협업
* 결제
* 계정 시스템
* 원격 서버
* 벡터 검색
* 임베딩 생성
* 플러그인 시스템

완료 기준:

* 주요 순수 함수와 schema에 unit test가 추가되어 있습니다.
* 가능한 경우 repository 또는 service smoke test가 추가되어 있습니다.
* TypeScript 타입 검사가 통과합니다.
* lint가 설정된 경우 lint가 통과합니다.
* test가 통과합니다.
* production build가 성공합니다.
* macOS 패키징 명령어가 성공하거나, 인증서 부재로 signing/notarization만 제외된 상태가 명확히 설명됩니다.
* 키보드 단축키가 구현되어 있습니다.
* macOS 앱 메뉴가 정리되어 있습니다.
* 주요 화면의 loading, error, empty state가 보강되어 있습니다.
* 기본 접근성 문제가 개선되어 있습니다.
* Electron 보안 경계가 유지됩니다.
* API Key와 secret이 renderer, logs, export content, settings table에 노출되지 않습니다.
* README 또는 개발 문서가 갱신되어 있습니다.
* QA 체크리스트가 작성되어 있습니다.
* 프롬프트 실행이나 실행 결과 저장 기능은 추가되지 않았습니다.

작업 전:

1. 현재 Phase 0부터 Phase 8까지의 코드 구조를 확인합니다.
2. package manager가 npm인지 pnpm인지 확인합니다.
3. 현재 test, lint, build, package 스크립트를 확인합니다.
4. Electron Forge 또는 사용 중인 packaging 도구 설정을 확인합니다.
5. better-sqlite3와 migration 파일이 production package에 포함되는지 확인합니다.
6. renderer에서 Node.js API를 직접 import하는 코드가 없는지 점검합니다.
7. API Key가 renderer 또는 logs로 노출될 가능성이 있는지 점검합니다.
8. 가장 위험한 깨진 흐름부터 우선순위를 세웁니다.
9. 간결한 구현 계획을 세운 뒤 Phase 10만 구현합니다.

작업 후:

1. 변경된 내용을 요약합니다.
2. 생성되거나 수정된 파일 목록을 제공합니다.
3. 추가하거나 제거한 패키지 목록을 제공합니다.
4. 추가한 테스트 범위를 설명합니다.
5. 실행한 명령어와 결과를 제공합니다.
6. macOS 패키징 방식과 결과물을 설명합니다.
7. signing/notarization을 하지 않았다면 그 이유와 현재 상태를 설명합니다.
8. 보안 점검 결과를 설명합니다.
9. 수동 QA 체크리스트 위치와 사용법을 설명합니다.
10. 아직 구현하지 않은 기능을 명확히 구분해서 설명합니다.
