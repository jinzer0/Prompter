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

Phase 3:

* 프로젝트 생성 및 프로젝트별 프롬프트 목록 표시
* PromptAsset + PromptVersion 저장
* 프롬프트 선택 및 상세 표시

Phase 4:

* 정적 템플릿 기반 프롬프트 컴파일러 UI
* 생성 프롬프트 저장 가능

Phase 9:

* Settings UI
* OpenAI API Key 안전 저장
* 기본 모델, 대상 에이전트, 시나리오 설정

Phase 5:

* LLM 기반 analyze / compile
* clarification question 생성
* 최종 compiledPrompt 생성

Phase 6:

* 프롬프트 버전 관리
* current version 지정
* 새 버전 저장
* diff view

Phase 7:

* SQLite FTS 검색
* 태그 생성, 연결, 제거
* 프로젝트, 태그, 시나리오, 대상 에이전트 필터

Phase 8:

* Markdown, Codex, Claude Code, Cursor, Generic Agent export
* AGENTS.md snippet export
* SKILL.md draft export
* 클립보드 복사 및 파일 저장

Phase 10:

* 테스트, polish, macOS 패키징
* 키보드 단축키
* 앱 메뉴
* 보안 점검
* README 및 QA 체크리스트

이 작업은 Phase 11: 빠른 캡처 / 클립보드 기반 프롬프트 생성 진입점입니다.

목표:
사용자가 외부 앱에서 복사한 텍스트 또는 현재 클립보드 텍스트를 Prompter로 빠르게 가져와 프롬프트 컴파일러에 주입할 수 있게 합니다. 또한 앱 내부에서 빠른 캡처 모드를 제공해 사용자가 최소한의 동작으로 “원본 요청 → 분석 → 컴파일” 흐름을 시작할 수 있어야 합니다.

중요:
프롬프트 실행 기능을 추가하지 마세요.
Codex CLI를 호출하지 마세요.
Claude Code CLI를 호출하지 마세요.
Cursor를 자동 실행하지 마세요.
외부 앱을 자동 제어하지 마세요.
외부 앱의 선택 영역을 강제로 읽으려고 하지 마세요.
프롬프트 실행 결과 저장 기능을 추가하지 마세요.
prompt_runs, agent_runs, execution_results, validation_results, run_logs를 만들거나 사용하지 마세요.
이번 단계는 클립보드 텍스트 가져오기와 빠른 컴파일 진입점만 구현합니다.

핵심 UX:
사용자는 다음 흐름을 사용할 수 있어야 합니다.

1. 외부 앱에서 텍스트를 복사합니다.
2. Prompter를 엽니다.
3. “클립보드에서 가져오기” 버튼 또는 단축키를 누릅니다.
4. 클립보드 텍스트가 프롬프트 컴파일러의 original input에 들어갑니다.
5. 사용자는 시나리오와 대상 에이전트를 확인하거나 수정합니다.
6. LLM analyze 또는 compile을 실행합니다.
7. 기존 저장 흐름을 통해 PromptAsset + PromptVersion으로 저장합니다.

아키텍처 요구사항:

* 클립보드 접근은 Electron main process 또는 preload를 통한 최소 API로 처리합니다.
* renderer에서 Node.js API에 직접 접근하지 않습니다.
* renderer에서 Electron clipboard를 직접 import하지 않습니다.
* renderer에서 ipcRenderer를 직접 사용하지 않습니다.
* clipboard API는 필요한 최소 기능만 노출합니다.
* 모든 IPC 입력값과 반환값은 Zod로 검증합니다.
* 기존 PromptCompilerPanel의 상태와 자연스럽게 연결합니다.
* 빠른 캡처 기능은 기존 저장, 검색, 버전, export 구조를 깨뜨리지 않아야 합니다.

이번 단계에서 구현할 주요 기능:

1. 클립보드 텍스트 읽기 API

preload bridge에 클립보드 텍스트 읽기 API를 추가합니다.

권장 API:

* window.prompter.clipboard.readText()
* window.prompter.clipboard.copyText(input)

copyText는 Phase 8에서 이미 있다면 재사용합니다.
없다면 이번 단계에서 최소 구현합니다.

readText 결과:

* text: string
* isEmpty: boolean
* length: number

요구사항:

* 클립보드가 비어 있으면 명확한 상태를 반환합니다.
* 텍스트가 너무 길 경우 UI에서 경고를 표시할 수 있도록 length를 반환합니다.
* 이미지, 파일 등 텍스트가 아닌 클립보드 데이터는 이번 단계에서 무시합니다.
* API Key, secret, 내부 경로를 읽거나 다루는 기능을 추가하지 않습니다.

