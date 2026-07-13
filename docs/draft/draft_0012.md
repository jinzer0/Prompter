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
* harness_templates 테이블 포함

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
* LLM 호출은 Electron main process에서만 수행

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
* narrow menu action channel 구현
* 기존 menu.onAction / MENU_ACTION_CHANNEL 패턴 존재

Phase 11:

* 빠른 캡처는 버튼 + File 메뉴 + 앱 포커스 상태의 CmdOrCtrl+Shift+V accelerator로 한정됨
* OS 전역 단축키는 구현하지 않음
* window.prompter.clipboard.readText() 최소 API 구현
* readText 반환 shape:

  * text: string
  * isEmpty: boolean
  * length: number
* 기존 menu.onAction / MENU_ACTION_CHANNEL 재사용
* window.prompter.appEvents.* 추가하지 않음
* window.prompter.shortcuts.* 추가하지 않음
* globalShortcut 관련 API와 설정 추가하지 않음
* quick_capture_* settings key 추가하지 않음
* 클립보드 텍스트는 원문 그대로 가져옴
* 자동 trim, cleanup, 빈 줄 정리, control character cleanup 없음
* append 옵션 없음
* 기존 original input이 있으면 in-app overwrite confirmation만 사용
* long-text threshold는 settings가 아니라 hook 내부 상수 20000
* default scenario / target agent는 settings를 새로 읽지 않고 현재 draft 값을 보존
* quick capture는 자동 LLM 호출을 하지 않음
* quick capture는 자동 저장을 하지 않음
* 클립보드 내용은 로그에 남기지 않음
* 클립보드 내용은 사용자가 명시적으로 저장하기 전까지 persistence하지 않음
* stale compiler state 초기화 요구사항 존재

이 작업은 Phase 12: 하네스 템플릿 관리 UI입니다.

목표:
사용자가 프롬프트 컴파일에 사용되는 하네스 템플릿을 조회, 생성, 수정, 복제, 삭제할 수 있게 합니다. 또한 PromptCompilerPanel에서 특정 하네스 템플릿을 선택해 정적 템플릿 컴파일과 LLM 기반 analyze / compile 흐름에 반영할 수 있도록 연결합니다.

하네스 템플릿은 프롬프트 컴파일러가 어떤 구조와 기준으로 최종 프롬프트를 만들지 결정하는 재사용 가능한 규칙입니다.

하네스 템플릿은 다음을 정의합니다:

* 어떤 시나리오에 쓰이는지
* 어떤 대상 에이전트에 적합한지
* 어떤 입력 필드가 필요한지
* clarification question을 어떤 기준으로 만들지
* 최종 프롬프트가 어떤 섹션을 포함해야 하는지
* 어떤 제약과 작업 지침을 항상 포함해야 하는지
* 어떤 내용을 명시적으로 out of scope로 둘지

중요:
프롬프트 실행 기능을 추가하지 마세요.
Codex CLI를 호출하지 마세요.
Claude Code CLI를 호출하지 마세요.
Cursor를 자동 실행하지 마세요.
외부 앱을 자동 제어하지 마세요.
프롬프트 실행 결과 저장 기능을 추가하지 마세요.
prompt_runs, agent_runs, execution_results, validation_results, run_logs를 만들거나 사용하지 마세요.
OS 전역 단축키를 추가하지 마세요.
window.prompter.appEvents.*를 추가하지 마세요.
window.prompter.shortcuts.*를 추가하지 마세요.
quick_capture_* settings key를 추가하지 마세요.
QuickCaptureSettingsSchema를 추가하지 마세요.
RegisterGlobalShortcutInputSchema를 추가하지 마세요.
이번 단계는 하네스 템플릿 관리와 프롬프트 컴파일러 연결에만 집중합니다.

Phase 11과의 중요한 연결 규칙:

* Phase 11에서 구현된 quick capture 동작을 변경하지 마세요.
* quick capture가 가져온 original input을 하네스 템플릿 선택 과정에서 자동 변경하거나 정리하지 마세요.
* 하네스 템플릿 선택은 current draft의 original input을 훼손하면 안 됩니다.
* 하네스 템플릿 선택은 자동 LLM analyze를 실행하면 안 됩니다.
* 하네스 템플릿 선택은 자동 저장을 실행하면 안 됩니다.
* 하네스 템플릿 선택은 quick capture stale state 초기화 로직을 망가뜨리면 안 됩니다.
* 하네스 템플릿 변경으로 scenario 또는 target agent를 자동 덮어쓰지 마세요.
* 필요한 경우 “이 템플릿의 scenario/target agent를 현재 draft에 적용” 같은 명시적 버튼을 제공할 수는 있습니다.
* 기본 동작은 현재 draft의 scenario와 target agent를 보존하는 것입니다.

아키텍처 요구사항:

* renderer는 DB에 직접 접근하면 안 됩니다.
* renderer는 preload bridge에 노출된 typed API만 사용해야 합니다.
* harness_templates CRUD는 Electron main process repository/service를 통해 처리합니다.
* 모든 IPC 입력값은 Zod로 검증합니다.
* 하네스 템플릿 파싱 및 검증 로직은 UI 컴포넌트에 직접 넣지 말고 shared schema 또는 utility로 분리합니다.
* PromptCompilerService에서 하네스 템플릿을 사용할 때도 main process 경계를 유지합니다.
* LLM 시스템 프롬프트 자체를 사용자가 완전히 덮어쓰게 만들지 마세요.
* 사용자 정의 하네스는 “추가 컴파일 지침”으로 사용하고, 앱의 기본 안전/구조화 규칙은 유지해야 합니다.
* 하네스 템플릿은 코드로 실행하지 않습니다.
* template_body는 단순 문자열 템플릿으로만 취급합니다.
* eval, new Function, 동적 import를 사용하지 마세요.

기존 DB 스키마:
harness_templates 테이블은 다음 필드를 가진다고 가정합니다.

* id
* name
* scenario
* target_agent
* template_body
* required_fields
* clarification_policy
* created_at
* updated_at

가능하면 기존 스키마를 그대로 사용하세요.

선택적 스키마 확장:
구현 부담이 낮고 기존 migration 구조가 안정적이라면 다음 필드를 추가해도 됩니다.

* description: text, nullable
* is_builtin: integer 또는 boolean, default false
* is_archived: integer 또는 boolean, default false

단, 스키마 확장이 범위를 키우면 기존 필드만 사용하세요.
이번 단계의 핵심은 CRUD, UI, compiler 연결입니다.

절대 추가하지 말아야 할 스키마:

* prompt_runs
* agent_runs
* execution_results
* validation_results
* run_logs
* quick_capture_settings
* clipboard_history
* shortcut_bindings

이번 단계에서 구현할 주요 기능:

1. 기본 하네스 템플릿 seed

앱 초기화 시 기본 하네스 템플릿을 준비합니다.

기본 시나리오:

* feature
* bugfix
* refactor
* code_review
* docs
* research

기본 대상 에이전트:

* codex
* claude_code
* cursor
* generic_agent

MVP에서는 모든 scenario x target_agent 조합을 만들 필요는 없습니다.
우선 각 scenario별 generic_agent 템플릿 6개를 만들고, 필요하면 codex 전용 템플릿 몇 개만 추가해도 됩니다.

권장 기본 템플릿:

* Feature Implementation
* Bug Fix
* Refactor
* Code Review
* Documentation
* Research / Planning

seed 요구사항:

* 앱 시작 시 기본 템플릿이 없으면 생성합니다.
* 이미 존재하는 기본 템플릿을 중복 생성하지 않습니다.
* 사용자가 수정한 템플릿을 매번 덮어쓰지 마세요.
* 기본 템플릿을 재설정하는 기능은 별도 액션으로 제공합니다.
* seed 로직은 main process에 위치합니다.
* seedDefaults는 idempotent해야 합니다.
* seedDefaults를 여러 번 호출해도 같은 기본 템플릿이 계속 늘어나면 안 됩니다.

2. 하네스 템플릿 목록 UI

왼쪽 사이드바의 하네스 템플릿 섹션을 실제 DB와 연결합니다.

표시할 정보:

* name
* scenario
* target_agent
* updated_at
* builtin 여부, 구현한 경우
* archived 여부, 구현한 경우

기능:

* 전체 하네스 템플릿 목록 표시
* scenario 필터
* target_agent 필터
* 템플릿 이름 검색, 간단 구현
* 선택된 템플릿 시각적 강조
* 템플릿이 없을 때 empty state 표시
* 목록 loading / error 상태 표시

주의:

* 왼쪽 사이드바가 이미 프로젝트, 태그, 하네스 섹션을 가진 경우 기존 레이아웃을 유지하세요.
* Phase 11의 quick capture 버튼이나 메뉴 동작과 충돌하지 않게 합니다.

3. 하네스 템플릿 관리 화면 진입점

하네스 템플릿 관리 화면 또는 패널로 진입할 수 있어야 합니다.

가능한 진입점:

* 왼쪽 사이드바의 하네스 템플릿 섹션
* 하네스 템플릿 목록의 “관리” 버튼
* PromptCompilerPanel의 하네스 선택 UI 옆 “편집” 버튼
* 앱 메뉴의 View 또는 Tools 메뉴에 “Manage Harness Templates” 항목 추가, 선택

메뉴를 추가하는 경우:

* Phase 10/11에서 사용한 기존 menu.onAction / MENU_ACTION_CHANNEL 패턴을 재사용합니다.
* window.prompter.appEvents.*를 새로 만들지 마세요.
* 별도 shortcuts bridge를 만들지 마세요.
* OS globalShortcut을 등록하지 마세요.
* renderer에 ipcRenderer를 직접 노출하지 마세요.

4. 하네스 템플릿 상세 화면

선택한 하네스 템플릿의 상세 정보를 볼 수 있어야 합니다.

표시 항목:

* name
* description, 있는 경우
* scenario
* target_agent
* required_fields
* clarification_policy
* template_body
* created_at
* updated_at

required_fields와 clarification_policy는 JSON 문자열로 저장되어 있을 수 있습니다.
UI에서는 가능한 경우 보기 좋게 파싱해서 표시합니다.
파싱 실패 시 앱이 crash되지 않고 raw text와 경고를 표시해야 합니다.

5. 하네스 템플릿 생성

새 하네스 템플릿을 생성할 수 있어야 합니다.

입력 필드:

* name, 필수
* description, 선택, 스키마 확장한 경우
* scenario, 필수
* target_agent, 필수
* required_fields, 선택
* clarification_policy, 선택
* template_body, 필수

required_fields 입력 방식:

* MVP에서는 JSON textarea로 충분합니다.
* 배열 요소는 string이어야 합니다.

required_fields 예시:
[
"objective",
"project_context",
"tech_stack",
"constraints",
"acceptance_criteria",
"validation_commands"
]

clarification_policy 입력 방식:

* MVP에서는 JSON textarea로 충분합니다.
* object 형태여야 합니다.

clarification_policy 예시:
{
"maxQuestions": 3,
"askOnlyIfMaterial": true,
"preferAssumptionsForLowRiskGaps": true
}

template_body:

* Markdown 또는 plain text 템플릿
* 필수 섹션과 기본 지침을 포함할 수 있음
* textarea 또는 기존 editor 컴포넌트 재사용
* template_body는 코드가 아니라 텍스트입니다.

6. 하네스 템플릿 수정

기존 하네스 템플릿을 수정할 수 있어야 합니다.

요구사항:

* name, scenario, target_agent, required_fields, clarification_policy, template_body 수정 가능
* 저장 전 JSON 필드 검증
* 저장 성공/실패 메시지 표시
* 저장 후 updated_at 갱신
* 목록과 상세 UI 갱신

builtin 템플릿 처리:

* is_builtin을 구현한 경우 기본 템플릿 직접 수정 허용 여부를 결정합니다.
* 권장 방식:

  * builtin 템플릿은 직접 수정하지 않고 “복제 후 수정”을 유도합니다.
* 단순 MVP에서는 builtin 개념 없이 모두 수정 가능하게 해도 됩니다.
* 선택한 정책을 작업 후 명확히 설명하세요.

7. 하네스 템플릿 복제

선택한 템플릿을 복제할 수 있어야 합니다.

동작:

* 기존 템플릿 값을 복사
* name 뒤에 “복사본” 또는 “Copy” 추가
* 새 id 생성
* created_at, updated_at 새로 설정
* 복제된 템플릿 선택

요구사항:

* 복제된 템플릿은 사용자 편집 가능해야 합니다.
* builtin 템플릿을 커스터마이징하려는 경우 복제가 기본 경로가 되면 좋습니다.

8. 하네스 템플릿 삭제 또는 보관

사용자 생성 템플릿을 삭제할 수 있어야 합니다.

요구사항:

* 삭제 전 confirmation dialog 표시
* 삭제 후 목록 갱신
* 삭제된 템플릿이 현재 PromptCompilerPanel에서 선택되어 있으면 선택 해제 또는 기본 템플릿으로 fallback
* builtin 템플릿은 삭제하지 못하게 하거나, 삭제 대신 reset 기능을 제공하세요.

is_archived를 구현했다면:

* 실제 삭제 대신 archive 처리 가능
* archived 템플릿은 기본 목록에서 숨김
* 필요하면 “보관된 템플릿 보기” 제공

범위가 커지면 실제 삭제만 구현해도 됩니다.
단, builtin 템플릿 삭제는 막는 것을 권장합니다.

9. 기본 템플릿 재설정

가능하면 기본 하네스 템플릿을 재설정하는 기능을 제공합니다.

동작:

* 기본 템플릿을 초기 값으로 복구
* 사용자 생성 템플릿은 건드리지 않음
* 사용자에게 확인 dialog 표시

범위가 커진다면 이번 단계에서는 seed만 구현하고 reset은 나중으로 미뤄도 됩니다.

10. PromptCompilerPanel과 하네스 템플릿 연결

프롬프트 컴파일러에서 사용할 하네스 템플릿을 선택할 수 있게 합니다.

UI:

* PromptCompilerPanel에 “하네스 템플릿” 선택 필드 추가
* 선택지는 현재 draft의 scenario와 target_agent에 맞는 템플릿을 우선 표시
* 전체 템플릿 보기 옵션도 가능
* 선택된 템플릿의 요약 정보 표시
* 선택된 템플릿이 현재 draft scenario / target_agent와 다르면 경고 또는 안내 표시

중요한 동작 규칙:

* 하네스 템플릿을 선택해도 originalInput을 변경하지 않습니다.
* 하네스 템플릿을 선택해도 current draft의 scenario를 자동 변경하지 않습니다.
* 하네스 템플릿을 선택해도 current draft의 target_agent를 자동 변경하지 않습니다.
* 하네스 템플릿을 선택해도 자동 analyze를 실행하지 않습니다.
* 하네스 템플릿을 선택해도 자동 compile을 실행하지 않습니다.
* 하네스 템플릿을 선택해도 자동 저장하지 않습니다.

선택 구현:

* “템플릿의 scenario/target agent를 현재 draft에 적용” 버튼을 제공할 수 있습니다.
* 이 경우 사용자 명시 클릭이 있어야 합니다.
* 적용 시 기존 analyze / compile 결과는 stale이므로 초기화해야 합니다.

11. stale compiler state 초기화

다음 변경이 발생하면 기존 analyze / compile 결과는 현재 draft와 맞지 않을 수 있으므로 초기화해야 합니다.

초기화 대상:

* analyze summary
* detected scenario
* detected target agent
* clarification questions
* clarification answers
* assumptions
* compiledPrompt
* suggestedTags
* warnings
* qualityScore

초기화 트리거:

* originalInput 변경
* scenario 변경
* targetAgent 변경
* harnessTemplateId 변경
* projectContext 변경
* techStack 변경
* constraints 변경
* acceptanceCriteria 변경
* validationCommands 변경
* additionalNotes 변경

중요:

* Phase 11의 quick capture가 stale compiler state를 초기화하는 기존 흐름과 충돌하지 않게 합니다.
* 하네스 템플릿 선택도 같은 stale state 초기화 규칙을 사용하도록 하세요.
* 단, 하네스 템플릿 선택은 originalInput 자체를 바꾸지 않습니다.

12. 정적 템플릿 컴파일러와 연결

Phase 4의 정적 템플릿 기반 컴파일러가 선택된 하네스 템플릿을 반영할 수 있게 합니다.

요구사항:

* template_body를 compiledPrompt 생성에 반영
* required_fields를 기반으로 누락된 필드를 assumptions 또는 warnings로 표시
* clarification_policy는 정적 컴파일에서는 제한적으로만 사용해도 됩니다.
* 템플릿이 없거나 파싱에 실패하면 기존 기본 정적 템플릿으로 fallback

placeholder 치환:
다음 placeholder를 지원합니다.

* {{title}}
* {{originalInput}}
* {{scenario}}
* {{targetAgent}}
* {{projectContext}}
* {{techStack}}
* {{constraints}}
* {{acceptanceCriteria}}
* {{validationCommands}}
* {{additionalNotes}}

placeholder 치환 규칙:

* 단순 문자열 치환만 수행합니다.
* eval, new Function, 동적 JS 실행 금지
* unknown placeholder는 그대로 두거나 경고로 표시합니다.
* 원본 whitespace를 보존합니다.
* originalInput은 trim하거나 cleanup하지 않습니다.
* Markdown, code, diff 입력을 훼손하지 않습니다.

13. LLM analyze / compile과 연결

Phase 5의 PromptCompilerService에서 선택된 harnessTemplateId를 입력으로 받을 수 있게 합니다.

analyze input에 추가:

* harnessTemplateId?: string | null

compile input에 추가:

* harnessTemplateId?: string | null

main process 동작:

* harnessTemplateId가 있으면 DB에서 해당 템플릿 조회
* 템플릿의 template_body, required_fields, clarification_policy를 PromptCompilerService에 전달
* LLM 시스템 프롬프트의 기본 안전 규칙은 유지
* 하네스 템플릿은 추가 지침 또는 scenario-specific compiler harness로 반영
* 하네스 템플릿이 존재하지 않으면 명확한 recoverable error 또는 fallback 처리

중요:

* 사용자 template_body가 시스템 프롬프트 전체를 덮어쓰면 안 됩니다.
* 하네스 템플릿은 “컴파일 형식과 우선순위”를 안내하는 용도로 사용합니다.
* 앱이 기본적으로 요구하는 JSON 출력 스키마는 계속 유지해야 합니다.
* LLM 출력은 기존처럼 Zod로 검증해야 합니다.
* 하네스 선택만으로 자동 LLM 호출을 하면 안 됩니다.

14. 하네스 템플릿 미리보기

템플릿 상세 화면 또는 편집 화면에서 샘플 입력을 기반으로 결과 미리보기를 제공합니다.

