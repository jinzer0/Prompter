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

* 하네스 템플릿 관리 UI
* 기본 하네스 템플릿 seed
* 하네스 템플릿 선택은 자동 analyze / compile / save를 실행하지 않음
* template_body는 코드로 실행되지 않음

Phase 13:

* 프로젝트 컨텍스트 프로파일 관리
* PromptCompilerPanel에서 project context profile 선택 및 include 가능
* repo_path가 있어도 파일 시스템 자동 접근 없음
* context 선택은 자동 analyze / compile / save를 실행하지 않음

Phase 14:

* Prompt Quality Reviewer
* Local heuristic review
* 선택적 LLM review는 명시적 클릭으로만 실행
* 리뷰 결과는 자동으로 prompt를 수정하지 않음
* prompt_quality_reviews는 prompt_runs와 분리됨

Phase 15:

* PromptAsset 복제
* PromptVersion에서 derived draft 생성
* Prompt Template 관리
* Prompt lineage 추적
* Prompt Template 적용은 명시적 액션과 confirmation 필요
* template content는 코드로 실행되지 않음

Phase 16:

* 전체 라이브러리 백업
* 프로젝트 단위 백업
* PromptAsset 백업
* Prompt Template pack export
* Harness Template pack export
* 백업 파일 검증
* safe duplicate import
* transaction 기반 import
* import 후 검색 인덱스 갱신
* API Key, secret, safeStorage 값, prompt_runs 제외

이 작업은 Phase 17: 데이터 정리 / 중복 탐지 / 유지보수 도구입니다.

목표:
Prompter 라이브러리가 오래 사용되면서 생길 수 있는 중복 프롬프트, 중복 태그, 깨진 참조, orphan record, 잘못된 current version, 검색 인덱스 불일치, 비어 있는 자산, 사용되지 않는 템플릿 등을 안전하게 탐지하고 정리할 수 있는 유지보수 도구를 구현합니다.

이 단계의 핵심:

* 먼저 분석하고 preview를 보여줌
* 사용자가 명시적으로 선택한 작업만 실행
* destructive action 전 confirmation
* 가능한 경우 backup 권장
* transaction 기반 repair
* 자동 LLM 호출 없음
* 자동 삭제 없음
* 자동 실행 없음

중요:
프롬프트 실행 기능을 추가하지 마세요.
Codex CLI를 호출하지 마세요.
Claude Code CLI를 호출하지 마세요.
Cursor를 자동 실행하지 마세요.
외부 앱을 자동 제어하지 마세요.
외부 repo를 자동 스캔하지 마세요.
repo_path 기반 파일 읽기를 하지 마세요.
git 명령을 실행하지 마세요.
프롬프트 실행 결과 저장 기능을 추가하지 마세요.
prompt_runs, agent_runs, execution_results, validation_results, run_logs를 만들거나 사용하지 마세요.
OS 전역 단축키를 추가하지 마세요.
window.prompter.appEvents.*를 추가하지 마세요.
window.prompter.shortcuts.*를 추가하지 마세요.
quick_capture_* settings key를 추가하지 마세요.
이번 단계는 로컬 DB 유지보수, 중복 탐지, 안전한 정리 작업에만 집중합니다.

Phase 11부터 Phase 16까지의 guardrail:

* quick capture 동작을 변경하지 마세요.
* 클립보드 텍스트를 자동 정리하지 마세요.
* 하네스 템플릿 선택 로직을 변경하지 마세요.
* 프로젝트 컨텍스트 프로파일 선택 로직을 변경하지 마세요.
* 품질 리뷰어를 자동 실행하지 마세요.
* Prompt Template 선택/적용 규칙을 변경하지 마세요.
* 백업/import 전략을 overwrite 방식으로 바꾸지 마세요.
* maintenance scan은 자동 LLM 호출을 실행하면 안 됩니다.
* maintenance action은 자동 저장, 자동 삭제, 자동 병합을 하면 안 됩니다.
* 사용자가 preview를 확인하고 명시적으로 실행해야 합니다.
* 유지보수 작업은 current draft를 자동으로 덮어쓰면 안 됩니다.
* 유지보수 작업 후 자동 analyze / compile / review / export를 실행하지 않습니다.

유지보수 범위:

탐지할 항목:

1. 중복 또는 유사 PromptAsset
2. 중복 태그
3. 사용되지 않는 태그
4. 비어 있는 PromptAsset
5. current_version_id가 깨진 PromptAsset
6. PromptAsset 없이 남은 PromptVersion, 발생 가능한 경우
7. PromptVersion 없이 존재하는 PromptAsset
8. 깨진 prompt_tags 연결
9. 깨진 lineage 관계
10. source가 사라진 Prompt Template
11. project가 사라진 project_context_profiles
12. prompt_version이 사라진 prompt_quality_reviews
13. FTS 검색 인덱스 불일치
14. 너무 오래된 local review 또는 outdated quality_score, 선택
15. 이름만 다른 거의 같은 Prompt Template, 선택
16. 이름만 다른 거의 같은 Harness Template, 선택

정리할 수 있는 작업:

1. 검색 인덱스 재생성
2. current_version_id repair
3. unused tag 삭제
4. duplicate tag merge
5. empty PromptAsset 삭제 또는 archive
6. 깨진 prompt_tags 제거
7. 깨진 lineage reference 제거 또는 표시
8. orphan quality review 삭제, prompt_quality_reviews가 있는 경우
9. source가 사라진 Prompt Template의 source reference 제거
10. project_context_profile의 깨진 project reference 처리
11. duplicate PromptAsset 후보를 사용자가 직접 비교하고 하나를 archive하거나 삭제
12. duplicate Prompt Template 후보를 비교하고 하나를 archive하거나 삭제

주의:

* “자동 병합”은 하지 마세요.
* “자동 삭제”는 하지 마세요.
* 모든 정리 작업은 preview와 confirmation 후 실행합니다.
* 삭제보다는 archive 또는 soft delete가 가능하면 더 안전합니다.
* soft delete / archive 스키마가 없다면 destructive delete는 더 강한 confirmation을 요구합니다.

데이터 모델 선택:

이번 Phase에서 새로운 테이블은 필수가 아닙니다.

선택적 추가 테이블: maintenance_reports

필요하다면 maintenance scan 결과를 저장할 수 있습니다.

maintenance_reports 필드:

* id: text, primary key
* report_type: text, required
* summary: text, required, JSON string
* findings: text, required, JSON string
* created_at: integer, required

MVP에서는 report를 저장하지 않고 UI에만 표시해도 됩니다.
저장 기능이 필요하면 사용자가 명시적으로 “리포트 저장”을 눌렀을 때만 저장하세요.

선택적 스키마 확장:
다음 entity에 is_archived 또는 archived_at을 추가할 수 있습니다.

* prompt_assets
* prompt_templates
* harness_templates
* project_context_profiles

주의:

* archive 도입이 migration과 UI 범위를 크게 키우면 이번 Phase에서는 archive 대신 delete confirmation만 구현하세요.
* delete는 반드시 confirmation을 거치고 transaction으로 처리해야 합니다.
* archive를 도입한다면 기존 검색/목록에서 archived item을 기본 숨김 처리할지 명확히 정하세요.

절대 추가하지 말아야 할 테이블:

* prompt_runs
* agent_runs
* execution_results
* validation_results
* run_logs
* clipboard_history
* quick_capture_settings

이번 단계에서 구현할 주요 기능:

1. Maintenance Scan

전체 라이브러리를 스캔해 유지보수 리포트를 생성합니다.

권장 API:

* window.prompter.maintenance.scanLibrary(input)

ScanLibraryInput:

* includeDuplicatePrompts?: boolean
* includeDuplicateTags?: boolean
* includeUnusedTags?: boolean
* includeBrokenReferences?: boolean
* includeSearchIndexHealth?: boolean
* includeTemplateIssues?: boolean
* includeQualityIssues?: boolean

ScanLibraryResult:

* scannedAt: number
* summary:

  * promptAssetCount
  * promptVersionCount
  * projectCount
  * tagCount
  * promptTemplateCount
  * harnessTemplateCount
  * issueCount
  * highSeverityCount
  * mediumSeverityCount
  * lowSeverityCount
* findings: MaintenanceFinding[]
* recommendedActions: MaintenanceActionPreview[]

MaintenanceFinding:

* id: string
* severity: "low" | "medium" | "high"
* category: string
* title: string
* description: string
* affectedEntityType: string
* affectedEntityIds: string[]
* suggestedActionType?: string
* safeAutoFixAvailable: boolean