2. “클립보드에서 가져오기” 버튼

PromptCompilerPanel에 버튼을 추가합니다.

버튼 위치:

* original input textarea 근처
* 또는 컴파일러 상단 액션 영역

동작:

* 클릭 시 window.prompter.clipboard.readText() 호출
* 텍스트가 있으면 original input에 채움
* 기존 original input에 내용이 있으면 덮어쓰기 전에 확인 dialog를 표시하거나 append 옵션을 제공합니다
* 단순 MVP에서는 “덮어쓰기 확인”만 구현해도 됩니다
* 성공/실패 상태 메시지를 표시합니다

상태:

* 클립보드 비어 있음
* 가져오기 성공
* 가져오기 실패
* 기존 입력 덮어쓰기 확인 필요
* 텍스트가 매우 김

3. 빠른 캡처 모드

앱 안에 빠른 캡처 진입점을 추가합니다.

가능한 방식:

* 사이드바 또는 상단에 “빠른 캡처” 버튼 추가
* 앱 메뉴에 “Quick Capture from Clipboard” 추가
* 단축키 Cmd+Shift+V 또는 Cmd+Option+V 추가

빠른 캡처 동작:

1. 클립보드 텍스트를 읽습니다.
2. PromptCompilerPanel로 이동하거나 포커스합니다.
3. original input에 텍스트를 채웁니다.
4. default_scenario, default_target_agent 설정값을 적용합니다.
5. original input textarea에 focus합니다.
6. 사용자가 바로 analyze 또는 compile을 실행할 수 있게 합니다.

주의:

* 자동으로 LLM analyze를 실행하지 마세요.
* 사용자가 확인하기 전에 비용이 발생하는 API 호출을 자동 실행하지 마세요.
* 자동 실행은 나중에 별도 설정으로 추가할 수 있습니다.

4. 앱 메뉴 연결

macOS 앱 메뉴에 빠른 캡처 항목을 추가합니다.

권장 위치:
File 메뉴:

* Quick Capture from Clipboard
* New Prompt
* Save Prompt
* Export Prompt

단축키 예:

* Cmd+Shift+V: Quick Capture from Clipboard

요구사항:

* 메뉴 클릭 시 main process에서 renderer에 안전하게 이벤트를 전달합니다.
* preload bridge에 필요한 최소 event subscription API를 추가합니다.
* renderer에 ipcRenderer를 직접 노출하지 않습니다.
* 이벤트 listener cleanup을 처리합니다.

권장 API:

* window.prompter.appEvents.onQuickCapture(callback)
* 반환값으로 unsubscribe 함수 제공

5. 전역 단축키, 선택 구현

전역 단축키는 사용성이 좋지만 운영체제와 충돌 가능성이 있습니다.
이번 단계에서는 선택 구현으로 처리합니다.

선택 구현:

* Settings에서 “전역 빠른 캡처 단축키 사용” 옵션 추가
* 기본값은 false
* 사용자가 켜면 Electron globalShortcut 등록
* 앱 종료 시 unregister
* 등록 실패 시 명확한 에러 표시

권장 기본 단축키:

* CommandOrControl+Shift+Space
* 또는 CommandOrControl+Option+P

주의:

* OS나 다른 앱과 충돌할 수 있습니다.
* 등록 실패를 정상적인 상황으로 처리합니다.
* 전역 단축키가 없어도 앱 메뉴와 내부 단축키로 기능을 사용할 수 있어야 합니다.
* 구현 범위가 커지면 전역 단축키는 이번 단계에서 제외하고 앱 내부 단축키만 구현하세요.

6. 클립보드 텍스트 정리

가져온 텍스트를 그대로 넣되, 최소한의 정리 옵션을 제공합니다.

기본 처리:

* 앞뒤 공백 trim
* 너무 많은 연속 빈 줄은 적당히 정리, 선택
* null character 같은 제어 문자 제거
* 원문 의미를 바꾸는 과한 변환은 하지 않음

선택 옵션:

* “원문 그대로 가져오기”
* “가벼운 정리 적용”

MVP에서는 자동 trim 정도만 적용해도 됩니다.

7. 긴 텍스트 처리

클립보드 텍스트가 매우 긴 경우 UI가 망가지지 않아야 합니다.

요구사항:

* 예: 20,000자 이상이면 경고 표시
* textarea는 스크롤 가능해야 합니다.
* 너무 긴 텍스트라도 앱이 멈추면 안 됩니다.
* LLM analyze/compile 전에 “입력이 매우 깁니다. 비용과 처리 시간이 늘 수 있습니다.” 안내를 표시합니다.
* 자동으로 텍스트를 자르지 마세요.
* 자를 경우 반드시 사용자에게 알려야 합니다.