MVP 미리보기:

* 실제 LLM 호출 없이 local placeholder preview만 수행
* sampleValues를 사용해 template_body 치환 결과 표시
* 원문 whitespace 보존
* preview 결과는 자동 저장하지 않음

주의:

* 미리보기 버튼이 자동으로 OpenAI API를 호출하지 않게 합니다.
* 비용이 발생하는 작업은 사용자가 명시적으로 analyze 또는 compile을 실행할 때만 수행합니다.

15. 하네스 템플릿 유효성 검사

저장 전 다음을 검증합니다.

name:

* trim 후 빈 문자열 불가
* 너무 긴 이름 제한

scenario:

* 허용된 PromptScenario 중 하나

target_agent:

* 허용된 TargetAgent 중 하나

template_body:

* 빈 문자열 불가
* 너무 짧으면 경고 가능
* 필수 placeholder가 없어도 저장은 허용하되 경고 가능

required_fields:

* 비어 있거나 valid JSON array
* 배열 요소는 string
* 알 수 없는 field name은 경고 가능

clarification_policy:

* 비어 있거나 valid JSON object
* maxQuestions가 있으면 1 이상 5 이하 권장
* askOnlyIfMaterial이 있으면 boolean
* preferAssumptionsForLowRiskGaps가 있으면 boolean

16. IPC API 요구사항

preload bridge에 필요한 API를 추가하거나 기존 harnessTemplates API를 보완합니다.

권장 API:

* window.prompter.harnessTemplates.list(input?)
* window.prompter.harnessTemplates.get(id)
* window.prompter.harnessTemplates.create(input)
* window.prompter.harnessTemplates.update(id, input)
* window.prompter.harnessTemplates.delete(id)
* window.prompter.harnessTemplates.duplicate(id)
* window.prompter.harnessTemplates.seedDefaults()
* window.prompter.harnessTemplates.resetDefaults(), 선택
* window.prompter.harnessTemplates.preview(input)

list input 예시:

* scenario?: PromptScenario | null
* targetAgent?: TargetAgent | null
* query?: string
* includeArchived?: boolean

preview input 예시:

* templateBody: string
* sampleValues: Record<string, string>

금지:

* window.prompter.appEvents.* 추가 금지
* window.prompter.shortcuts.* 추가 금지
* globalShortcut 관련 API 추가 금지
* quick_capture_* settings API 추가 금지

17. Zod schema 요구사항

다음 schema를 정의하거나 보완합니다.

* HarnessTemplateSchema
* CreateHarnessTemplateInputSchema
* UpdateHarnessTemplateInputSchema
* ListHarnessTemplatesInputSchema
* DuplicateHarnessTemplateInputSchema
* DeleteHarnessTemplateInputSchema
* PreviewHarnessTemplateInputSchema
* RequiredFieldsSchema
* ClarificationPolicySchema

검증 규칙:

* name은 trim 후 빈 문자열 불가
* scenario는 허용된 enum
* targetAgent는 허용된 enum
* templateBody는 빈 문자열 불가
* requiredFields는 JSON string 또는 string array를 안전하게 처리
* clarificationPolicy는 JSON string 또는 object를 안전하게 처리
* query는 optional string, trim 처리
* sampleValues는 Record<string, string>만 허용

추가하지 말아야 할 schema:

* QuickCaptureSettingsSchema
* RegisterGlobalShortcutInputSchema
* ClipboardHistorySchema
* PromptRunSchema
* AgentRunSchema
* ExecutionResultSchema

18. UI 구조 권장

기존 구조에 맞추되 다음 컴포넌트를 권장합니다.

Renderer:

* src/renderer/components/harness/HarnessTemplateList.tsx
* src/renderer/components/harness/HarnessTemplateDetail.tsx
* src/renderer/components/harness/HarnessTemplateEditor.tsx
* src/renderer/components/harness/HarnessTemplatePreview.tsx
* src/renderer/components/harness/HarnessTemplateSelector.tsx
* src/renderer/hooks/useHarnessTemplates.ts

Shared:

* src/shared/harness/harnessSchemas.ts
* src/shared/harness/harnessTypes.ts
* src/shared/harness/defaultHarnessTemplates.ts
* src/shared/harness/renderHarnessTemplate.ts
* src/shared/harness/validateHarnessTemplate.ts

Main:

* src/main/repositories/harnessTemplateRepository.ts
* src/main/services/harnessTemplateService.ts
* src/main/ipc/harnessTemplates.ts

Compiler 연결:

* 기존 static prompt compiler 파일
* 기존 PromptCompilerService
* 기존 promptCompiler IPC schema

정확한 파일명은 기존 프로젝트 구조에 맞춰 조정해도 됩니다.
단, template rendering, validation, UI, DB repository를 한 파일에 뒤섞지 마세요.