중요:

* scan은 read-only입니다.
* scan 중 DB를 변경하지 않습니다.
* scan 중 LLM을 호출하지 않습니다.
* scan 중 외부 파일을 읽지 않습니다.
* repo_path를 따라가지 않습니다.

2. 중복 PromptAsset 탐지

local heuristic 기반으로 중복 또는 유사 프롬프트 후보를 찾습니다.

비교 기준:

* title normalized similarity
* current version original_input similarity
* current version compiled_prompt similarity
* scenario 동일 여부
* target_agent 동일 여부
* project_id 동일 여부
* tags overlap

MVP 구현:

* 완전 동일 title
* normalized title 동일
* original_input 완전 동일
* compiled_prompt 완전 동일
* title + scenario + target_agent 동일

선택 구현:

* 간단한 문자열 similarity
* Jaccard token similarity
* Levenshtein distance, 직접 구현 부담이 낮을 때만

금지:

* embedding 생성 금지
* vector DB 추가 금지
* 자동 LLM 기반 중복 판정 금지
* 중복 후보 자동 병합 금지

UI:

* duplicate candidate group 표시
* 각 후보의 title, project, scenario, targetAgent, updatedAt, qualityScore, versionCount 표시
* side-by-side 비교 가능하면 좋음
* 사용자는 “열기”, “비교”, “archive/delete 후보 선택” 정도만 수행

3. 중복 태그 탐지 / 병합

중복 태그 후보를 찾습니다.

탐지 기준:

* trim 후 동일
* 대소문자만 다른 이름
* 공백/하이픈/언더스코어 차이
* 예:

  * "swiftui"
  * "SwiftUI"
  * "swift-ui"
  * "swift_ui"

UI:

* duplicate tag group 표시
* 각 tag의 사용 count 표시
* canonical tag 선택
* merge preview 표시

Merge 동작:

* prompt_tags에서 duplicate tag를 canonical tag로 재연결
* 중복 연결 방지
* duplicate tag 삭제
* transaction 사용
* 완료 후 tag list와 search/filter 갱신

주의:

* 자동 canonical 선택은 추천만 가능
* 실제 merge는 사용자 confirmation 필요
* merge 후 되돌리기 기능은 이번 Phase에서 필수 아님
* merge 전 백업 권장 문구 표시

4. 사용되지 않는 태그 정리

prompt_tags에 연결되지 않은 tags를 찾습니다.

동작:

* unused tags 목록 표시
* 선택 삭제 가능
* 전체 선택 가능
* confirmation 필요
* transaction 사용

주의:

* 삭제 전 “이 작업은 태그 자체를 삭제하지만 프롬프트 내용은 삭제하지 않습니다” 안내
* 자동 삭제 금지

5. current_version_id repair

PromptAsset의 current_version_id가 다음 상태일 수 있습니다.

문제:

* null인데 versions가 있음
* 존재하지 않는 prompt_version_id를 가리킴
* 다른 prompt_asset_id의 version을 가리킴
* current version은 있지만 version_number가 최신이 아님, 이것은 문제라기보다 정보

Repair 정책:

* versions가 있고 current_version_id가 null이면 가장 높은 version_number를 current로 설정
* current_version_id가 깨졌으면 같은 prompt_asset_id의 가장 높은 version_number를 current로 설정
* version이 하나도 없으면 empty PromptAsset finding으로 표시

요구사항:

* repair preview 표시
* repair 실행은 confirmation 필요
* transaction 사용
* repair 후 prompt list 갱신
* repair 후 search preview가 정상 동작해야 함

6. Empty PromptAsset 정리

PromptVersion이 하나도 없는 PromptAsset을 찾습니다.

UI:

* title
* project
* createdAt
* updatedAt
* tags
* parent/lineage 여부 표시

Action:

* delete empty assets
* archive empty assets, archive 스키마가 있으면

주의:

* lineage parent로 쓰이는 PromptAsset이면 삭제 경고 강화
* child prompt가 있는 경우 deletion impact 표시
* 삭제 전 confirmation 필수
* 자동 삭제 금지

7. Broken Reference 정리

다음 깨진 참조를 탐지합니다.