8. 컴파일러 상태와 연결

빠른 캡처로 가져온 텍스트는 기존 PromptCompilerPanel 흐름과 연결되어야 합니다.

요구사항:

* originalInput 상태에 반영
* default_scenario 적용
* default_target_agent 적용
* selectedProject가 있으면 project_id 유지
* suggested title 자동 생성 로직이 있다면 다시 계산
* 기존 analyze 결과, questions, compiledPrompt가 있다면 새 입력에 맞지 않으므로 초기화
* 사용자가 실수로 기존 작업을 잃지 않도록 덮어쓰기 확인 처리

초기화할 상태:

* analyze summary
* clarification questions
* clarification answers
* assumptions
* compiledPrompt
* suggestedTags
* warnings
* qualityScore

9. Quick Capture draft 상태, 선택 구현

선택 구현으로 quick capture draft를 임시 보관할 수 있습니다.

예:

* 사용자가 클립보드에서 가져온 뒤 아직 저장하지 않은 상태에서 앱을 닫으려 할 경우 경고
* 또는 sessionStorage/local renderer state에 임시 유지

이번 단계에서는 필수 아닙니다.
복잡해지면 구현하지 마세요.

10. UI 요구사항

추가 UI:

* 클립보드에서 가져오기 버튼
* 빠른 캡처 상태 메시지
* 기존 입력 덮어쓰기 확인 dialog
* 긴 텍스트 경고
* 앱 메뉴 항목
* 가능하면 단축키 안내 tooltip

버튼 라벨 예:

* 클립보드에서 가져오기
* 빠른 캡처
* 기존 입력 덮어쓰기
* 가져오기 취소

상태 메시지 예:

* “클립보드 텍스트를 가져왔습니다.”
* “클립보드에 텍스트가 없습니다.”
* “기존 입력이 있습니다. 덮어쓸까요?”
* “입력이 매우 깁니다. 분석 전에 내용을 확인하세요.”

11. Settings 연결

Settings에 빠른 캡처 관련 설정을 추가합니다.

일반 설정:

* quick_capture_trim_clipboard_text: boolean
* quick_capture_warn_long_text: boolean
* quick_capture_long_text_threshold: number
* quick_capture_global_shortcut_enabled: boolean, 전역 단축키를 구현하는 경우
* quick_capture_global_shortcut: string, 선택

settings 테이블에 저장합니다.
secret으로 저장할 필요는 없습니다.

기본값:

* trim: true
* warn_long_text: true
* threshold: 20000
* global_shortcut_enabled: false

12. IPC API 요구사항

preload bridge에 필요한 API를 추가하거나 기존 API를 보완합니다.

Clipboard:

* window.prompter.clipboard.readText()
* window.prompter.clipboard.copyText(input)

App events:

* window.prompter.appEvents.onQuickCapture(callback)
* window.prompter.appEvents.off 또는 unsubscribe 반환

Settings:

* 기존 settings API 재사용
* quick capture 설정 저장/조회 가능

선택:

* window.prompter.shortcuts.registerGlobalQuickCapture(input)
* window.prompter.shortcuts.unregisterGlobalQuickCapture()
* window.prompter.shortcuts.getGlobalQuickCaptureStatus()

전역 단축키를 구현하지 않는다면 shortcuts API는 만들지 마세요.

13. Zod schema 요구사항

다음 schema를 정의하거나 보완합니다.

* ClipboardReadTextResultSchema
* CopyTextInputSchema, 기존에 없다면
* QuickCaptureSettingsSchema
* RegisterGlobalShortcutInputSchema, 선택
* QuickCaptureEventPayloadSchema

검증 규칙:

* copyText.text는 빈 문자열 불가
* threshold는 1000 이상, 500000 이하 정도로 제한
* shortcut 문자열은 빈 문자열 불가, 선택 구현 시
* clipboard read 결과는 renderer로 반환하기 전에 안전한 구조로 제한

14. 보안 요구사항

* renderer에서 Electron clipboard를 직접 import하지 않습니다.
* renderer에서 ipcRenderer를 직접 사용하지 않습니다.
* renderer에서 fs, path, process, shell에 직접 접근하지 않습니다.
* 클립보드 내용은 자동으로 DB에 저장하지 않습니다.
* 사용자가 명시적으로 저장하기 전까지 클립보드 내용은 PromptAsset/PromptVersion에 저장되지 않아야 합니다.
* 클립보드 내용을 로그에 남기지 마세요.
* 클립보드 내용에 API Key나 secret이 들어 있을 수 있으므로 console.log로 출력하지 마세요.
* 빠른 캡처가 자동 LLM 호출을 실행하지 않도록 합니다.
* 외부 앱 선택 영역을 훔쳐 읽는 방식은 구현하지 마세요.
* 전역 단축키를 구현하더라도 클립보드 텍스트만 읽고, 외부 앱에 키 입력을 주입하지 마세요.