19. Settings와의 연결

이번 단계에서는 Settings 연결을 최소화합니다.

기본 방침:

* 새 quick_capture 관련 settings를 추가하지 않습니다.
* 하네스 템플릿 선택 상태는 우선 PromptCompilerPanel draft state에서 관리합니다.
* default_harness_template_id 같은 설정은 이번 단계에서 필수로 구현하지 않습니다.

선택 구현:

* 설정 구조가 이미 안정적이라면 default_harness_template_id 정도만 추가할 수 있습니다.
* 단, scenario별 default harness 설정은 이번 단계에서 제외하는 것을 권장합니다.
* 설정을 추가할 경우 quick_capture settings와 섞지 마세요.

20. 데이터 일관성 요구사항

* 하네스 템플릿 삭제 후 PromptCompilerPanel이 깨지지 않아야 합니다.
* 선택된 하네스 템플릿이 삭제되면 기본 템플릿으로 fallback하거나 선택 해제해야 합니다.
* template_body JSON 파싱 실패 또는 placeholder 오류로 앱이 crash되면 안 됩니다.
* required_fields나 clarification_policy가 잘못 저장된 기존 데이터가 있어도 상세 화면에서 안전하게 표시해야 합니다.
* seedDefaults는 중복 템플릿을 무한 생성하지 않아야 합니다.
* 하네스 템플릿 변경 후 기존 quick capture draft의 originalInput이 보존되어야 합니다.
* 하네스 템플릿 변경 후 stale analyze/compile state는 초기화되어야 합니다.

21. 보안 요구사항

* template_body를 실행 가능한 코드로 취급하지 마세요.
* eval, new Function, 동적 import를 사용하지 마세요.
* placeholder 치환은 단순 문자열 치환만 수행합니다.
* renderer에서 DB, fs, path, process에 직접 접근하지 않습니다.
* renderer에서 ipcRenderer를 직접 사용하지 않습니다.
* prompt execution 또는 외부 프로세스 실행 기능을 추가하지 않습니다.
* 하네스 템플릿에 API Key나 secret을 저장하라고 권장하지 마세요.
* template_body를 로그에 과하게 남기지 마세요. 사용자가 민감한 내용을 넣을 수 있습니다.
* originalInput, clipboard text, compiledPrompt를 불필요하게 console.log하지 마세요.
* LLM 호출은 사용자가 명시적으로 analyze 또는 compile을 실행할 때만 발생해야 합니다.

22. TDD 구현 순서

가능하면 다음 순서로 구현하세요.

1. shared harness schema 테스트 작성

* valid create input
* invalid name
* invalid scenario
* invalid targetAgent
* invalid requiredFields JSON
* invalid clarificationPolicy JSON

2. renderHarnessTemplate 테스트 작성

* placeholder 치환
* unknown placeholder 처리
* whitespace 보존
* originalInput trim/cleanup 없음
* code block과 diff text 보존

3. defaultHarnessTemplates 테스트 작성

* 기본 템플릿 개수
* 각 템플릿 필수 필드 존재
* scenario enum 유효성
* targetAgent enum 유효성

4. main repository/service 테스트 작성, 가능하면

* seedDefaults idempotent
* create/list/get/update/delete
* duplicate
* delete 후 fallback 가능성

5. PromptCompilerService 연결 테스트, 가능하면

* harnessTemplateId가 input에 포함됨
* 템플릿이 추가 지침으로만 반영됨
* JSON output schema는 유지됨
* 템플릿 없음 fallback 또는 recoverable error

6. renderer hook/component 테스트, 가능하면

* list loading/error/empty
* create validation
* edit validation
* duplicate
* delete confirmation
* selector가 draft scenario/targetAgent를 자동 덮어쓰지 않음

테스트 인프라가 부족하면 순수 함수와 schema 테스트를 우선하세요.

23. 파일별 예상 변경

예상 변경 파일:

* shared harness schema/type 파일 추가 또는 보완
* default harness template 파일 추가
* harness template renderer utility 추가
* harness template repository/service 보완
* harnessTemplates IPC handler 보완
* preload bridge 타입 추가
* Sidebar 하네스 섹션 연결
* HarnessTemplateList / Detail / Editor / Preview / Selector 컴포넌트 추가
* PromptCompilerPanel에 harnessTemplateId draft state 추가
* static compiler에 harness template 반영
* PromptCompilerService analyze/compile input에 harnessTemplateId 추가
* 관련 테스트 파일 추가

건드리지 말아야 할 것:

* quick capture cleanup/trim 로직 추가 금지
* quick_capture settings 추가 금지
* globalShortcut 추가 금지
* appEvents bridge 추가 금지
* shortcuts bridge 추가 금지
* prompt_runs 관련 schema 추가 금지
* 실행 결과 저장 관련 코드 추가 금지

