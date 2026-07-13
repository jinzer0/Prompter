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

Phase 11:

* 빠른 캡처는 버튼 + File 메뉴 + 앱 포커스 상태의 CmdOrCtrl+Shift+V accelerator로 한정
* window.prompter.clipboard.readText() 최소 API 구현
* 기존 menu.onAction / MENU_ACTION_CHANNEL 재사용
* OS 전역 단축키 없음
* quick_capture_* settings 없음
* 클립보드 텍스트 원문 보존
* 자동 trim/cleanup 없음
* append 옵션 없음
* 자동 LLM 호출 없음
* 자동 저장 없음
* 클립보드 내용 로그 없음
* 클립보드 내용 자동 persistence 없음

Phase 12:

* 기본 하네스 템플릿 seed
* 하네스 템플릿 목록, 상세, 생성, 수정, 복제, 삭제 UI
* PromptCompilerPanel에서 하네스 템플릿 선택 가능
* 선택된 하네스 템플릿이 정적 컴파일러와 LLM PromptCompilerService에 반영됨
* 하네스 선택은 originalInput, scenario, targetAgent를 자동 덮어쓰지 않음
* 하네스 선택은 자동 analyze, 자동 compile, 자동 저장을 실행하지 않음
* 하네스 선택 시 stale compiler state 초기화
* template_body는 코드로 실행되지 않음

Phase 13:

* 프로젝트별 context profile CRUD
* 프로젝트마다 default context profile 지정 가능
* PromptCompilerPanel에서 project context profile 선택 및 include 가능
* 정적 컴파일러와 LLM PromptCompilerService에 project context profile 반영
* project context는 originalInput, manual context, scenario, targetAgent를 자동 덮어쓰지 않음
* context 선택은 자동 analyze, 자동 compile, 자동 저장을 실행하지 않음
* repo_path가 있어도 파일 시스템 자동 접근 없음

이 작업은 Phase 14: 프롬프트 품질 점수 / 리뷰어입니다.

목표:
저장된 PromptVersion 또는 현재 컴파일러 draft의 compiledPrompt를 평가하여 품질 점수, 세부 점수, 문제점, 개선 제안, 누락된 섹션, 위험 신호를 보여주는 Prompt Quality Reviewer를 구현합니다.

이 기능은 프롬프트를 실행하지 않습니다.
이 기능은 Codex, Claude Code, Cursor 같은 외부 에이전트를 실행하지 않습니다.
이 기능은 프롬프트 실행 결과를 저장하지 않습니다.
이 기능은 “프롬프트 자체가 얼마나 실행 가능한 작업 명세인지”만 평가합니다.

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
이번 단계는 프롬프트 품질 평가와 리뷰 UI에만 집중합니다.

Phase 11 / Phase 12 / Phase 13 guardrail:

* quick capture 동작을 변경하지 마세요.
* 클립보드 텍스트를 자동 정리하지 마세요.
* 하네스 템플릿 선택 로직을 변경하지 마세요.
* 프로젝트 컨텍스트 프로파일 선택 로직을 변경하지 마세요.
* 품질 리뷰는 자동 LLM 호출을 실행하면 안 됩니다.
* 품질 리뷰는 자동 저장을 실행하면 안 됩니다.
* 품질 리뷰는 originalInput, scenario, targetAgent, harnessTemplateId, projectContextProfileId를 자동 변경하면 안 됩니다.
* 품질 리뷰 결과를 바탕으로 compiledPrompt를 자동 수정하지 마세요.
* 개선안 적용은 사용자가 명시적으로 선택할 때만 수행합니다.

품질 리뷰의 범위:
리뷰 대상은 다음 중 하나입니다.

1. 저장된 PromptVersion

* prompt_version_id 기준
* compiled_prompt 중심으로 평가
* original_input, assumptions, questions, answers, acceptance_criteria, validation_commands도 참고 가능

2. 현재 PromptCompilerPanel draft

* 아직 저장되지 않은 compiledPrompt
* originalInput과 선택된 scenario, targetAgent, harnessTemplate, project context를 참고 가능
* 리뷰 결과는 자동 저장하지 않음

품질 리뷰 방식:
두 가지 리뷰 모드를 지원합니다.

1. Local heuristic review

* API Key 없이 동작
* 문자열/구조 기반 검사
* 필수 섹션 존재 여부
* 목표 명확성
* 제약 조건 존재 여부
* 성공 기준 존재 여부
* 검증 명령어 존재 여부
* out of scope 존재 여부
* 너무 짧거나 너무 긴 프롬프트 경고
* 모호한 표현 탐지