15. 테스트 / 확인 요구사항

* 앱이 개발 모드에서 정상 실행되어야 합니다.
* TypeScript typecheck가 통과해야 합니다.
* 클립보드에 텍스트가 있을 때 “클립보드에서 가져오기”가 original input을 채워야 합니다.
* 클립보드가 비어 있을 때 명확한 메시지를 표시해야 합니다.
* 기존 original input이 있을 때 덮어쓰기 확인이 표시되어야 합니다.
* 빠른 캡처 후 기존 analyze/compile 결과가 초기화되어야 합니다.
* default_scenario와 default_target_agent가 적용되어야 합니다.
* 긴 텍스트를 가져오면 경고가 표시되어야 합니다.
* 앱 메뉴의 Quick Capture 항목이 동작해야 합니다.
* Cmd+Shift+V 또는 지정한 내부 단축키가 동작해야 합니다.
* 전역 단축키를 구현한 경우 등록 성공/실패 상태가 표시되어야 합니다.
* 클립보드 내용이 자동 저장되지 않아야 합니다.
* 클립보드 내용이 로그에 출력되지 않아야 합니다.
* 프롬프트 실행 또는 실행 결과 저장 관련 데이터는 생성되지 않아야 합니다.

이번 단계에서 구현하지 말 것:

* 프롬프트 실행 기능
* Codex CLI 실행
* Codex OAuth
* Claude Code 실행
* Cursor 실행
* 외부 앱 자동 제어
* 외부 앱 선택 텍스트 강제 읽기
* 클립보드 히스토리 전체 저장
* 클립보드 감시 백그라운드 프로세스
* prompt_runs
* agent_runs
* execution_results
* validation_results
* run_logs
* 실행 결과 저장
* 클라우드 동기화
* 팀 협업

완료 기준:

* 클립보드 텍스트를 PromptCompilerPanel로 가져올 수 있습니다.
* 빠른 캡처 버튼 또는 메뉴가 구현되어 있습니다.
* 앱 메뉴에서 Quick Capture from Clipboard가 동작합니다.
* 내부 단축키로 빠른 캡처를 실행할 수 있습니다.
* 기존 입력 덮어쓰기 확인이 동작합니다.
* 긴 텍스트 경고가 동작합니다.
* 빠른 캡처 후 analyze/compile 결과가 안전하게 초기화됩니다.
* 클립보드 내용은 사용자가 명시적으로 저장하기 전까지 DB에 저장되지 않습니다.
* 클립보드 내용은 로그에 남지 않습니다.
* 모든 IPC 입력값은 Zod로 검증됩니다.
* renderer는 clipboard, DB, 파일시스템, process에 직접 접근하지 않습니다.
* TypeScript 타입 검사가 통과합니다.
* 앱이 개발 모드에서 정상 실행됩니다.
* 프롬프트 실행이나 실행 결과 저장 기능은 추가되지 않았습니다.

작업 전:

1. 현재 Phase 0부터 Phase 10까지의 코드 구조를 확인합니다.
2. PromptCompilerPanel의 originalInput 상태 관리 방식을 확인합니다.
3. Settings API와 settings table 구조를 확인합니다.
4. Phase 8에서 copyText API가 이미 구현되어 있는지 확인합니다.
5. Electron app menu와 shortcut 구현 위치를 확인합니다.
6. renderer가 main process 이벤트를 안전하게 받는 패턴이 이미 있는지 확인합니다.
7. 빠른 캡처가 기존 analyze/compile 상태를 어떻게 초기화할지 계획합니다.
8. 간결한 구현 계획을 세운 뒤 Phase 11만 구현합니다.

작업 후:

1. 변경된 내용을 요약합니다.
2. 생성되거나 수정된 파일 목록을 제공합니다.
3. 추가한 설정값을 설명합니다.
4. 클립보드 읽기와 빠른 캡처의 데이터 흐름을 설명합니다.
5. 앱 메뉴와 단축키 연결 방식을 설명합니다.
6. 보안상 클립보드 내용이 자동 저장되거나 로그에 남지 않도록 한 방식을 설명합니다.
7. 앱 실행 및 타입 검사 명령어를 제공합니다.
8. 수동 테스트 절차를 제공합니다.
9. 아직 구현하지 않은 기능을 명확히 구분해서 설명합니다.

## Attribution

Created with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent).