24. 의존성 그래프

권장 의존성 방향:

shared/harness schemas
→ main harness repository/service
→ main IPC harnessTemplates
→ preload typed bridge
→ renderer hooks
→ renderer components
→ PromptCompilerPanel selector
→ static compiler / PromptCompilerService integration

금지 방향:

* renderer → DB 직접 접근
* renderer → Electron ipcRenderer 직접 접근
* renderer → fs/path/process 직접 접근
* harness template → prompt execution service
* template_body → executable code

25. 자동 테스트 목록

가능한 경우 다음 테스트를 추가하세요.

Schema:

* CreateHarnessTemplateInputSchema accepts valid input
* CreateHarnessTemplateInputSchema rejects empty name
* CreateHarnessTemplateInputSchema rejects invalid scenario
* CreateHarnessTemplateInputSchema rejects invalid targetAgent
* requiredFields parser rejects invalid JSON
* clarificationPolicy parser rejects invalid JSON
* clarificationPolicy maxQuestions bounds

Template rendering:

* replaces known placeholders
* preserves whitespace
* preserves code fences
* preserves diff blocks
* leaves unknown placeholders safe
* does not trim originalInput
* does not execute template content

Seed:

* seedDefaults creates defaults once
* seedDefaults is idempotent
* duplicate creates a new id and modified name

Compiler integration:

* analyze input accepts harnessTemplateId
* compile input accepts harnessTemplateId
* missing harness template does not crash app
* selected harness does not remove mandatory output schema constraints

UI behavior, if testable:

* selecting harness does not modify originalInput
* selecting harness does not auto-run analyze
* selecting harness does not auto-save
* selecting harness clears stale compiledPrompt
* applying scenario/target from template requires explicit action, if implemented

26. 수동 QA 체크리스트

| 항목                           | 기대 결과                                                     |
| ---------------------------- | --------------------------------------------------------- |
| 앱 시작                         | 기본 하네스 템플릿이 중복 없이 준비됨                                     |
| 하네스 목록 열기                    | 템플릿 목록이 표시됨                                               |
| 하네스 검색                       | 이름 검색이 동작함                                                |
| scenario 필터                  | 해당 시나리오 템플릿만 표시됨                                          |
| targetAgent 필터               | 해당 에이전트 템플릿만 표시됨                                          |
| 템플릿 상세 보기                    | required_fields, clarification_policy, template_body가 표시됨 |
| 잘못된 JSON 입력                  | 저장 전 오류 표시                                                |
| 새 템플릿 생성                     | 목록에 추가되고 선택 가능                                            |
| 템플릿 수정                       | 저장 후 updated_at과 상세가 갱신됨                                  |
| 템플릿 복제                       | 새 id와 복사본 이름으로 생성됨                                        |
| 템플릿 삭제                       | 확인 후 삭제되고 UI가 깨지지 않음                                      |
| PromptCompilerPanel에서 템플릿 선택 | originalInput은 보존됨                                        |
| 템플릿 선택                       | scenario/targetAgent가 자동 덮어써지지 않음                         |
| 템플릿 선택                       | 자동 analyze가 실행되지 않음                                       |
| 템플릿 선택                       | 자동 저장되지 않음                                                |
| quick capture 후 템플릿 선택       | clipboard 원문 whitespace가 유지됨                              |
| 정적 컴파일                       | 선택된 하네스 template_body가 반영됨                                |
| LLM analyze                  | 선택된 harnessTemplateId가 반영됨                                |
| LLM compile                  | 기본 JSON output schema 검증이 유지됨                             |
| 템플릿 삭제 후 compiler            | fallback 또는 선택 해제로 crash 없음                               |
| 앱 재시작                        | 사용자 생성 템플릿 유지                                             |
| prompt_runs 확인               | 실행 결과 관련 데이터 생성 없음                                        |

27. Attribution

이 Phase 12 명세는 Phase 11의 최종 구현 범위와 guardrail을 반영합니다.

반영된 Phase 11 결정:

* 빠른 캡처는 버튼 + File 메뉴 + 앱 포커스 상태의 CmdOrCtrl+Shift+V accelerator로 한정
* 기존 menu.onAction / MENU_ACTION_CHANNEL 재사용
* 별도 window.prompter.appEvents.* 추가 없음
* 별도 window.prompter.shortcuts.* 추가 없음
* OS globalShortcut 없음
* quick_capture_* settings 없음
* 클립보드 텍스트 원문 보존
* 자동 trim/cleanup 없음
* append 옵션 없음
* 기존 입력이 있으면 overwrite confirmation만 사용
* long-text threshold는 hook 내부 상수 20000
* default scenario / target agent는 현재 draft 값을 보존
* no-auto-LLM, no-auto-save, no-log, no-persistence guardrail 유지

Phase 12에서 이 결정을 깨뜨리지 마세요.