2. LLM review

* 사용자가 명시적으로 버튼을 눌렀을 때만 실행
* OpenAI SDK는 Electron main process에서만 사용
* API Key가 없으면 명확한 에러 표시
* LLM은 프롬프트를 실행하지 않고 리뷰만 수행
* LLM 출력은 JSON schema로 받고 Zod로 검증
* LLM review 결과는 사용자가 저장을 선택할 때만 저장

MVP 요구사항:

* Local heuristic review는 필수
* LLM review는 가능하면 구현
* LLM review가 범위를 키우면 Local review를 먼저 완성하고 LLM review는 main service skeleton + UI placeholder 정도로 분리해도 됩니다.
* 단, Phase 5에서 이미 OpenAI SDK와 PromptCompilerService가 있으므로, LLM review를 main process service로 추가하는 것을 권장합니다.

점수 체계:
전체 점수는 0에서 100 사이 number로 표현합니다.

세부 점수:

* objectiveClarity: 0-100
* contextCompleteness: 0-100
* taskSpecificity: 0-100
* scopeControl: 0-100
* constraintsQuality: 0-100
* acceptanceCriteriaQuality: 0-100
* validationStrength: 0-100
* agentReadiness: 0-100
* ambiguityRisk: 0-100, 낮을수록 좋지만 표시에서는 risk로 표현
* safetyAndBoundaryControl: 0-100

전체 점수 계산:

* Local heuristic에서는 weighted average로 계산합니다.
* LLM review에서는 LLM이 전체 점수를 반환하되, Zod 검증 후 0-100 범위로 clamp합니다.
* ambiguityRisk는 위험 점수이므로 전체 점수 계산 시 inverse로 반영하거나 별도 표시합니다.
* 계산 방식은 shared utility에 분리합니다.

등급:

* 90-100: Excellent
* 75-89: Good
* 60-74: Usable
* 40-59: Needs work
* 0-39: Weak

UI 라벨은 한국어로 표시해도 됩니다.
예:

* Excellent: 매우 좋음
* Good: 좋음
* Usable: 사용 가능
* Needs work: 개선 필요
* Weak: 약함

리뷰 결과 구조:
PromptQualityReviewResult:

* id?: string
* promptVersionId?: string | null
* source: "draft" | "prompt_version"
* reviewMode: "local" | "llm"
* overallScore: number
* grade: "excellent" | "good" | "usable" | "needs_work" | "weak"
* dimensionScores: object
* strengths: string[]
* issues: PromptQualityIssue[]
* suggestions: PromptQualitySuggestion[]
* missingSections: string[]
* warnings: string[]
* recommendedClarifyingQuestions: string[]
* improvedPromptDraft?: string | null
* createdAt: number

PromptQualityIssue:

* id: string
* severity: "low" | "medium" | "high"
* category: string
* message: string
* evidence?: string
* recommendation?: string

PromptQualitySuggestion:

* id: string
* type: "add" | "revise" | "remove" | "clarify" | "restructure"
* title: string
* description: string
* suggestedText?: string

중요:

* improvedPromptDraft는 자동으로 기존 compiledPrompt를 덮어쓰지 않습니다.
* 사용자가 명시적으로 “개선안을 새 버전으로 저장”을 누를 때만 새 PromptVersion으로 저장합니다.
* 기존 PromptVersion의 compiled_prompt를 자동 수정하지 마세요.

DB 저장 정책:
MVP에서는 두 가지 중 하나를 선택합니다.

권장 방식 A:
prompt_quality_reviews 테이블을 추가합니다.

필드:

* id: text, primary key
* prompt_version_id: text, nullable, references prompt_versions.id
* source: text, required
* review_mode: text, required
* overall_score: integer, required
* grade: text, required
* dimension_scores: text, required, JSON string
* strengths: text, nullable, JSON string
* issues: text, nullable, JSON string
* suggestions: text, nullable, JSON string
* missing_sections: text, nullable, JSON string
* warnings: text, nullable, JSON string
* recommended_clarifying_questions: text, nullable, JSON string
* improved_prompt_draft: text, nullable
* created_at: integer, required

장점:

* 같은 PromptVersion에 여러 번 리뷰 가능
* local review와 LLM review를 비교 가능
* 리뷰 이력을 볼 수 있음

권장 방식 B:
prompt_versions에 quality_score만 업데이트하고 상세 리뷰는 저장하지 않음.

장점:

* 단순함
* migration 최소화

선택 기준:

* 구현 부담이 괜찮다면 방식 A를 선택하세요.
* 단, prompt_quality_reviews는 프롬프트 실행 결과가 아닙니다.
* 테이블명에 run, execution, result 같은 실행 뉘앙스를 넣지 마세요.
* prompt_runs 또는 execution_results를 만들면 안 됩니다.

이번 Phase에서는 방식 A를 권장합니다.

추가로 prompt_versions.quality_score는 최신 리뷰 overallScore로 업데이트할 수 있습니다.
단, 업데이트는 사용자가 “리뷰 저장” 또는 “점수 반영”을 명시적으로 누른 경우에만 수행합니다.
자동 업데이트하지 마세요.

이번 단계에서 구현할 주요 기능:

1. Local heuristic quality reviewer

shared 또는 main-safe utility로 local reviewer를 구현합니다.

권장 위치:

* src/shared/quality/qualityTypes.ts
* src/shared/quality/qualitySchemas.ts
* src/shared/quality/localPromptQualityReviewer.ts
* src/shared/quality/scorePromptQuality.ts
* src/shared/quality/detectPromptSections.ts
* src/shared/quality/detectAmbiguity.ts

검사 항목:

* 필수 섹션 존재 여부

  * # Objective
  * # Context
  * # Task
  * # Scope
  * # Constraints
  * # Acceptance Criteria
  * # Validation
  * # Working Instructions
  * # Final Response Format
* Objective가 너무 짧거나 비어 있는지
* Task가 구체적인 액션을 포함하는지
* Scope에 out of scope가 있는지
* Constraints가 존재하는지
* Acceptance Criteria가 체크 가능한 형태인지
* Validation 명령어 또는 검증 지침이 있는지
* Final Response Format이 있는지
* “잘”, “적절히”, “필요하면”, “가능하면”, “깔끔하게”, “최적화” 같은 모호한 표현이 과하게 많은지
* “전부 고쳐”, “알아서 해”, “완벽하게 해” 같은 과도하게 넓은 지시가 있는지
* 금지 사항이나 경계가 없는지
* targetAgent별 지침이 반영되어 있는지
* scenario별 필요한 지침이 반영되어 있는지

주의:

* heuristic은 완벽할 필요 없습니다.
* 하지만 결과가 일관적이어야 합니다.
* 사람이 이해할 수 있는 issues와 suggestions를 반환해야 합니다.
* originalInput, compiledPrompt whitespace를 변경하지 마세요.

2. LLM quality reviewer service

main process에 LLM 기반 품질 리뷰 서비스를 추가합니다.

권장 위치:

* src/main/services/promptQuality/PromptQualityReviewService.ts
* src/main/services/promptQuality/prompts.ts
* src/main/ipc/promptQuality.ts

입력:

* source: "draft" | "prompt_version"
* promptVersionId?: string
* originalInput?: string
* compiledPrompt: string
* scenario?: PromptScenario
* targetAgent?: TargetAgent
* harnessTemplateId?: string | null
* projectContextProfileId?: string | null
* includeProjectContextProfile?: boolean
* reviewMode: "local" | "llm"

LLM review 요구사항:

* OpenAI SDK는 main process에서만 사용합니다.
* API Key는 Phase 9 secret store에서 main process 내부로만 읽습니다.
* renderer에 API Key를 반환하지 않습니다.
* LLM에게 프롬프트를 실행하지 말고 리뷰만 하라고 명시합니다.
* LLM 출력은 JSON schema로 받고 Zod로 검증합니다.
* schema 검증 실패 시 recoverable error를 반환합니다.
* API Key가 없으면 local review를 제안하는 메시지를 반환합니다.
* LLM review 버튼을 누른 경우에만 호출합니다.
* 자동 호출 금지

LLM reviewer system prompt 요지:

* 너는 agent prompt quality reviewer다.
* 사용자의 프롬프트를 실행하지 않는다.
* 외부 도구를 호출하지 않는다.
* 코드를 작성하거나 수정하지 않는다.
* 프롬프트가 코딩 에이전트에게 충분히 실행 가능한지 평가한다.
* objective, context, task, scope, constraints, acceptance criteria, validation, response format을 기준으로 평가한다.
* 모호성, 범위 과다, 검증 부족, 성공 기준 부족, 안전 경계 부족을 찾아낸다.
* 개선 제안을 제공하되 자동 수정하지 않는다.
* 출력은 반드시 JSON schema를 따른다.

3. prompt_quality_reviews repository / service

방식 A를 선택한 경우 repository/service를 구현합니다.

권장 함수:

* createPromptQualityReview(input)
* listPromptQualityReviewsForVersion(promptVersionId)
* getLatestPromptQualityReview(promptVersionId)
* getPromptQualityReview(id)
* deletePromptQualityReview(id)
* applyQualityScoreToPromptVersion(promptVersionId, reviewId)
* saveImprovedPromptAsNewVersion(input), 선택

주의:

* delete는 필수 아님
* applyQualityScoreToPromptVersion은 사용자가 명시적으로 눌렀을 때만 실행
* saveImprovedPromptAsNewVersion은 improvedPromptDraft가 있을 때만 가능
* saveImprovedPromptAsNewVersion은 기존 Phase 6의 createNextVersion 흐름을 사용해야 합니다.
* version_number는 main process에서 계산해야 합니다.

4. PromptVersion 상세 UI에 품질 패널 추가

선택된 PromptVersion 상세 영역에 Quality Review 패널을 추가합니다.

표시 항목:

* 현재 quality_score
* latest review overallScore
* grade badge
* dimension scores
* strengths
* issues
* suggestions
* missing sections
* warnings
* recommended clarifying questions
* review createdAt
* review mode

액션:

* Local review 실행
* LLM review 실행
* 리뷰 저장, draft 리뷰인 경우
* 최신 리뷰를 quality_score에 반영
* improvedPromptDraft가 있으면 “새 버전으로 저장” 버튼 표시
* 리뷰 이력 보기, 가능하면 구현

UI 상태:

* no review empty state
* reviewing loading state
* API Key 없음
* LLM review 실패
* schema 검증 실패
* local review 성공
* review saved
* score applied

5. PromptCompilerPanel draft review

저장 전 draft 상태에서도 품질 리뷰를 실행할 수 있어야 합니다.

동작:

* 현재 compiledPrompt가 있으면 리뷰 가능
* compiledPrompt가 없으면 “먼저 프롬프트를 생성하세요” 메시지 표시
* draft local review는 바로 가능
* draft LLM review는 사용자가 명시적으로 클릭해야 함
* draft review 결과는 자동 저장하지 않음
* 사용자가 프롬프트 저장 시 review score를 함께 반영할지 선택 가능하면 좋음
* 범위가 커지면 저장된 PromptVersion 리뷰만 우선 구현하고 draft review는 local만 구현해도 됩니다.

중요:

* draft review는 originalInput을 변경하지 않습니다.
* draft review는 scenario, targetAgent를 변경하지 않습니다.
* draft review는 harnessTemplateId, projectContextProfileId를 변경하지 않습니다.
* draft review는 자동 compile을 실행하지 않습니다.

6. 개선안 적용 흐름

LLM review가 improvedPromptDraft를 제공할 수 있습니다.

요구사항:

* improvedPromptDraft를 preview로 보여줍니다.
* 기존 compiledPrompt와 improvedPromptDraft diff를 볼 수 있으면 좋습니다.
* “현재 프롬프트 덮어쓰기”는 기본적으로 제공하지 마세요.
* 저장된 PromptVersion의 경우:

  * “개선안을 새 버전으로 저장” 버튼 제공
  * 기존 PromptAsset에 새 PromptVersion으로 저장
  * version_number는 main process에서 계산
  * 저장 후 새 버전을 current version으로 지정할지 선택 또는 기본 true
* draft의 경우:

  * “draft에 개선안 적용” 버튼을 제공할 수 있습니다.
  * 이 경우 사용자의 명시적 클릭이 필요합니다.
  * 적용 시 stale review state는 초기화하거나 “적용 전 리뷰”로 표시합니다.

권장:

* 저장된 PromptVersion에는 새 버전 저장만 허용
* draft에는 명시적 적용 허용
* 자동 적용 금지

7. search / list UI에 품질 점수 표시

Phase 7 검색 결과와 프롬프트 카드에 quality_score를 표시합니다.

요구사항:

* PromptAsset 카드에 current version quality_score 표시
* 점수 없으면 “미평가” 표시
* grade badge 표시, 가능하면 구현
* 검색 결과 sortBy에 quality_score 추가 가능, 선택
* 필터에 quality score 범위 추가는 이번 단계에서 필수 아님

주의:

* quality_score 표시를 위해 검색 성능을 크게 망치지 마세요.
* current version 기준으로만 표시하면 충분합니다.

8. export와의 관계

Phase 8 export content에 quality review를 자동 포함하지 마세요.

선택 구현:

* Markdown export에 “Include quality review” checkbox를 추가할 수 있습니다.
* 기본값은 false
* Codex/Claude/Cursor agent prompt export에는 quality review를 기본 포함하지 마세요.
* 에이전트에게 전달할 작업 프롬프트에 리뷰 메타데이터를 과하게 넣으면 오히려 지시가 흐려집니다. 인간 문서도 그렇습니다.

이번 단계에서는 export 변경은 선택사항입니다.

9. IPC API 요구사항

preload bridge에 다음 API를 추가합니다.

권장 API:

* window.prompter.promptQuality.reviewDraft(input)
* window.prompter.promptQuality.reviewVersion(input)
* window.prompter.promptQuality.saveReview(input)
* window.prompter.promptQuality.listReviewsForVersion(promptVersionId)
* window.prompter.promptQuality.getLatestReview(promptVersionId)
* window.prompter.promptQuality.applyScoreToVersion(input)
* window.prompter.promptQuality.saveImprovedPromptAsNewVersion(input), 선택

reviewDraft input:

* reviewMode: "local" | "llm"
* originalInput?: string
* compiledPrompt: string
* scenario?: PromptScenario
* targetAgent?: TargetAgent
* harnessTemplateId?: string | null
* projectContextProfileId?: string | null
* includeProjectContextProfile?: boolean

reviewVersion input:

* reviewMode: "local" | "llm"
* promptVersionId: string

applyScoreToVersion input:

* promptVersionId: string
* reviewId: string

saveImprovedPromptAsNewVersion input:

* promptAssetId: string
* sourcePromptVersionId: string
* reviewId: string
* makeCurrent?: boolean

금지:

* promptRuns 관련 API 추가 금지
* executionResults 관련 API 추가 금지
* Codex 실행 API 추가 금지
* shortcuts/appEvents/globalShortcut API 추가 금지

10. Zod schema 요구사항

다음 schema를 정의합니다.

* PromptQualityReviewModeSchema
* PromptQualityGradeSchema
* PromptQualityDimensionScoresSchema
* PromptQualityIssueSchema
* PromptQualitySuggestionSchema
* PromptQualityReviewResultSchema
* ReviewDraftInputSchema
* ReviewVersionInputSchema
* SavePromptQualityReviewInputSchema
* ApplyQualityScoreToVersionInputSchema
* SaveImprovedPromptAsNewVersionInputSchema
* ListPromptQualityReviewsInputSchema

검증 규칙:

* compiledPrompt는 빈 문자열 불가
* promptVersionId는 빈 문자열 불가
* reviewMode는 local 또는 llm
* score는 0 이상 100 이하
* severity는 low / medium / high
* grade는 허용 enum
* arrays는 누락 시 빈 배열로 normalize 가능
* improvedPromptDraft는 optional string
* LLM 출력 score는 0-100 범위로 clamp하거나 검증 실패 처리

추가하지 말아야 할 schema:

* PromptRunSchema
* AgentRunSchema
* ExecutionResultSchema
* ValidationResultSchema
* QuickCaptureSettingsSchema
* RegisterGlobalShortcutInputSchema

11. UI 구조 권장

Renderer:

* src/renderer/components/quality/PromptQualityPanel.tsx
* src/renderer/components/quality/QualityScoreBadge.tsx
* src/renderer/components/quality/QualityDimensionScores.tsx
* src/renderer/components/quality/QualityIssuesList.tsx
* src/renderer/components/quality/QualitySuggestionsList.tsx
* src/renderer/components/quality/QualityReviewHistory.tsx
* src/renderer/components/quality/ImprovedPromptPreview.tsx
* src/renderer/hooks/usePromptQuality.ts

Shared:

* src/shared/quality/qualityTypes.ts
* src/shared/quality/qualitySchemas.ts
* src/shared/quality/localPromptQualityReviewer.ts
* src/shared/quality/scorePromptQuality.ts
* src/shared/quality/detectPromptSections.ts
* src/shared/quality/detectAmbiguity.ts
* src/shared/quality/qualityGrade.ts

Main:

* src/main/repositories/promptQualityReviewRepository.ts
* src/main/services/promptQuality/PromptQualityReviewService.ts
* src/main/services/promptQuality/prompts.ts
* src/main/ipc/promptQuality.ts

Compiler / prompt integration:

* 기존 PromptCompilerPanel
* 기존 PromptVersion detail panel
* 기존 prompt repository/service
* 기존 createNextVersion 흐름

12. stale state 규칙

품질 리뷰 결과도 stale 상태가 될 수 있습니다.

다음 변경이 발생하면 draft quality review 결과는 stale 처리하거나 초기화해야 합니다.

