당신은 Prompter라는 Electron 데스크톱 앱을 개발하고 있습니다.

Prompter는 로컬 우선(local-first) 프롬프트 컴파일러이자 프롬프트 라이브러리입니다. 이 앱의 목적은 모호한 인간의 요청을 에이전트가 실행 가능한 프롬프트로 변환하고, 이를 버전 관리되는 프롬프트 자산으로 저장하며, Codex, Claude Code, Cursor 및 일반 LLM 에이전트에 사용할 수 있도록 내보내는 것입니다.

현재까지 완료되었다고 가정하는 단계:

Phase 0:

- Electron, React, TypeScript, Vite 기반 앱 골격
- main, preload, renderer 분리
- 안전한 Electron 기본 설정
- typed preload bridge
- IPC ping/pong 테스트

Phase 1:

- Tailwind CSS 기반 기본 UI
- 3단 레이아웃
- 재사용 가능한 기본 UI 컴포넌트

Phase 2:

- SQLite + Drizzle ORM + better-sqlite3 기반 로컬 DB
- DB는 Electron main process에서만 접근
- renderer는 typed IPC를 통해서만 DB 기능 호출
- Zod 기반 IPC 입력값 검증
- prompt_assets.parent_prompt_id 필드 존재 가능

Phase 3:

- 프로젝트 생성 및 프로젝트별 프롬프트 목록 표시
- PromptAsset + PromptVersion 저장
- 프롬프트 선택 및 상세 표시

Phase 4:

- 정적 템플릿 기반 프롬프트 컴파일러 UI
- 생성 프롬프트 저장 가능

Phase 9:

- Settings UI
- OpenAI API Key 안전 저장
- 기본 모델, 대상 에이전트, 시나리오 설정

Phase 5:

- LLM 기반 analyze / compile
- clarification question 생성
- 최종 compiledPrompt 생성
- LLM 호출은 Electron main process에서만 수행

Phase 6:

- 프롬프트 버전 관리
- current version 지정
- 새 버전 저장
- diff view

Phase 7:

- SQLite FTS 검색
- 태그 생성, 연결, 제거
- 프로젝트, 태그, 시나리오, 대상 에이전트 필터

Phase 8:

- Markdown, Codex, Claude Code, Cursor, Generic Agent export
- [AGENTS.md](http://AGENTS.md) snippet export
- [SKILL.md](http://SKILL.md) draft export
- 클립보드 복사 및 파일 저장

Phase 10:

- 테스트, polish, macOS 패키징
- 키보드 단축키
- 앱 메뉴
- 보안 점검
- README 및 QA 체크리스트
- narrow menu action channel 구현

Phase 11:

- 빠른 캡처는 버튼 + File 메뉴 + 앱 포커스 상태의 CmdOrCtrl+Shift+V accelerator로 한정
- window.prompter.clipboard.readText() 최소 API 구현
- 기존 menu.onAction / MENU_ACTION_CHANNEL 재사용
- OS 전역 단축키 없음

 *quick_capture_* settings 없음

- 클립보드 텍스트 원문 보존
- 자동 trim/cleanup 없음
- append 옵션 없음
- 자동 LLM 호출 없음
- 자동 저장 없음
- 클립보드 내용 로그 없음
- 클립보드 내용 자동 persistence 없음

Phase 12:

- 기본 하네스 템플릿 seed
- 하네스 템플릿 목록, 상세, 생성, 수정, 복제, 삭제 UI
- PromptCompilerPanel에서 하네스 템플릿 선택 가능
- 선택된 하네스 템플릿이 정적 컴파일러와 LLM PromptCompilerService에 반영됨
- 하네스 선택은 originalInput, scenario, targetAgent를 자동 덮어쓰지 않음
- 하네스 선택은 자동 analyze, 자동 compile, 자동 저장을 실행하지 않음
- 하네스 선택 시 stale compiler state 초기화
- template_body는 코드로 실행되지 않음

Phase 13:

- 프로젝트별 context profile CRUD
- 프로젝트마다 default context profile 지정 가능
- PromptCompilerPanel에서 project context profile 선택 및 include 가능
- 정적 컴파일러와 LLM PromptCompilerService에 project context profile 반영
- project context는 originalInput, manual context, scenario, targetAgent를 자동 덮어쓰지 않음
- context 선택은 자동 analyze, 자동 compile, 자동 저장을 실행하지 않음
- repo_path가 있어도 파일 시스템 자동 접근 없음

Phase 14:

- Local heuristic Prompt Quality Reviewer
- 저장된 PromptVersion과 현재 draft compiledPrompt 품질 리뷰 가능
- API Key 없이 local review 동작
- LLM review는 사용자가 명시적으로 클릭한 경우에만 main process에서 실행
- 리뷰 결과는 자동으로 prompt를 수정하지 않음
- 리뷰 결과는 자동으로 quality_score를 업데이트하지 않음
- improvedPromptDraft는 자동 덮어쓰기 없이 새 PromptVersion으로 저장 가능
- prompt_quality_reviews 테이블을 추가한 경우에도 prompt_runs와 분리됨

이 작업은 Phase 15: 프롬프트 파생 / 복제 / 템플릿화 워크플로입니다.

목표:

좋은 프롬프트를 기반으로 새 프롬프트를 빠르게 만들 수 있도록 “복제”, “파생”, “템플릿화”, “계보 보기” 기능을 구현합니다. 사용자는 기존 PromptVersion을 기반으로 새 PromptAsset을 만들거나, 기존 PromptAsset의 구조를 재사용 가능한 Prompt Template으로 저장하고, 이후 새로운 요구사항을 입력할 때 해당 템플릿을 출발점으로 사용할 수 있어야 합니다.

이 단계의 핵심:

- 기존 프롬프트를 새 프롬프트의 출발점으로 사용
- parent_prompt_id 또는 별도 lineage metadata로 파생 관계 기록
- 좋은 PromptVersion을 재사용 가능한 Prompt Template으로 전환
- PromptCompilerPanel에서 템플릿을 선택해 draft를 시작
- 파생 관계와 원본을 추적
- 자동 LLM 호출, 자동 저장, 자동 실행은 하지 않음

중요:

프롬프트 실행 기능을 추가하지 마세요.

Codex CLI를 호출하지 마세요.

Claude Code CLI를 호출하지 마세요.

Cursor를 자동 실행하지 마세요.

외부 앱을 자동 제어하지 마세요.

외부 repo를 자동 스캔하지 마세요.

repo_path 기반 파일 읽기를 하지 마세요.

프롬프트 실행 결과 저장 기능을 추가하지 마세요.

prompt_runs, agent_runs, execution_results, validation_results, run_logs를 만들거나 사용하지 마세요.

OS 전역 단축키를 추가하지 마세요.

window.prompter.appEvents.*를 추가하지 마세요.

window.prompter.shortcuts.*를 추가하지 마세요.

quick_capture_* settings key를 추가하지 마세요.

이번 단계는 프롬프트 재사용, 파생 관계, 템플릿화에만 집중합니다.

Phase 11 / 12 / 13 / 14 guardrail:

- quick capture 동작을 변경하지 마세요.
- 클립보드 텍스트를 자동 정리하지 마세요.
- 하네스 템플릿 선택 로직을 변경하지 마세요.
- 프로젝트 컨텍스트 프로파일 선택 로직을 변경하지 마세요.
- 품질 리뷰어 동작을 자동화하지 마세요.
- 템플릿 선택은 자동 LLM analyze를 실행하면 안 됩니다.
- 템플릿 선택은 자동 compile을 실행하면 안 됩니다.
- 템플릿 선택은 자동 저장을 실행하면 안 됩니다.
- 템플릿 선택은 originalInput, scenario, targetAgent, harnessTemplateId, projectContextProfileId를 임의로 덮어쓰면 안 됩니다.
- 템플릿 적용은 사용자가 명시적으로 선택한 경우에만 draft를 변경해야 합니다.
- 템플릿 적용 후 기존 analyze / compile / quality review 결과는 stale이므로 초기화해야 합니다.

용어 정의:

1. PromptAsset

- 프롬프트의 논리적 자산 단위
- 여러 PromptVersion을 가질 수 있음
- parent_prompt_id를 통해 다른 PromptAsset에서 파생될 수 있음

2. PromptVersion

- 실제 original_input, compiled_prompt, assumptions, questions, answers 등을 가진 버전 단위

3. Derived Prompt

- 기존 PromptAsset 또는 PromptVersion을 기반으로 새로 만든 PromptAsset
- 원본과 파생 관계를 기록해야 함

4. Prompt Template

- 특정 PromptVersion의 구조를 재사용 가능한 출발점으로 만든 것
- 하네스 템플릿과 다름
- 하네스 템플릿은 “어떻게 컴파일할지”를 정의
- Prompt Template은 “어떤 작업 프롬프트 구조를 재사용할지”를 정의

아키텍처 요구사항:

- renderer는 DB에 직접 접근하면 안 됩니다.
- renderer는 preload bridge에 노출된 typed API만 사용해야 합니다.
- 복제, 파생, 템플릿 생성은 Electron main process repository/service를 통해 처리합니다.
- 모든 IPC 입력값은 Zod로 검증합니다.
- 템플릿 placeholder 치환은 단순 문자열 처리만 사용합니다.
- template content는 코드로 실행하지 않습니다.
- eval, new Function, 동적 import를 사용하지 마세요.
- Prompt Template 선택만으로 LLM 호출, 저장, 실행을 하지 않습니다.
- 템플릿 적용은 local draft state 변경일 뿐이며, 사용자가 저장하기 전까지 DB에 새 PromptAsset이 생기면 안 됩니다.

데이터 모델:

기존 prompt_assets.parent_prompt_id가 있다면 이를 활용합니다.

추가 권장 테이블 1: prompt_asset_lineage, 선택

기존 parent_prompt_id만으로 충분하면 새 테이블을 만들지 않아도 됩니다.

다만 어떤 version에서 파생되었는지 추적하려면 별도 lineage 테이블을 권장합니다.

prompt_asset_lineage 필드:

- id: text, primary key
- child_prompt_asset_id: text, required, references prompt_[assets.id](http://assets.id)
- parent_prompt_asset_id: text, required, references prompt_[assets.id](http://assets.id)
- parent_prompt_version_id: text, nullable, references prompt_[versions.id](http://versions.id)
- relationship_type: text, required
  - duplicate
  - derived
  - templated_from
  - improved_from_review
- note: text, nullable
- created_at: integer, required

주의:

- 이미 parent_prompt_id를 사용하고 있다면 중복 책임을 피하세요.
- MVP에서는 parent_prompt_id + optional parent_version_id 필드 추가 정도로도 충분합니다.
- 더 명확한 추적이 필요하면 prompt_asset_lineage를 추가하세요.
- 선택한 방식을 작업 후 설명하세요.

추가 권장 테이블 2: prompt_templates

prompt_templates 필드:

- id: text, primary key
- name: text, required
- description: text, nullable
- source_prompt_asset_id: text, nullable, references prompt_[assets.id](http://assets.id)
- source_prompt_version_id: text, nullable, references prompt_[versions.id](http://versions.id)
- scenario: text, required
- target_agent: text, required
- template_body: text, required
- variables: text, nullable, JSON string
- tags: text, nullable, JSON string
- created_at: integer, required
- updated_at: integer, required

Prompt Template은 하네스 템플릿과 분리합니다.

하네스 템플릿은 compiler structure이고, prompt_templates는 reusable prompt content입니다.

절대 추가하지 말아야 할 테이블:

- prompt_runs
- agent_runs
- execution_results
- validation_results
- run_logs
- clipboard_history
- quick_capture_settings

이번 단계에서 구현할 주요 기능:

1. PromptAsset 복제

선택한 PromptAsset을 복제할 수 있어야 합니다.

동작:

- 원본 PromptAsset의 metadata를 복사
- current version 또는 사용자가 선택한 PromptVersion을 기반으로 새 PromptAsset 생성
- 새 PromptAsset의 title은 “{원본 제목} 복사본” 또는 “Copy of {원본 제목}”
- 새 PromptVersion version_number는 1
- original_input과 compiled_prompt는 원본 version에서 복사
- assumptions, questions, answers, acceptance_criteria, validation_commands, quality_score는 복사하되, quality_score는 정책에 따라 null로 초기화 가능
- parent_prompt_id 또는 lineage record로 원본 관계 기록
- tags는 복사할지 사용자 선택 가능
- project_id는 기본적으로 원본과 동일하게 하되, 다른 프로젝트로 복제할 수 있으면 좋음

MVP 정책:

- tags는 기본 복사
- quality_score는 복사하지 않고 null로 시작하는 것을 권장
- parent_prompt_id는 원본 PromptAsset id로 설정
- 복제 후 새 PromptAsset을 선택

2. PromptVersion에서 새 PromptAsset 파생

선택한 PromptVersion을 기반으로 새 PromptAsset을 만들 수 있어야 합니다.

UI 액션:

- “이 버전에서 새 프롬프트 만들기”
- “파생 프롬프트 생성”

동작:

- 선택된 PromptVersion의 original_input과 compiled_prompt를 기반으로 새 draft를 만들거나
- 즉시 새 PromptAsset + PromptVersion을 생성할 수 있음

권장 흐름:

- 즉시 저장하지 말고 PromptCompilerPanel draft로 보냅니다.
- originalInput은 원본 original_input 또는 사용자가 선택한 방식으로 채움
- compiledPrompt는 원본 compiled_prompt를 초안으로 채움
- scenario, targetAgent는 원본 PromptAsset metadata를 사용
- parent source info를 draft metadata로 보관
- 사용자가 수정 후 명시적으로 저장하면 새 PromptAsset 생성
- 저장 시 parent_prompt_id 또는 lineage record 생성

이유:

- 파생은 “새 작업”이므로 사용자가 수정할 시간을 줘야 합니다.
- 자동 저장은 불필요한 쓰레기 프롬프트를 양산합니다. 인간은 이미 충분히 많은 쓰레기 파일을 만들었습니다.

3. 파생 draft 상태

PromptCompilerPanel에 derived-from draft metadata를 추가합니다.

draft metadata 예:

- derivedFromPromptAssetId?: string | null
- derivedFromPromptVersionId?: string | null
- derivationType?: "duplicate" | "derived" | "templated_from" | "improved_from_review" | null

UI 표시:

- “원본: {prompt title} v{versionNumber}에서 파생”
- 원본 보기 버튼
- 파생 관계 해제 버튼

동작:

- 파생 관계 해제는 draft metadata만 제거
- originalInput과 compiledPrompt는 사용자가 명시적으로 지우지 않는 한 보존
- 파생 metadata 변경 시 stale analyze / compile / quality review 결과 초기화

4. Prompt Template 생성

선택한 PromptVersion을 Prompt Template으로 저장할 수 있어야 합니다.

UI 액션:

- “템플릿으로 저장”
- “Save as Prompt Template”

입력:

- name, 필수
- description, 선택
- variables, 선택
- tags, 선택
- scenario
- targetAgent
- template_body

template_body 기본값:

- 선택된 PromptVersion의 compiled_prompt를 기반으로 생성
- 사용자가 직접 편집 가능
- 반복해서 바뀌는 부분은 placeholder로 바꿀 수 있음

지원 placeholder 예:

- {{objective}}
- {{projectContext}}
- {{techStack}}
- {{taskDetails}}
- {{constraints}}
- {{acceptanceCriteria}}
- {{validationCommands}}
- {{additionalNotes}}

주의:

- 자동으로 placeholder를 과하게 만들지 마세요.
- MVP에서는 사용자가 직접 placeholder를 편집하게 해도 충분합니다.
- LLM을 사용해 template variables를 자동 추출하지 마세요.
- 자동 LLM 호출 금지

5. Prompt Template 목록 / 상세 / 편집 UI

Prompt Template을 관리할 수 있어야 합니다.

기능:

- 목록 표시
- 검색
- scenario 필터
- targetAgent 필터
- 상세 보기
- 생성
- 수정
- 복제
- 삭제
- source prompt로 이동, source가 있는 경우

표시 정보:

- name
- description
- scenario
- targetAgent
- variables
- source prompt title, 가능하면
- updated_at

주의:

- Prompt Template은 Harness Template과 다른 섹션에 표시하세요.
- 이름이 비슷해 사용자가 헷갈릴 수 있으므로 UI 라벨을 명확히 하세요.
  - Harness Template: 컴파일 규칙
  - Prompt Template: 재사용 프롬프트

6. Prompt Template 적용

PromptCompilerPanel에서 Prompt Template을 선택해 draft에 적용할 수 있어야 합니다.

동작:

- 템플릿 선택만으로 draft를 변경하지 않습니다.
- “템플릿 적용” 버튼을 명시적으로 눌렀을 때만 적용합니다.
- 적용 전 기존 originalInput 또는 compiledPrompt가 있으면 overwrite confirmation 표시
- append 옵션은 제공하지 않습니다.
- 적용 시 template_body를 compiledPrompt draft 또는 originalInput draft 중 어디에 넣을지 정책을 명확히 합니다.

권장 정책:

- Prompt Template은 compiledPrompt draft에 적용
- originalInput은 비워두거나 사용자가 별도 입력
- 템플릿 안에 {{taskDetails}} 같은 placeholder가 있으면 사용자가 채울 수 있게 표시

대안:

- template_body를 originalInput에 넣어 LLM compile의 입력으로 사용
- 이 경우 “템플릿을 원본 요청으로 사용”이라는 명확한 UI가 필요

MVP 권장:

- “compiledPrompt 초안으로 적용”
- 원본 originalInput은 자동 변경하지 않음
- 사용자가 명시적으로 originalInput도 덮어쓰겠다고 선택한 경우만 변경

7. Prompt Template 변수 입력

템플릿에 placeholder가 있으면 변수 입력 UI를 표시합니다.

동작:

- template_body에서 {{variableName}} 패턴 추출
- variableName 목록 표시
- 각 변수에 대한 textarea 또는 input 제공
- 사용자가 값을 입력하고 preview를 볼 수 있음
- “적용” 버튼을 누르면 placeholder가 입력값으로 치환된 결과를 draft에 반영

요구사항:

- placeholder 치환은 단순 문자열 치환
- unknown placeholder는 그대로 두거나 경고
- 입력값 whitespace 보존
- code block / Markdown / diff 훼손 금지
- eval / new Function 금지

8. Prompt lineage 보기

PromptAsset 상세 화면에서 파생 관계를 볼 수 있어야 합니다.

표시:

- 이 프롬프트가 어떤 PromptAsset / PromptVersion에서 파생되었는지
- 이 프롬프트에서 파생된 child prompts 목록
- relationship_type
- created_at
- source version 정보, 있으면

MVP UI:

- “원본 프롬프트” 카드
- “파생된 프롬프트” 목록

기능:

- 원본 프롬프트로 이동
- child prompt로 이동
- lineage 정보가 없으면 “파생 관계 없음” 표시

주의:

- 그래프 시각화는 필수 아닙니다.
- 트리/카드 목록이면 충분합니다.
- 복잡한 canvas나 graph library 추가하지 마세요.

9. 개선안에서 파생 관계 연결

Phase 14의 improvedPromptDraft를 새 PromptVersion으로 저장하거나 새 PromptAsset으로 만들 때 lineage를 기록할 수 있어야 합니다.

요구사항:

- improvedPromptDraft를 기존 PromptAsset의 새 version으로 저장하는 기존 흐름은 유지
- 만약 improvedPromptDraft를 새 PromptAsset으로 저장하는 옵션을 추가한다면 relationship_type은 improved_from_review
- prompt_quality_review_id를 저장하는 별도 필드는 선택
- 범위가 커지면 Phase 14의 기존 “새 버전 저장”만 유지하고, lineage 연결은 PromptAsset 파생에서만 구현

10. IPC API 요구사항

preload bridge에 다음 API를 추가하거나 기존 prompts API를 보완합니다.

Prompt derivation:

- window.prompter.prompts.duplicateAsset(input)
- window.prompter.prompts.createDerivedDraft(input), renderer-only draft helper면 IPC 불필요
- window.prompter.prompts.createAssetFromDerivedDraft(input)
- window.prompter.prompts.getLineage(promptAssetId)
- window.prompter.prompts.listChildren(promptAssetId)

Prompt templates:

- window.prompter.promptTemplates.create(input)
- window.prompter.promptTemplates.list(input?)
- window.prompter.promptTemplates.get(id)
- window.prompter.promptTemplates.update(id, input)
- window.prompter.promptTemplates.delete(id)
- window.prompter.promptTemplates.duplicate(id)
- window.prompter.promptTemplates.preview(input)
- window.prompter.promptTemplates.extractVariables(input)

선택:

- window.prompter.promptTemplates.createFromPromptVersion(input)

금지:

- promptRuns 관련 API 추가 금지
- executionResults 관련 API 추가 금지
- Codex 실행 API 추가 금지
- shortcuts/appEvents/globalShortcut API 추가 금지

11. Zod schema 요구사항

다음 schema를 정의합니다.

- DuplicatePromptAssetInputSchema
- CreateDerivedPromptAssetInputSchema
- PromptLineageSchema
- PromptLineageRelationshipTypeSchema
- CreatePromptTemplateInputSchema
- UpdatePromptTemplateInputSchema
- ListPromptTemplatesInputSchema
- DeletePromptTemplateInputSchema
- DuplicatePromptTemplateInputSchema
- CreatePromptTemplateFromVersionInputSchema
- PromptTemplatePreviewInputSchema
- ExtractPromptTemplateVariablesInputSchema

검증 규칙:

- promptAssetId는 빈 문자열 불가
- promptVersionId는 빈 문자열 불가
- name은 trim 후 빈 문자열 불가
- scenario는 허용된 enum
- targetAgent는 허용된 enum
- templateBody는 빈 문자열 불가
- variables는 string array 또는 JSON string을 안전하게 처리
- relationship_type은 허용 enum만 사용
- projectId는 string 또는 null
- tags 복사 여부는 boolean

추가하지 말아야 할 schema:

- PromptRunSchema
- AgentRunSchema
- ExecutionResultSchema
- ValidationResultSchema
- QuickCaptureSettingsSchema
- RegisterGlobalShortcutInputSchema

12. UI 구조 권장

Renderer:

- src/renderer/components/prompt/PromptDerivationActions.tsx
- src/renderer/components/prompt/PromptLineagePanel.tsx
- src/renderer/components/promptTemplates/PromptTemplateList.tsx
- src/renderer/components/promptTemplates/PromptTemplateDetail.tsx
- src/renderer/components/promptTemplates/PromptTemplateEditor.tsx
- src/renderer/components/promptTemplates/PromptTemplateSelector.tsx
- src/renderer/components/promptTemplates/PromptTemplatePreview.tsx
- src/renderer/hooks/usePromptTemplates.ts
- src/renderer/hooks/usePromptLineage.ts

Shared:

- src/shared/promptTemplates/promptTemplateTypes.ts
- src/shared/promptTemplates/promptTemplateSchemas.ts
- src/shared/promptTemplates/renderPromptTemplate.ts
- src/shared/promptTemplates/extractTemplateVariables.ts
- src/shared/promptLineage/promptLineageTypes.ts
- src/shared/promptLineage/promptLineageSchemas.ts

Main:

- src/main/repositories/promptTemplateRepository.ts
- src/main/services/promptTemplateService.ts
- src/main/ipc/promptTemplates.ts
- src/main/services/promptDerivationService.ts
- 기존 promptRepository 보완

Compiler 연결:

- 기존 PromptCompilerPanel draft state
- 기존 stale state 초기화 유틸
- 기존 createPromptAsset / createPromptVersion 흐름

13. stale state 규칙

다음 변경이 발생하면 기존 analyze / compile / quality review 결과는 stale 처리하거나 초기화해야 합니다.

초기화 트리거:

- promptTemplateId 변경
- prompt template 적용
- template variable 값 변경 후 적용
- derivedFromPromptAssetId 변경
- derivedFromPromptVersionId 변경
- compiledPrompt draft 변경
- originalInput 변경
- scenario 변경
- targetAgent 변경
- harnessTemplateId 변경
- projectContextProfileId 변경
- includeProjectContextProfile 변경

중요:

- stale state 초기화는 originalInput을 임의로 비우거나 바꾸면 안 됩니다.
- 템플릿 적용 전 confirmation이 필요한 경우 반드시 표시합니다.
- 템플릿 선택만으로 자동 적용하지 마세요.
- 템플릿 적용은 자동 LLM 호출을 실행하지 않습니다.
- 템플릿 적용은 자동 저장하지 않습니다.

14. 보안 요구사항

- Prompt Template body는 실행 가능한 코드가 아닙니다.
- eval, new Function, 동적 import 사용 금지
- placeholder 치환은 단순 문자열 치환만 수행합니다.
- renderer에서 DB, fs, path, process에 직접 접근하지 않습니다.
- renderer에서 ipcRenderer를 직접 사용하지 않습니다.
- prompt template 내용, originalInput, compiledPrompt를 불필요하게 console.log하지 마세요.
- 사용자가 템플릿에 secret을 넣을 수 있으므로 로그에 주의하세요.
- LLM 호출은 사용자가 명시적으로 analyze / compile / LLM review를 실행할 때만 발생해야 합니다.
- prompt execution 또는 외부 프로세스 실행 기능을 추가하지 않습니다.
- 실행 결과 저장 관련 테이블과 API를 추가하지 않습니다.

15. TDD 구현 순서

가능하면 다음 순서로 구현하세요.

1. prompt template schema 테스트 작성

- valid create input
- invalid name
- invalid scenario
- invalid targetAgent
- empty templateBody 거부
- variables JSON 처리
- tags JSON 처리

2. extractTemplateVariables 테스트 작성

- {{objective}} 추출
- 중복 변수 제거
- unknown 형식 무시
- code block 안 placeholder도 안전하게 추출
- whitespace 보존

3. renderPromptTemplate 테스트 작성

- placeholder 치환
- unknown placeholder 처리
- whitespace 보존
- code fence 보존
- diff block 보존
- original input cleanup 없음
- eval 실행 없음

4. prompt derivation service 테스트 작성, 가능하면

- duplicate asset
- duplicate creates new prompt asset
- duplicated version starts at version_number 1
- parent_prompt_id 설정
- tags copy option
- quality_score copy 정책 확인
- lineage 조회

5. prompt template repository/service 테스트, 가능하면

- create/list/get/update/delete
- duplicate
- createFromPromptVersion
- preview

6. renderer behavior 테스트, 가능하면

- template 선택만으로 draft 변경 없음
- apply 버튼 후 confirmation
- apply 후 compiledPrompt draft 변경
- apply 후 stale state 초기화
- derived draft가 parent metadata 표시
- lineage panel 표시

16. 파일별 예상 변경

예상 변경 파일:

- DB schema / migration 파일, prompt_templates 또는 prompt_asset_lineage 추가 시
- shared prompt template schema/type 파일 추가
- prompt template rendering utility 추가
- prompt template variable extraction utility 추가
- promptTemplateRepository 추가
- promptTemplateService 추가
- promptTemplates IPC handler 추가
- promptDerivationService 추가
- promptRepository 보완
- preload bridge 타입 추가
- PromptVersion detail actions에 duplicate / derive / save as template 추가
- PromptCompilerPanel에 promptTemplateId / derivedFrom metadata 추가
- PromptTemplateList / Detail / Editor / Selector 컴포넌트 추가
- PromptLineagePanel 추가
- 관련 테스트 파일 추가

건드리지 말아야 할 것:

- quick capture trim/cleanup 추가 금지
- quick_capture settings 추가 금지
- globalShortcut 추가 금지
- appEvents bridge 추가 금지
- shortcuts bridge 추가 금지
- prompt_runs 관련 schema 추가 금지
- 실행 결과 저장 관련 코드 추가 금지
- 외부 repo 자동 스캔 추가 금지
- prompt execution service 추가 금지

17. 의존성 그래프

권장 의존성 방향:

shared/promptTemplates schemas

→ shared/promptTemplates render/extract utilities

→ main promptTemplate repository/service

→ main promptDerivation service

→ main IPC promptTemplates/prompts

→ preload typed bridge

→ renderer hooks

→ renderer prompt template components

→ PromptCompilerPanel integration

→ PromptVersion detail actions / PromptLineagePanel

금지 방향:

- renderer → DB 직접 접근
- renderer → Electron ipcRenderer 직접 접근
- renderer → fs/path/process 직접 접근
- prompt template → external agent execution
- prompt template → LLM auto call
- prompt derivation → prompt run history
- template rendering → executable code

18. 자동 테스트 목록

가능한 경우 다음 테스트를 추가하세요.

Schema:

- CreatePromptTemplateInputSchema accepts valid input
- rejects empty name
- rejects empty templateBody
- rejects invalid scenario
- rejects invalid targetAgent
- DuplicatePromptAssetInputSchema rejects empty promptAssetId
- CreatePromptTemplateFromVersionInputSchema rejects empty promptVersionId

Template utilities:

- extracts variables from template
- deduplicates variables
- renders placeholders with provided values
- preserves Markdown
- preserves code fences
- preserves diff blocks
- leaves unknown placeholders safe
- does not trim user-provided values
- does not execute template content

Derivation:

- duplicates prompt asset
- creates version_number 1 for duplicate
- sets parent_prompt_id or lineage record
- copies tags only when requested
- does not copy quality_score if policy says null
- creates derived asset from draft with parent metadata

Lineage:

- gets parent prompt
- lists child prompts
- handles no lineage
- handles deleted parent safely

UI behavior:

- selecting template does not modify draft
- applying template requires explicit action
- applying template with existing compiledPrompt asks confirmation
- applying template clears stale analyze/compile/review state
- derive action opens draft with source metadata
- saving derived draft records lineage

19. 수동 QA 체크리스트

| 항목                   | 기대 결과                            |

| -------------------- | -------------------------------- |

| PromptAsset 복제       | 새 PromptAsset 생성                 |

| 복제된 PromptAsset      | version_number 1로 시작             |

| 복제된 PromptAsset      | parent 관계 기록                     |

| 복제 옵션                | tags 복사 여부 동작                    |

| quality_score 정책     | null 또는 명시한 정책대로 처리              |

| PromptVersion에서 파생   | PromptCompilerPanel draft로 이동    |

| 파생 draft             | 원본 PromptAsset/Version 표시        |

| 파생 draft 저장          | 새 PromptAsset 생성 및 lineage 기록    |

| Prompt Template 생성   | 선택된 version에서 template 생성        |

| Prompt Template 목록   | 템플릿 표시 및 필터 가능                   |

| Prompt Template 편집   | 저장 후 갱신                          |

| Prompt Template 복제   | 복사본 생성                           |

| Prompt Template 삭제   | 확인 후 삭제                          |

| Template 변수 추출       | {{variable}} 목록 표시               |

| Template preview     | 변수 치환 결과 표시                      |

| Template 선택          | draft 자동 변경 없음                   |

| Template 적용          | 명시적 클릭 필요                        |

| 기존 compiledPrompt 있음 | overwrite confirmation 표시        |

| Template 적용 후        | stale analyze/compile/review 초기화 |

| Lineage panel        | 원본과 child prompts 표시             |

| 앱 재시작                | templates와 lineage 유지            |

| prompt_runs 확인       | 실행 결과 관련 데이터 생성 없음               |

20. Attribution

이 Phase 15 명세는 Phase 11, Phase 12, Phase 13, Phase 14의 최종 guardrail을 반영합니다.

반영된 Phase 11 결정:

- 빠른 캡처는 버튼 + File 메뉴 + 앱 포커스 상태의 CmdOrCtrl+Shift+V accelerator로 한정

 *window.prompter.appEvents.* 추가 없음

 *window.prompter.shortcuts.* 추가 없음

- OS globalShortcut 없음

 *quick_capture_* settings 없음

- 클립보드 텍스트 원문 보존
- 자동 trim/cleanup 없음
- append 옵션 없음
- no-auto-LLM, no-auto-save, no-log, no-persistence guardrail 유지

반영된 Phase 12 결정:

- 하네스 템플릿은 프롬프트 구조와 컴파일 규칙을 담당
- 하네스 선택은 originalInput/scenario/targetAgent를 자동 덮어쓰지 않음
- 하네스 선택은 자동 analyze/compile/save를 실행하지 않음
- 하네스 선택은 stale compiler state를 초기화
- template_body는 코드로 실행하지 않음

반영된 Phase 13 결정:

- 프로젝트 컨텍스트는 사용자 제공 프로젝트 맥락으로만 반영
- project context 선택은 originalInput/manual context/scenario/targetAgent를 자동 덮어쓰지 않음
- project context 선택은 자동 analyze/compile/save를 실행하지 않음
- repo_path는 저장할 수 있어도 파일 시스템 자동 접근 없음

반영된 Phase 14 결정:

- 품질 리뷰는 프롬프트 실행이 아님
- 품질 리뷰는 자동 LLM 호출을 실행하지 않음
- 리뷰 결과는 자동으로 prompt를 수정하지 않음
- improvedPromptDraft는 자동 덮어쓰기 없이 명시적 액션으로만 반영
- prompt_quality_reviews는 prompt_runs와 분리됨

Phase 15에서 이 결정을 깨뜨리지 마세요.

21. 이번 단계에서 구현하지 말 것

다음은 절대 구현하지 마세요.

- 프롬프트 실행 기능
- Codex CLI 실행
- Codex OAuth
- Claude Code 실행
- Cursor 실행
- 외부 앱 자동 제어
- 외부 repo 자동 스캔
- repo_path 기반 파일 읽기
- git 명령 실행
- OS 전역 단축키

 *window.prompter.appEvents.*

 *window.prompter.shortcuts.*

 *quick_capture_* settings

- QuickCaptureSettingsSchema
- RegisterGlobalShortcutInputSchema
- clipboard history
- background clipboard watch
- external selected text 읽기
- prompt_runs
- agent_runs
- execution_results
- validation_results
- run_logs
- 실행 결과 저장
- 클라우드 동기화
- 팀 협업
- prompt template marketplace
- 원격 템플릿 다운로드
- 템플릿 안에서 코드 실행
- 템플릿 선택 시 자동 LLM 호출
- 템플릿 선택 시 자동 저장
- 템플릿 적용 시 append 옵션

완료 기준:

- PromptAsset을 복제할 수 있습니다.
- 복제된 PromptAsset은 원본과 parent 관계를 가집니다.
- 선택한 PromptVersion에서 새 derived draft를 만들 수 있습니다.
- derived draft는 원본 PromptAsset / PromptVersion 정보를 표시합니다.
- derived draft를 저장하면 새 PromptAsset과 lineage가 기록됩니다.
- 선택한 PromptVersion을 Prompt Template으로 저장할 수 있습니다.
- Prompt Template 목록, 상세, 생성, 수정, 복제, 삭제 UI가 구현되어 있습니다.
- Prompt Template의 placeholder 변수를 추출하고 입력값으로 preview할 수 있습니다.
- Prompt Template 선택만으로 draft가 변경되지 않습니다.
- Prompt Template 적용은 사용자의 명시적 액션과 confirmation을 통해서만 수행됩니다.
- Prompt Template 적용 후 stale analyze / compile / quality review state가 초기화됩니다.
- PromptAsset 상세에서 원본과 child prompts lineage를 볼 수 있습니다.
- template content는 코드로 실행되지 않습니다.
- 모든 IPC 입력값은 Zod로 검증됩니다.
- renderer는 DB, fs, path, process, ipcRenderer에 직접 접근하지 않습니다.
- Phase 11, 12, 13, 14 guardrail이 유지됩니다.
- TypeScript 타입 검사가 통과합니다.
- 앱이 개발 모드에서 정상 실행됩니다.
- 프롬프트 실행이나 실행 결과 저장 기능은 추가되지 않았습니다.

작업 전:

1. 현재 Phase 0부터 Phase 14까지의 코드 구조를 확인합니다.
2. prompt_assets.parent_prompt_id 사용 여부를 확인합니다.
3. prompt_versions와 current version 조회 흐름을 확인합니다.
4. PromptCompilerPanel draft state 구조를 확인합니다.
5. Phase 11 quick capture stale state 초기화 로직을 확인합니다.
6. Phase 12 harnessTemplateId draft state와 stale state 초기화 방식을 확인합니다.
7. Phase 13 projectContextProfileId/includeProjectContextProfile draft state와 stale state 초기화 방식을 확인합니다.
8. Phase 14 quality review state와 stale 처리 방식을 확인합니다.
9. prompt_templates와 lineage를 새 테이블로 추가할지, 기존 parent_prompt_id만 활용할지 결정합니다.
10. TDD 순서에 따라 schema와 template rendering 테스트를 먼저 작성합니다.
11. 간결한 구현 계획을 세운 뒤 Phase 15만 구현합니다.

작업 후:

1. 변경된 내용을 요약합니다.
2. 생성되거나 수정된 파일 목록을 제공합니다.
3. schema 또는 migration 변경을 설명합니다.
4. PromptAsset 복제 데이터 흐름을 설명합니다.
5. PromptVersion에서 derived draft를 만드는 흐름을 설명합니다.
6. derived draft 저장 시 lineage 기록 방식을 설명합니다.
7. Prompt Template CRUD 데이터 흐름을 설명합니다.
8. Prompt Template 적용이 자동 저장/자동 LLM 호출을 하지 않는 방식을 설명합니다.
9. placeholder 치환이 코드 실행 없이 안전하게 동작하는 방식을 설명합니다.
10. stale analyze / compile / quality review state 초기화 방식을 설명합니다.
11. Phase 11 quick capture, Phase 12 harness, Phase 13 project context, Phase 14 quality review guardrail을 유지한 방식을 설명합니다.
12. 추가한 테스트와 테스트 결과를 설명합니다.
13. 앱 실행 및 타입 검사 명령어를 제공합니다.
14. 수동 테스트 절차를 제공합니다.
15. 아직 구현하지 않은 기능을 명확히 구분해서 설명합니다.