* prompt_tags.prompt_asset_id가 없는 PromptAsset을 가리킴
* prompt_tags.tag_id가 없는 Tag를 가리킴
* prompt_asset_lineage parent/child/source version이 없음
* prompt_templates.source_prompt_asset_id가 없음
* prompt_templates.source_prompt_version_id가 없음
* project_context_profiles.project_id가 없음
* prompt_quality_reviews.prompt_version_id가 없음
* prompt_assets.project_id가 없음, project 삭제 정책에 따라 warning
* prompt_versions.prompt_asset_id가 없음, 발생 가능성이 낮지만 검사

Action:

* broken prompt_tags 제거
* broken lineage reference 제거 또는 source missing 상태로 유지
* prompt_template source reference null 처리
* orphan project_context_profile 삭제 또는 projectless 상태로 표시, 정책 필요
* orphan quality review 삭제
* orphan prompt_version은 강한 경고 후 삭제 가능

MVP:

* broken prompt_tags 제거
* broken source references null 처리
* orphan quality reviews 삭제
* search index rebuild

주의:

* 삭제/수정 전 preview
* transaction 사용
* 자동 처리 금지

8. Search Index Health Check

Phase 7의 FTS 검색 인덱스 상태를 확인합니다.

검사:

* prompt_versions 수와 FTS indexed rows 수 비교
* 최근 prompt_versions가 FTS에 없는지 확인
* FTS 테이블이 없는 경우 감지
* search query smoke test 가능하면 수행

Action:

* rebuildSearchIndex 실행
* rebuild 후 결과 표시

요구사항:

* rebuild는 사용자가 명시적으로 클릭
* import 후 자동 rebuild는 Phase 16에서 유지 가능
* maintenance screen에서는 수동 rebuild 버튼 제공
* rebuild 실패 시 error 표시

9. Prompt Template / Harness Template 유지보수

Prompt Template:

* source prompt가 사라진 template 찾기
* 같은 이름의 template 후보 찾기
* 비어 있는 template_body 탐지
* placeholder가 있지만 variables 목록이 비어 있는 template 탐지

Harness Template:

* 비어 있는 template_body 탐지
* required_fields JSON 파싱 실패 탐지
* clarification_policy JSON 파싱 실패 탐지
* 같은 name/scenario/target_agent 중복 탐지

Action:

* source reference null 처리
* duplicate candidate 표시
* invalid JSON이 있는 template 열기
* 삭제 또는 archive, confirmation 필요

주의:

* template_body 자동 수정 금지
* LLM으로 자동 개선 금지
* 코드 실행 금지

10. Quality Review 유지보수

Phase 14의 prompt_quality_reviews가 있다면 다음을 검사합니다.

* prompt_version_id가 없는 review
* 해당 prompt_version이 삭제된 review
* prompt_versions.quality_score와 latest review score 불일치
* current version에 quality_score가 없음
* 너무 오래된 review, 선택

Action:

* orphan review 삭제
* latest review score를 prompt_versions.quality_score에 반영, 사용자 선택
* quality_score clear, 선택

주의:

* 자동 score 반영 금지
* quality review는 prompt execution result가 아닙니다.
* prompt_runs 테이블을 만들지 마세요.

11. Maintenance Actions

scan 결과에서 사용자가 선택할 수 있는 action을 제공합니다.

MaintenanceActionPreview:

* id: string
* type: string
* title: string
* description: string
* severity: "low" | "medium" | "high"
* affectedEntityType: string
* affectedEntityIds: string[]
* destructive: boolean
* requiresBackupRecommendation: boolean
* estimatedChangeCount: number

실행 API:

* window.prompter.maintenance.runAction(input)

RunMaintenanceActionInput:

* actionId 또는 actionType
* entityIds
* options
* confirmationToken?: string

권장:

* scan 결과를 main process memory에 maintenance session으로 저장
* runAction은 sessionId + actionId 기반으로 실행
* renderer가 임의로 dangerous action payload를 조립하지 않게 합니다.

단순 구현:

* action별 명시적 IPC를 만들어도 됩니다.

  * mergeTags
  * deleteUnusedTags
  * repairCurrentVersions
  * removeBrokenPromptTags
  * rebuildSearchIndex

12. Backup Recommendation

destructive action 전 백업 권장 메시지를 표시합니다.

예:

* “삭제 또는 병합 작업 전 백업을 권장합니다.”
* “Phase 16 백업 기능으로 전체 백업을 먼저 만들 수 있습니다.”

요구사항:

* 백업을 강제하지는 않아도 됩니다.
* destructive action confirmation에는 “백업 권장을 확인했습니다” checkbox를 둘 수 있습니다.
* 삭제/병합 작업은 confirmation 없이 실행되면 안 됩니다.

13. Maintenance UI

Settings 또는 별도 Maintenance 화면을 추가합니다.

권장 위치:

* Settings > Maintenance
* Tools 메뉴 > Library Maintenance

메뉴 추가 시:

* 기존 menu.onAction / MENU_ACTION_CHANNEL 패턴 재사용
* window.prompter.appEvents.* 추가 금지
* shortcuts bridge 추가 금지
* globalShortcut 추가 금지

UI 구성:

* “라이브러리 스캔” 버튼
* scan 옵션 체크박스
* scan summary cards
* severity별 findings list
* recommended actions list
* duplicate prompts tab
* duplicate tags tab
* broken references tab
* search index tab
* templates tab
* quality tab
* action preview dialog
* confirmation dialog
* result summary

상태:

* scanning
* scan success
* scan failed
* no issues
* action preview
* action running
* action success
* action failed and rolled back

14. Transaction / rollback

데이터를 변경하는 maintenance action은 transaction으로 처리합니다.

요구사항:

* merge tags transaction
* delete unused tags transaction
* repair current versions transaction
* broken references cleanup transaction
* template source cleanup transaction
* quality review cleanup transaction

실패 시:

* 전체 rollback
* UI에 실패 메시지 표시
* 어떤 entity에서 실패했는지 가능한 범위에서 설명
* stack trace나 DB path는 사용자에게 노출하지 않음

15. IPC API 요구사항

preload bridge에 다음 API를 추가합니다.

권장 API:

* window.prompter.maintenance.scanLibrary(input)
* window.prompter.maintenance.mergeDuplicateTags(input)
* window.prompter.maintenance.deleteUnusedTags(input)
* window.prompter.maintenance.repairCurrentVersions(input)
* window.prompter.maintenance.cleanupBrokenReferences(input)
* window.prompter.maintenance.rebuildSearchIndex()
* window.prompter.maintenance.cleanupOrphanQualityReviews(input)
* window.prompter.maintenance.cleanupTemplateSourceReferences(input)
* window.prompter.maintenance.getLastScanSummary(), 선택

input 예:
MergeDuplicateTagsInput:

* canonicalTagId: string
* duplicateTagIds: string[]

DeleteUnusedTagsInput:

* tagIds: string[]

RepairCurrentVersionsInput:

* promptAssetIds: string[]

CleanupBrokenReferencesInput:

* findingIds?: string[]
* categories?: string[]

금지:

* promptRuns 관련 API 추가 금지
* executionResults 관련 API 추가 금지
* Codex 실행 API 추가 금지
* shortcuts/appEvents/globalShortcut API 추가 금지

16. Zod schema 요구사항

다음 schema를 정의합니다.

* MaintenanceScanInputSchema
* MaintenanceScanResultSchema
* MaintenanceFindingSchema
* MaintenanceSeveritySchema
* MaintenanceCategorySchema
* MaintenanceActionPreviewSchema
* MergeDuplicateTagsInputSchema
* DeleteUnusedTagsInputSchema
* RepairCurrentVersionsInputSchema
* CleanupBrokenReferencesInputSchema
* CleanupOrphanQualityReviewsInputSchema
* CleanupTemplateSourceReferencesInputSchema
* MaintenanceActionResultSchema

검증 규칙:

* ids는 빈 문자열 불가
* duplicateTagIds는 빈 배열 불가
* canonicalTagId가 duplicateTagIds에 포함되면 reject
* tagIds는 빈 배열 불가
* promptAssetIds는 빈 배열 불가
* severity/category는 허용 enum
* destructive action에는 confirmation flag 또는 confirmation token 요구 가능

추가하지 말아야 할 schema:

* PromptRunSchema
* AgentRunSchema
* ExecutionResultSchema
* ValidationResultSchema
* QuickCaptureSettingsSchema
* RegisterGlobalShortcutInputSchema
* ClipboardHistorySchema

17. UI 구조 권장

Renderer:

* src/renderer/components/maintenance/MaintenancePanel.tsx
* src/renderer/components/maintenance/MaintenanceScanOptions.tsx
* src/renderer/components/maintenance/MaintenanceSummaryCards.tsx
* src/renderer/components/maintenance/MaintenanceFindingsList.tsx
* src/renderer/components/maintenance/DuplicatePromptGroups.tsx
* src/renderer/components/maintenance/DuplicateTagGroups.tsx
* src/renderer/components/maintenance/BrokenReferencesPanel.tsx
* src/renderer/components/maintenance/SearchIndexHealthPanel.tsx
* src/renderer/components/maintenance/MaintenanceActionDialog.tsx
* src/renderer/components/maintenance/MaintenanceResultSummary.tsx
* src/renderer/hooks/useMaintenance.ts

Shared:

* src/shared/maintenance/maintenanceTypes.ts
* src/shared/maintenance/maintenanceSchemas.ts
* src/shared/maintenance/normalizeForDuplicateDetection.ts
* src/shared/maintenance/detectDuplicateTags.ts
* src/shared/maintenance/detectDuplicatePrompts.ts

Main:

* src/main/services/maintenance/MaintenanceScanService.ts
* src/main/services/maintenance/MaintenanceActionService.ts
* src/main/ipc/maintenance.ts

Repository integration:

* existing prompt repository
* existing tag repository
* existing prompt template repository
* existing harness template repository
* existing project context repository
* existing prompt quality repository
* existing search index service

18. TDD 구현 순서

가능하면 다음 순서로 구현하세요.

1. maintenance schema 테스트 작성

* valid scan result
* invalid severity
* invalid action type
* invalid duplicate tag merge input
* canonicalTagId included in duplicateTagIds reject

2. duplicate tag detection 테스트 작성

* "SwiftUI" vs "swiftui"
* "swift-ui" vs "swift_ui"
* trim duplicate
* unrelated tags not grouped

3. duplicate prompt detection 테스트 작성

* identical title
* normalized title
* identical original_input
* identical compiled_prompt
* same scenario/targetAgent/title group

4. current version repair planner 테스트 작성

* null current_version_id with versions
* invalid current_version_id
* current points to other asset version
* no versions means empty asset finding

5. broken reference scanner 테스트 작성

* broken prompt_tags
* broken lineage
* broken prompt template source
* orphan quality reviews
* missing project context project

6. action service 테스트, 가능하면

* merge tags transaction
* delete unused tags
* repair current versions
* cleanup broken prompt_tags
* rollback on error
* rebuild search index call

7. renderer behavior 테스트, 가능하면

* scan button loading
* findings render
* no issues empty state
* destructive action confirmation
* backup recommendation shown
* action success refreshes scan

19. 파일별 예상 변경

예상 변경 파일:

* shared maintenance schema/type 파일 추가
* duplicate detection utilities 추가
* MaintenanceScanService 추가
* MaintenanceActionService 추가
* maintenance IPC handler 추가
* preload bridge 타입 추가
* Settings 또는 Tools menu에 Maintenance 진입점 추가
* MaintenancePanel 및 관련 UI 컴포넌트 추가
* search index rebuild API 재사용
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
* 자동 백업 스케줄러 추가 금지

20. 의존성 그래프

권장 의존성 방향:

shared/maintenance schemas
→ shared duplicate detection utilities
→ main maintenance scan/action services
→ existing repositories/search index service
→ main maintenance IPC
→ preload typed bridge
→ renderer maintenance hooks
→ renderer maintenance UI
→ menu action integration

금지 방향:

* renderer → DB 직접 접근
* renderer → Electron ipcRenderer 직접 접근
* renderer → fs/path/process 직접 접근
* maintenance scan → LLM auto call
* maintenance action → prompt execution
* repo_path → filesystem scan
* cleanup → automatic destructive changes without confirmation

21. 자동 테스트 목록

가능한 경우 다음 테스트를 추가하세요.

Schema:

* MaintenanceScanInputSchema accepts valid options
* MaintenanceFindingSchema rejects invalid severity
* MergeDuplicateTagsInputSchema rejects empty duplicateTagIds
* MergeDuplicateTagsInputSchema rejects canonicalTagId in duplicateTagIds
* DeleteUnusedTagsInputSchema rejects empty tagIds