* originalInput 변경
* compiledPrompt 변경
* scenario 변경
* targetAgent 변경
* harnessTemplateId 변경
* projectContextProfileId 변경
* includeProjectContextProfile 변경
* manual projectContext 변경
* constraints 변경
* acceptanceCriteria 변경
* validationCommands 변경

중요:

* stale quality review 처리 때문에 originalInput이나 compiledPrompt를 자동 변경하지 마세요.
* stale review를 자동 재실행하지 마세요.
* 자동 LLM review 금지

13. 보안 요구사항

* LLM review는 main process에서만 수행합니다.
* API Key는 renderer로 반환하지 않습니다.
* API Key를 로그에 남기지 않습니다.
* reviewed prompt content를 불필요하게 console.log하지 않습니다.
* 사용자가 prompt에 secret을 넣었을 수 있으므로 prompt body 전체를 로그로 남기지 마세요.
* prompt review는 prompt execution이 아닙니다.
* 외부 에이전트를 실행하지 않습니다.
* repo_path가 있어도 파일 시스템을 읽지 않습니다.
* renderer에서 DB, fs, path, process, safeStorage, ipcRenderer에 직접 접근하지 않습니다.
* prompt_quality_reviews는 실행 결과 저장소가 아닙니다.
* prompt_runs, execution_results 등 실행 결과 테이블을 만들지 않습니다.

14. TDD 구현 순서

가능하면 다음 순서로 구현하세요.

1. quality schema 테스트 작성

* valid review result
* invalid score
* invalid grade
* invalid severity
* empty compiledPrompt 거부
* arrays default 처리

2. local reviewer 테스트 작성

* 필수 섹션이 모두 있으면 높은 점수
* Objective 누락 시 issue 생성
* Validation 누락 시 issue 생성
* Acceptance Criteria 누락 시 issue 생성
* Scope/Out of scope 누락 시 issue 생성
* 모호한 표현이 많으면 ambiguity issue 생성
* 너무 짧은 prompt는 낮은 점수
* code block과 Markdown을 훼손하지 않음

3. grade utility 테스트 작성

* 95 => excellent
* 80 => good
* 65 => usable
* 50 => needs_work
* 20 => weak

4. repository/service 테스트, 가능하면

* create review
* list reviews for version
* get latest review
* apply score to prompt version
* save improved prompt as new version

5. LLM service schema 테스트, 가능하면

* LLM output schema valid
* malformed output recoverable error
* API Key 없음 error
* review does not execute prompt

6. UI behavior 테스트, 가능하면

* Local review button works
* LLM review button requires explicit click
* no compiledPrompt disables review
* review result displayed
* apply improved prompt requires explicit action

15. 파일별 예상 변경

예상 변경 파일:

* DB schema / migration 파일, prompt_quality_reviews 선택 시
* shared quality schema/type 파일 추가
* local reviewer utility 추가
* quality score / grade utility 추가
* promptQualityReviewRepository 추가
* PromptQualityReviewService 추가
* promptQuality IPC handler 추가
* preload bridge 타입 추가
* PromptVersion detail panel에 Quality panel 추가
* PromptCompilerPanel에 draft review entry 추가
* PromptAsset card / search result card에 quality_score 표시
* createNextVersion flow와 improvedPromptDraft 저장 연결, 선택
* 관련 테스트 파일 추가

건드리지 말아야 할 것:

* quick capture trim/cleanup 추가 금지
* quick_capture settings 추가 금지
* globalShortcut 추가 금지
* appEvents bridge 추가 금지
* shortcuts bridge 추가 금지
* prompt_runs 관련 schema 추가 금지
* 실행 결과 저장 관련 코드 추가 금지
* 외부 repo 자동 스캔 추가 금지
* prompt execution service 추가 금지

16. 의존성 그래프

권장 의존성 방향:

shared/quality schemas
→ shared/local quality reviewer
→ main promptQuality repository/service
→ main IPC promptQuality
→ preload typed bridge
→ renderer quality hooks
→ renderer quality components
→ PromptVersion detail / PromptCompilerPanel integration

금지 방향:

* renderer → OpenAI SDK 직접 접근
* renderer → DB 직접 접근
* renderer → Electron ipcRenderer 직접 접근
* renderer → fs/path/process 직접 접근
* quality reviewer → external coding agent execution
* quality review → prompt run history
* review result → automatic prompt mutation

17. 자동 테스트 목록

가능한 경우 다음 테스트를 추가하세요.

Schema:

* PromptQualityReviewResultSchema accepts valid result
* rejects score below 0
* rejects score above 100
* rejects invalid severity
* rejects invalid reviewMode
* ReviewDraftInput rejects empty compiledPrompt
* ReviewVersionInput rejects empty promptVersionId

Local reviewer:

* detects missing Objective
* detects missing Context
* detects missing Acceptance Criteria
* detects missing Validation
* detects missing Final Response Format
* detects vague language
* detects overly broad instruction
* returns grade based on score
* preserves prompt text
* does not mutate input

Repository/service:

* creates quality review
* lists quality reviews by promptVersionId
* gets latest review
* applies overallScore to prompt_versions.quality_score
* saves improvedPromptDraft as next version, if implemented
* does not create prompt_runs or execution_results

LLM review:

* requires API Key
* validates JSON output
* handles malformed model output
* does not call external agents
* does not execute prompt

UI behavior:

* no compiledPrompt shows empty state
* local review works without API Key
* LLM review requires explicit click
* review result displays score and issues
* apply score requires explicit user action
* improvedPromptDraft does not overwrite automatically

18. 수동 QA 체크리스트

| 항목                               | 기대 결과                                    |
| -------------------------------- | ---------------------------------------- |
| 저장된 PromptVersion 선택             | 품질 패널 표시                                 |
| 리뷰 없음                            | “아직 리뷰 없음” empty state                   |
| Local review 실행                  | API Key 없이 점수와 issues 생성                 |
| LLM review 실행                    | 명시적 클릭 후 main process에서만 호출              |
| API Key 없음                       | LLM review error, local review 가능        |
| 필수 섹션 없는 prompt                  | missing section issue 표시                 |
| Validation 없는 prompt             | validationStrength 낮게 표시                 |
| Acceptance Criteria 없는 prompt    | 개선 제안 표시                                 |
| 리뷰 저장                            | prompt_quality_reviews에 저장, 실행 결과 테이블 아님 |
| 점수 반영                            | prompt_versions.quality_score 업데이트       |
| 프롬프트 카드                          | current version quality_score 표시         |
| improvedPromptDraft              | 자동 덮어쓰기 없음                               |
| 개선안 새 버전 저장                      | 기존 PromptAsset에 새 PromptVersion 생성       |
| draft review                     | 자동 저장 없음                                 |
| draft review                     | originalInput 변경 없음                      |
| quick capture 후 review           | 클립보드 원문 보존                               |
| harness 적용 prompt review         | 하네스 선택값 유지                               |
| project context 적용 prompt review | context 선택값 유지                           |
| 앱 재시작                            | 저장된 리뷰 이력 유지                             |
| prompt_runs 확인                   | 실행 결과 관련 데이터 생성 없음                       |

19. Attribution

이 Phase 14 명세는 Phase 11, Phase 12, Phase 13의 최종 guardrail을 반영합니다.

반영된 Phase 11 결정:

* 빠른 캡처는 버튼 + File 메뉴 + 앱 포커스 상태의 CmdOrCtrl+Shift+V accelerator로 한정
* 기존 menu.onAction / MENU_ACTION_CHANNEL 재사용
* window.prompter.appEvents.* 추가 없음
* window.prompter.shortcuts.* 추가 없음
* OS globalShortcut 없음
* quick_capture_* settings 없음
* 클립보드 텍스트 원문 보존
* 자동 trim/cleanup 없음
* append 옵션 없음
* no-auto-LLM, no-auto-save, no-log, no-persistence guardrail 유지

반영된 Phase 12 결정:

* 하네스 템플릿은 프롬프트 구조와 컴파일 규칙을 담당
* 하네스 선택은 originalInput/scenario/targetAgent를 자동 덮어쓰지 않음
* 하네스 선택은 자동 analyze/compile/save를 실행하지 않음
* 하네스 선택은 stale compiler state를 초기화
* template_body는 코드로 실행하지 않음
* 하네스 템플릿은 LLM 시스템 프롬프트 전체를 덮어쓰지 않고 추가 지침으로만 반영

반영된 Phase 13 결정:

* 프로젝트 컨텍스트는 사용자 제공 프로젝트 맥락으로만 반영
* project context 선택은 originalInput/manual context/scenario/targetAgent를 자동 덮어쓰지 않음
* project context 선택은 자동 analyze/compile/save를 실행하지 않음
* repo_path는 저장할 수 있어도 파일 시스템 자동 접근 없음
* 하네스 템플릿과 project context profile은 동시에 적용 가능

Phase 14에서 이 결정을 깨뜨리지 마세요.

20. 이번 단계에서 구현하지 말 것