28. 이번 단계에서 구현하지 말 것

다음은 절대 구현하지 마세요.

* 프롬프트 실행 기능
* Codex CLI 실행
* Codex OAuth
* Claude Code 실행
* Cursor 실행
* 외부 앱 자동 제어
* OS 전역 단축키
* window.prompter.appEvents.*
* window.prompter.shortcuts.*
* quick_capture_* settings
* QuickCaptureSettingsSchema
* RegisterGlobalShortcutInputSchema
* clipboard history
* background clipboard watch
* external selected text 읽기
* prompt_runs
* agent_runs
* execution_results
* validation_results
* run_logs
* 실행 결과 저장
* 클라우드 동기화
* 팀 협업
* 하네스 템플릿 marketplace
* 원격 템플릿 다운로드
* 템플릿 안에서 코드 실행
* 자동 LLM 호출 미리보기

완료 기준:

* 기본 하네스 템플릿 seed가 구현되어 있습니다.
* seedDefaults는 idempotent합니다.
* 하네스 템플릿 목록, 상세, 생성, 수정, 복제, 삭제 UI가 구현되어 있습니다.
* required_fields와 clarification_policy를 안전하게 검증합니다.
* PromptCompilerPanel에서 하네스 템플릿을 선택할 수 있습니다.
* 하네스 선택은 originalInput, scenario, targetAgent를 자동 덮어쓰지 않습니다.
* 하네스 선택은 자동 analyze, 자동 compile, 자동 저장을 실행하지 않습니다.
* 하네스 선택은 stale compiler state를 안전하게 초기화합니다.
* 선택된 하네스 템플릿이 정적 컴파일러와 LLM PromptCompilerService에 반영됩니다.
* 하네스 템플릿이 없거나 잘못된 경우에도 기본 fallback이 동작합니다.
* 모든 IPC 입력값은 Zod로 검증됩니다.
* renderer는 DB에 직접 접근하지 않습니다.
* template_body는 코드로 실행되지 않습니다.
* Phase 11 quick capture guardrail이 유지됩니다.
* TypeScript 타입 검사가 통과합니다.
* 앱이 개발 모드에서 정상 실행됩니다.
* 프롬프트 실행이나 실행 결과 저장 기능은 추가되지 않았습니다.

작업 전:

1. 현재 Phase 0부터 Phase 11까지의 코드 구조를 확인합니다.
2. Phase 11의 quick capture 구현을 확인합니다.
3. 기존 menu.onAction / MENU_ACTION_CHANNEL 패턴을 확인합니다.
4. window.prompter.clipboard.readText() 구현과 타입을 확인합니다.
5. PromptCompilerPanel의 draft state와 stale state 초기화 방식을 확인합니다.
6. harness_templates DB schema와 repository 구현 상태를 확인합니다.
7. 기존 Sidebar의 하네스 템플릿 placeholder 위치를 확인합니다.
8. PromptCompilerPanel의 scenario, targetAgent, analyze, compile 입력 구조를 확인합니다.
9. PromptCompilerService의 main process 입력 schema를 확인합니다.
10. 정적 템플릿 컴파일러가 어디에 구현되어 있는지 확인합니다.
11. 하네스 템플릿 seed 로직을 어디에 둘지 계획합니다.
12. 하네스 템플릿이 LLM 시스템 프롬프트를 덮어쓰지 않고 추가 지침으로만 반영되도록 설계합니다.
13. TDD 순서에 따라 schema와 template rendering 테스트를 먼저 작성합니다.
14. 간결한 구현 계획을 세운 뒤 Phase 12만 구현합니다.

작업 후:

1. 변경된 내용을 요약합니다.
2. 생성되거나 수정된 파일 목록을 제공합니다.
3. schema 또는 migration 변경이 있다면 설명합니다.
4. 기본 하네스 템플릿 seed 방식을 설명합니다.
5. 하네스 템플릿 CRUD 데이터 흐름을 설명합니다.
6. PromptCompilerPanel과 하네스 템플릿의 연결 방식을 설명합니다.
7. 하네스 선택이 draft scenario/targetAgent/originalInput을 자동 덮어쓰지 않는 방식을 설명합니다.
8. stale compiler state 초기화 방식을 설명합니다.
9. LLM PromptCompilerService에 하네스 템플릿이 어떻게 반영되는지 설명합니다.
10. template_body를 코드로 실행하지 않도록 한 보안 방식을 설명합니다.
11. Phase 11 quick capture guardrail을 유지한 방식을 설명합니다.
12. 추가한 테스트와 테스트 결과를 설명합니다.
13. 앱 실행 및 타입 검사 명령어를 제공합니다.
14. 수동 테스트 절차를 제공합니다.
15. 아직 구현하지 않은 기능을 명확히 구분해서 설명합니다.