Duplicate detection:

* detects case-insensitive tag duplicates
* detects separator-based tag duplicates
* detects exact prompt title duplicates
* detects exact original_input duplicates
* detects exact compiled_prompt duplicates
* does not group unrelated prompts

Repair planning:

* plans current_version_id repair
* identifies empty PromptAsset
* identifies broken current_version_id
* handles no versions safely

Broken references:

* detects broken prompt_tags
* detects broken lineage
* detects prompt templates with missing source
* detects orphan quality reviews
* detects project context profiles with missing project

Actions:

* merge tags rewrites prompt_tags
* merge tags avoids duplicate prompt_tags
* delete unused tags deletes only selected tags
* repair current versions updates expected assets
* cleanup broken references removes expected rows
* action rollback on failure
* rebuild search index called after relevant cleanup

UI:

* scan shows summary
* no issues state
* destructive actions require confirmation
* backup recommendation appears
* action result summary appears
* current draft is not modified

22. 수동 QA 체크리스트

| 항목                           | 기대 결과                        |
| ---------------------------- | ---------------------------- |
| Maintenance 화면 열기            | 스캔 옵션과 버튼 표시                 |
| 라이브러리 스캔                     | findings와 summary 표시         |
| 이슈 없는 DB                     | no issues empty state        |
| 중복 태그 생성 후 스캔                | duplicate tag group 표시       |
| 태그 병합                        | canonical tag로 연결 이동         |
| 태그 병합 후                      | 중복 prompt_tags 없음            |
| unused tag 생성 후 스캔           | unused tag 표시                |
| unused tag 삭제                | 선택 태그 삭제                     |
| current_version_id 깨짐        | repair action 표시             |
| repair 실행                    | current_version_id 복구        |
| broken prompt_tags           | cleanup action 표시            |
| cleanup 실행                   | 깨진 연결 제거                     |
| FTS health check             | rebuild 버튼 표시                |
| rebuild 실행                   | 검색 정상 동작                     |
| Prompt Template source 삭제 상황 | missing source warning       |
| Quality review orphan 상황     | cleanup 가능                   |
| destructive action           | 백업 권장 + confirmation 필요      |
| action 실패                    | rollback 및 error 표시          |
| maintenance 후                | current draft 변경 없음          |
| maintenance 후                | 자동 analyze/compile/review 없음 |
| prompt_runs 확인               | 실행 결과 관련 데이터 생성 없음           |

23. Attribution

이 Phase 17 명세는 Phase 11, Phase 12, Phase 13, Phase 14, Phase 15, Phase 16의 최종 guardrail을 반영합니다.

반영된 Phase 11 결정:

* 빠른 캡처는 버튼 + File 메뉴 + 앱 포커스 상태의 CmdOrCtrl+Shift+V accelerator로 한정
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

반영된 Phase 13 결정:

* 프로젝트 컨텍스트는 사용자 제공 프로젝트 맥락으로만 반영
* project context 선택은 originalInput/manual context/scenario/targetAgent를 자동 덮어쓰지 않음
* project context 선택은 자동 analyze/compile/save를 실행하지 않음
* repo_path는 저장할 수 있어도 파일 시스템 자동 접근 없음

반영된 Phase 14 결정:

* 품질 리뷰는 프롬프트 실행이 아님
* 품질 리뷰는 자동 LLM 호출을 실행하지 않음
* 리뷰 결과는 자동으로 prompt를 수정하지 않음
* improvedPromptDraft는 자동 덮어쓰기 없이 명시적 액션으로만 반영
* prompt_quality_reviews는 prompt_runs와 분리됨

반영된 Phase 15 결정:

* Prompt Template 선택은 자동 LLM 호출, 자동 compile, 자동 저장을 실행하지 않음
* Prompt Template 적용은 명시적 액션과 confirmation 필요
* template content는 코드로 실행하지 않음
* derived draft 저장 시에만 lineage 기록
* prompt_runs와 실행 결과 저장 기능은 없음

반영된 Phase 16 결정:

* 백업/import는 secret을 포함하지 않음
* import는 safe duplicate strategy만 사용
* import는 기존 데이터를 overwrite하지 않음
* import 후 자동 analyze/compile/review/execution 없음
* 백업 암호화와 자동 백업 스케줄러는 제외