다음은 절대 구현하지 마세요.

* 프롬프트 실행 기능
* Codex CLI 실행
* Codex OAuth
* Claude Code 실행
* Cursor 실행
* 외부 앱 자동 제어
* 외부 repo 자동 스캔
* repo_path 기반 파일 읽기
* git 명령 실행
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
* quality marketplace
* 원격 reviewer 다운로드
* review result 기반 자동 prompt overwrite
* 자동 LLM review
* 자동 prompt 개선 적용

완료 기준:

* Local heuristic Prompt Quality Reviewer가 구현되어 있습니다.
* 저장된 PromptVersion을 품질 리뷰할 수 있습니다.
* 현재 draft compiledPrompt를 품질 리뷰할 수 있습니다.
* API Key 없이 local review가 동작합니다.
* LLM review는 사용자가 명시적으로 클릭한 경우에만 main process에서 실행됩니다.
* LLM review 출력은 Zod schema로 검증됩니다.
* 리뷰 결과는 overallScore, grade, dimensionScores, issues, suggestions, warnings를 포함합니다.
* 리뷰 결과는 자동으로 prompt를 수정하지 않습니다.
* 리뷰 결과는 자동으로 quality_score를 업데이트하지 않습니다.
* 사용자가 명시적으로 선택하면 quality_score를 PromptVersion에 반영할 수 있습니다.
* improvedPromptDraft가 있는 경우 자동 덮어쓰기 없이 새 PromptVersion으로 저장할 수 있습니다.
* 프롬프트 카드와 검색 결과에 current version quality_score가 표시됩니다.
* prompt_quality_reviews 테이블을 추가한 경우, 이는 실행 결과 저장소가 아니며 prompt_runs와 분리되어 있습니다.
* 모든 IPC 입력값은 Zod로 검증됩니다.
* renderer는 DB, OpenAI SDK, fs, path, process, safeStorage, ipcRenderer에 직접 접근하지 않습니다.
* Phase 11 quick capture guardrail, Phase 12 harness guardrail, Phase 13 project context guardrail이 유지됩니다.
* TypeScript 타입 검사가 통과합니다.
* 앱이 개발 모드에서 정상 실행됩니다.
* 프롬프트 실행이나 실행 결과 저장 기능은 추가되지 않았습니다.

작업 전:

1. 현재 Phase 0부터 Phase 13까지의 코드 구조를 확인합니다.
2. prompt_versions schema와 quality_score 필드 사용 현황을 확인합니다.
3. PromptVersion detail panel 구조를 확인합니다.
4. PromptCompilerPanel draft state 구조를 확인합니다.
5. Phase 11 quick capture stale state 초기화 로직을 확인합니다.
6. Phase 12 harnessTemplateId draft state와 stale state 초기화 방식을 확인합니다.
7. Phase 13 projectContextProfileId/includeProjectContextProfile draft state와 stale state 초기화 방식을 확인합니다.
8. OpenAI SDK 호출이 main process에서만 이루어지는 기존 PromptCompilerService 구조를 확인합니다.
9. prompt_quality_reviews 테이블을 추가할지, quality_score만 사용할지 결정합니다.
10. TDD 순서에 따라 schema와 local reviewer 테스트를 먼저 작성합니다.
11. 간결한 구현 계획을 세운 뒤 Phase 14만 구현합니다.

작업 후:

1. 변경된 내용을 요약합니다.
2. 생성되거나 수정된 파일 목록을 제공합니다.
3. schema 또는 migration 변경을 설명합니다.
4. Local heuristic reviewer의 평가 기준을 설명합니다.
5. LLM reviewer를 구현했다면 main process 데이터 흐름을 설명합니다.
6. API Key가 renderer로 노출되지 않는 방식을 설명합니다.
7. 리뷰 결과 저장 정책을 설명합니다.
8. quality_score 반영이 자동이 아니라 명시적 액션인 방식을 설명합니다.
9. improvedPromptDraft가 자동 덮어쓰기 되지 않는 방식을 설명합니다.
10. PromptVersion detail과 PromptCompilerPanel의 UI 연결 방식을 설명합니다.
11. Phase 11 quick capture guardrail, Phase 12 harness guardrail, Phase 13 project context guardrail을 유지한 방식을 설명합니다.
12. 추가한 테스트와 테스트 결과를 설명합니다.
13. 앱 실행 및 타입 검사 명령어를 제공합니다.
14. 수동 테스트 절차를 제공합니다.
15. 아직 구현하지 않은 기능을 명확히 구분해서 설명합니다.