Phase 17에서 이 결정을 깨뜨리지 마세요.

24. 이번 단계에서 구현하지 말 것

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
* 자동 백업 스케줄러
* 백그라운드 유지보수
* 자동 삭제
* 자동 병합
* LLM 기반 자동 중복 판정
* embedding 생성
* vector DB
* 유지보수 결과 기반 자동 prompt 수정

완료 기준:

* Maintenance 화면 또는 패널이 구현되어 있습니다.
* 라이브러리 scan이 read-only로 동작합니다.
* 중복 PromptAsset 후보를 탐지하고 표시할 수 있습니다.
* 중복 tag 후보를 탐지하고 표시할 수 있습니다.
* 사용하지 않는 tag를 탐지하고 삭제할 수 있습니다.
* duplicate tag merge가 transaction 기반으로 동작합니다.
* current_version_id 문제를 탐지하고 repair할 수 있습니다.
* empty PromptAsset을 탐지하고 confirmation 후 정리할 수 있습니다.
* broken references를 탐지하고 안전하게 cleanup할 수 있습니다.
* FTS search index health check와 rebuild가 동작합니다.
* Prompt Template / Harness Template의 기본 문제를 탐지할 수 있습니다.
* orphan quality review를 탐지하고 정리할 수 있습니다.
* destructive action 전 backup recommendation과 confirmation이 표시됩니다.
* maintenance action 실패 시 rollback됩니다.
* maintenance 작업은 current draft를 자동 변경하지 않습니다.
* maintenance 작업은 자동 analyze, compile, review, execution을 실행하지 않습니다.
* 모든 IPC 입력값은 Zod로 검증됩니다.
* renderer는 DB, fs, path, process, ipcRenderer에 직접 접근하지 않습니다.
* Phase 11, 12, 13, 14, 15, 16 guardrail이 유지됩니다.
* TypeScript 타입 검사가 통과합니다.
* 앱이 개발 모드에서 정상 실행됩니다.
* 프롬프트 실행이나 실행 결과 저장 기능은 추가되지 않았습니다.

작업 전:

1. 현재 Phase 0부터 Phase 16까지의 코드 구조를 확인합니다.
2. 전체 DB schema를 확인합니다.
3. prompt_assets.current_version_id 처리 방식을 확인합니다.
4. tags와 prompt_tags repository를 확인합니다.
5. prompt_asset_lineage 또는 parent_prompt_id 구현 방식을 확인합니다.
6. prompt_templates와 harness_templates schema를 확인합니다.
7. project_context_profiles schema를 확인합니다.
8. prompt_quality_reviews가 있는지 확인합니다.
9. search index rebuild 함수가 있는지 확인합니다.
10. Settings 또는 Tools menu 구조를 확인합니다.
11. menu.onAction / MENU_ACTION_CHANNEL 패턴을 확인합니다.
12. destructive action 전에 backup recommendation을 표시할 UI 위치를 정합니다.
13. TDD 순서에 따라 maintenance schema와 duplicate detection 테스트를 먼저 작성합니다.
14. 간결한 구현 계획을 세운 뒤 Phase 17만 구현합니다.

작업 후:

1. 변경된 내용을 요약합니다.
2. 생성되거나 수정된 파일 목록을 제공합니다.
3. schema 또는 migration 변경이 있다면 설명합니다.
4. Maintenance scan이 read-only인 방식을 설명합니다.
5. duplicate prompt/tag 탐지 기준을 설명합니다.
6. destructive action confirmation과 backup recommendation 방식을 설명합니다.
7. tag merge, unused tag delete, current version repair의 transaction 처리 방식을 설명합니다.
8. broken reference cleanup 정책을 설명합니다.
9. search index health check와 rebuild 방식을 설명합니다.
10. maintenance 작업이 current draft를 자동 변경하지 않는 방식을 설명합니다.
11. Phase 11 quick capture, Phase 12 harness, Phase 13 project context, Phase 14 quality review, Phase 15 prompt template, Phase 16 backup guardrail을 유지한 방식을 설명합니다.
12. 추가한 테스트와 테스트 결과를 설명합니다.
13. 앱 실행 및 타입 검사 명령어를 제공합니다.
14. 수동 테스트 절차를 제공합니다.
15. 아직 구현하지 않은 기능을 명확히 구분해서 설명합니다.
