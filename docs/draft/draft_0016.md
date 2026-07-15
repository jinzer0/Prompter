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

Phase 14:

* Local heuristic Prompt Quality Reviewer
* 저장된 PromptVersion과 현재 draft compiledPrompt 품질 리뷰 가능
* API Key 없이 local review 동작
* LLM review는 사용자가 명시적으로 클릭한 경우에만 main process에서 실행
* 리뷰 결과는 자동으로 prompt를 수정하지 않음
* 리뷰 결과는 자동으로 quality_score를 업데이트하지 않음
* improvedPromptDraft는 자동 덮어쓰기 없이 새 PromptVersion으로 저장 가능
* prompt_quality_reviews 테이블을 추가한 경우에도 prompt_runs와 분리됨

Phase 15:

* PromptAsset 복제
* PromptVersion에서 derived draft 생성
* PromptAsset lineage 추적
* Prompt Template 생성, 목록, 상세, 수정, 복제, 삭제
* Prompt Template placeholder 변수 추출 및 preview
* Prompt Template 적용은 명시적 액션과 confirmation 필요
* Prompt Template 선택은 자동 LLM 호출, 자동 compile, 자동 저장을 실행하지 않음
* template content는 코드로 실행되지 않음

이 작업은 Phase 16: 백업 / 가져오기 / 라이브러리 내보내기입니다.

목표:
Prompter의 로컬 데이터를 안전하게 백업 파일로 내보내고, 백업 파일을 검증하고, 사용자의 명시적 확인 후 다시 가져올 수 있도록 합니다. 또한 전체 라이브러리뿐 아니라 프로젝트 단위, PromptAsset 단위, Prompt Template pack 단위의 선택적 내보내기를 지원합니다.

이 단계의 핵심:

* 전체 Prompter 라이브러리 백업
* 프로젝트 단위 백업
* 선택된 PromptAsset 단위 백업
* Prompt Template pack 내보내기
* 하네스 템플릿 pack 내보내기
* 백업 파일 검증
* import preview
* ID 충돌 처리
* transaction 기반 import
* secret/API Key 제외
* 실행 결과 저장 기능은 계속 없음

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
이번 단계는 백업, 검증, 가져오기, 선택적 라이브러리 내보내기에만 집중합니다.

Phase 11 / 12 / 13 / 14 / 15 guardrail:

* quick capture 동작을 변경하지 마세요.
* 클립보드 텍스트를 자동 정리하지 마세요.
* 하네스 템플릿 선택 로직을 변경하지 마세요.
* 프로젝트 컨텍스트 프로파일 선택 로직을 변경하지 마세요.
* 품질 리뷰어 동작을 자동화하지 마세요.
* Prompt Template 선택/적용 규칙을 변경하지 마세요.
* 백업 또는 import는 자동 LLM 호출을 실행하면 안 됩니다.
* 백업 또는 import는 프롬프트를 실행하면 안 됩니다.
* 백업 또는 import는 외부 repo나 파일 시스템을 스캔하면 안 됩니다.
* repo_path는 백업할 수 있지만 해당 경로를 읽거나 검증하지 않습니다.
* import 후 자동 analyze / compile / review / export를 실행하지 않습니다.
* import 후 사용자가 명시적으로 선택하기 전까지 자동으로 current draft를 덮어쓰지 않습니다.

백업 범위:

전체 백업에 포함할 수 있는 데이터:

* projects
* prompt_assets
* prompt_versions
* tags
* prompt_tags
* harness_templates
* project_context_profiles
* prompt_quality_reviews, 구현된 경우
* prompt_templates
* prompt_asset_lineage, 구현된 경우
* non-secret settings, 선택

전체 백업에서 반드시 제외할 데이터:

* OpenAI API Key
* secret store 파일
* safeStorage ciphertext
* OS keychain 관련 값
* DB 파일 경로
* userData 실제 경로
* clipboard content
* clipboard history, 애초에 없어야 함
* prompt_runs
* agent_runs
* execution_results
* validation_results
* run_logs
* 외부 repo 파일 내용
* repo_path가 가리키는 실제 파일 내용
* 로그 파일

주의:

* settings를 내보내는 경우에도 secret은 절대 포함하지 마세요.
* default_model, default_target_agent, default_scenario 같은 non-secret settings만 선택적으로 포함합니다.
* API Key 저장 여부 상태도 백업에 포함하지 않는 것을 권장합니다.

백업 파일 포맷:

JSON 기반 파일을 사용합니다.

권장 확장자:

* .prompter-backup.json
* .prompter-project.json
* .prompter-templates.json

BackupEnvelope 구조:

* schemaVersion: number
* appName: "Prompter"
* backupType: "full" | "project" | "prompt_assets" | "prompt_templates" | "harness_templates"
* exportedAt: number
* exportedByAppVersion?: string
* metadata: object
* data: object
* checksum?: string

schemaVersion:

* 첫 버전은 1로 시작합니다.
* future migration을 위해 반드시 포함합니다.

metadata 예:

* itemCounts
* projectNames
* promptAssetCount
* promptVersionCount
* includesSettings
* excludesSecrets: true

checksum:

* 선택 구현
* 구현한다면 백업 content의 안정적인 JSON 문자열 기준으로 SHA-256 hash를 계산합니다.
* checksum은 파일 변조 탐지용이지 보안 암호화가 아닙니다.
* checksum 구현이 범위를 키우면 생략해도 됩니다.

암호화:

* 이번 Phase에서는 백업 파일 암호화를 구현하지 마세요.
* 암호화는 별도 Phase로 미룹니다.
* 대신 export UI에 “이 백업 파일에는 프롬프트 내용이 평문으로 포함됩니다. 안전한 위치에 보관하세요.” 안내를 표시합니다.

인간은 백업 파일을 바탕화면에 `real-final-backup.json`으로 올려놓는 기묘한 생물이므로, 최소한 경고는 해줍니다.

이번 단계에서 구현할 주요 기능:

1. Full Library Backup 생성

전체 라이브러리 데이터를 JSON으로 내보낼 수 있어야 합니다.

동작:

* 사용자가 Settings 또는 File 메뉴에서 “전체 백업 내보내기” 선택
* main process가 DB에서 백업 대상 데이터를 읽음
* BackupEnvelope 생성
* save dialog를 열어 파일 저장
* 저장 성공/취소/실패 상태 표시

요구사항:

* 파일 저장은 Electron main process에서만 수행
* renderer는 fs, path, process에 직접 접근하지 않음
* renderer는 파일 경로를 직접 다루지 않음
* API Key와 secret은 포함하지 않음
* prompt_runs 관련 데이터는 포함하지 않음
* repo_path가 있어도 실제 파일 내용은 포함하지 않음

2. Project Backup 생성

선택된 Project 하나를 백업 파일로 내보낼 수 있어야 합니다.

포함 데이터:

* 해당 project
* 해당 project의 prompt_assets
* 해당 prompt_assets의 prompt_versions
* 관련 prompt_tags
* 관련 tags
* 해당 project의 project_context_profiles
* 해당 prompt_versions의 prompt_quality_reviews, 구현된 경우
* 해당 prompt_assets의 lineage 중 내부 관계
* source가 같은 project 안에 있는 prompt_templates, 선택

주의:

* 다른 project와 연결된 parent_prompt_id 또는 lineage가 있는 경우:

  * 외부 parent를 포함하지 않거나
  * reference placeholder metadata만 포함
* import 시 외부 parent가 없으면 lineage는 “missing external source”로 표시하거나 생략합니다.
* 앱이 crash되면 안 됩니다.

3. PromptAsset Backup 생성

선택한 PromptAsset 하나 또는 여러 개를 백업할 수 있어야 합니다.

포함 데이터:

* prompt_assets
* prompt_versions
* tags
* prompt_tags
* quality reviews, 구현된 경우
* lineage metadata, 가능한 경우

사용 사례:

* 좋은 프롬프트 묶음을 다른 Prompter 인스턴스로 옮기기
* 특정 프로젝트의 일부 프롬프트만 공유하기

주의:

* 공유 파일이므로 secret과 로컬 경로가 포함되지 않도록 합니다.
* project context profile은 기본적으로 포함하지 않아도 됩니다.
* 옵션으로 포함할 수는 있지만, MVP에서는 제외해도 됩니다.

4. Prompt Template Pack Export

Prompt Template을 pack으로 내보낼 수 있어야 합니다.

포함 데이터:

* prompt_templates
* template metadata
* source_prompt_asset_id / source_prompt_version_id는 optional reference로만 포함
* source prompt 내용은 기본적으로 포함하지 않음

요구사항:

* 사용자가 선택한 Prompt Template만 export 가능
* 전체 Prompt Template export 가능
* import 후 새 Prompt Template으로 추가 가능

주의:

* Prompt Template body는 평문으로 들어갑니다.
* API Key와 secret은 포함하지 않습니다.
* template body는 코드로 실행되지 않습니다.

5. Harness Template Pack Export

하네스 템플릿도 pack으로 내보낼 수 있어야 합니다.

포함 데이터:

* harness_templates
* required_fields
* clarification_policy
* template_body

요구사항:

* builtin harness template 포함 여부를 선택할 수 있으면 좋습니다.
* 사용자 생성 harness template만 export하는 옵션을 우선 구현해도 됩니다.

주의:

* 하네스 템플릿은 LLM 시스템 프롬프트 전체를 덮어쓰는 용도가 아닙니다.
* import 후에도 기존 Phase 12 규칙을 유지해야 합니다.
* template_body는 코드로 실행되지 않습니다.

6. Backup File Validation

백업 파일을 import하기 전에 검증해야 합니다.

동작:

* 사용자가 “백업 가져오기” 선택
* main process에서 open dialog를 열고 JSON 파일 읽기
* Zod schema로 BackupEnvelope 검증
* schemaVersion 확인
* backupType 확인
* 데이터 구조 확인
* itemCounts 계산
* conflicts 계산
* import preview 반환

검증 실패 시:

* “Prompter 백업 파일이 아니거나 손상되었습니다.”
* “지원하지 않는 schemaVersion입니다.”
* “필수 데이터가 누락되었습니다.”
* “JSON 파싱에 실패했습니다.”

주의:

* 검증 중 DB에 아무것도 쓰지 마세요.
* import preview는 read-only여야 합니다.

7. Import Preview

실제 import 전에 사용자가 내용을 확인할 수 있어야 합니다.

표시 항목:

* backupType
* exportedAt
* schemaVersion
* 포함된 project 수
* promptAsset 수
* promptVersion 수
* tag 수
* harnessTemplate 수
* projectContextProfile 수
* promptTemplate 수
* qualityReview 수
* 충돌 가능성
* secret 제외 여부
* warnings

Conflict 예:

* 같은 id가 이미 존재
* 같은 project name이 이미 존재
* 같은 tag name이 이미 존재
* 같은 prompt template name이 이미 존재
* parent lineage source가 현재 DB에 없음
* unsupported schemaVersion
* 일부 optional table이 현재 앱에 없음

Import Preview는 import 버튼을 누르기 전까지 DB를 변경하면 안 됩니다.

8. Import Strategy

사용자가 import 전략을 선택할 수 있어야 합니다.

MVP 전략:

* safe duplicate import

safe duplicate import 정책:

* 기존 데이터를 덮어쓰지 않음
* import되는 모든 entity에 새 id를 부여
* oldId → newId mapping 생성
* 관계는 newId 기준으로 다시 연결
* tag name이 이미 있으면 기존 tag를 재사용하거나 새 tag를 만들지 선택

권장 기본:

* Projects: 같은 이름이 있으면 “{name} Imported” 또는 “{name} 복사본”으로 생성
* PromptAssets: 새 id 생성
* PromptVersions: 새 id 생성
* Tags: 같은 name이 있으면 기존 tag 재사용
* HarnessTemplates: 같은 name이 있으면 “{name} Imported”로 생성
* PromptTemplates: 같은 name이 있으면 “{name} Imported”로 생성
* ProjectContextProfiles: 새 id 생성
* QualityReviews: 연결된 imported promptVersion에 새 id로 연결
* Lineage: import된 entity끼리만 재연결, 외부 parent는 warning 처리

추후 전략으로 미루기:

* overwrite existing
* merge by id
* merge by name
* selective row-level import

이번 Phase에서는 overwrite를 구현하지 마세요.
덮어쓰기는 데이터 손실을 부릅니다. 인간에게 “덮어쓸까요?”라고 물으면 언젠가 누릅니다. 그리고 울죠.

9. Transaction 기반 Import

import는 transaction으로 처리해야 합니다.

요구사항:

* import 중 오류 발생 시 전체 rollback
* partial import 방지
* import 완료 후 검색 인덱스 재생성 또는 필요한 FTS index 갱신
* import 완료 후 UI 목록 갱신
* import 완료 후 자동으로 imported project를 선택할 수 있음, 선택
* import 완료 후 자동 analyze/compile/review 실행 금지

주의:

* main process에서 transaction 처리
* renderer가 여러 CRUD를 순차 호출해서 import하지 않도록 합니다.
* import service 하나가 전체 import를 책임져야 합니다.

10. Backup / Import UI

Settings 또는 별도 Backup 화면에 UI를 추가합니다.

권장 위치:

* Settings 화면에 “Backup & Import” 섹션 추가
* File 메뉴에 “Export Library Backup…” 추가
* File 메뉴에 “Import Backup…” 추가

메뉴를 추가하는 경우:

* 기존 menu.onAction / MENU_ACTION_CHANNEL 패턴을 재사용
* window.prompter.appEvents.* 추가 금지
* window.prompter.shortcuts.* 추가 금지
* globalShortcut 추가 금지

UI 구성:

* 전체 백업 내보내기 버튼
* 현재 프로젝트 백업 내보내기 버튼, 프로젝트 선택 시
* 선택된 프롬프트 백업 내보내기 버튼, prompt 선택 시
* Prompt Template pack 내보내기
* Harness Template pack 내보내기
* 백업 파일 가져오기 버튼
* import preview dialog
* import strategy 설명
* import confirmation
* import result summary

상태:

* exporting
* export success
* export cancelled
* export failed
* validating import
* validation failed
* import preview ready
* importing
* import success
* import failed and rolled back

11. Non-secret Settings Export

전체 백업에서 settings를 포함할지 선택할 수 있습니다.

포함 가능한 settings:

* default_model
* default_target_agent
* default_scenario
* app_theme
* compiler_default_language
* default_project_id는 import 후 id mapping 문제 때문에 제외하거나 warning 처리

제외해야 하는 settings:

* API Key
* secret 관련 상태
* safeStorage 관련 값
* quick_capture 관련 settings, 없어야 함
* global shortcut settings, 없어야 함

MVP 정책:

* settings export는 기본 off
* 사용자가 체크하면 non-secret settings만 포함
* import 시 settings를 덮어쓰지 않고 preview에서 사용자가 선택해야 함
* 구현 부담이 크면 settings import는 제외하고 settings export도 제외해도 됩니다.

12. Search Index Handling

import 후 검색 기능이 정상 동작해야 합니다.

요구사항:

* import된 prompt_versions가 FTS 검색에 포함되어야 합니다.
* 가장 단순한 방식은 import 완료 후 rebuildSearchIndex() 호출
* 이미 Phase 7에서 rebuildSearchIndex가 있다면 재사용
* rebuild 실패 시 import 자체는 성공했지만 검색 인덱스 경고를 표시할 수 있음
* 가능하면 transaction 안에서 데이터 import를 완료한 뒤 index rebuild를 수행합니다.

13. Data Redaction / Sanitization

백업 파일에 포함되면 안 되는 데이터를 제거합니다.

반드시 제거:

* apiKey
* openaiKey
* secret
* token
* accessToken
* refreshToken
* safeStorage
* ciphertext
* auth
* userData path
* DB path
* log path

주의:

* 사용자가 프롬프트 본문에 직접 API Key를 적은 경우, 앱이 완벽히 감지할 수는 없습니다.
* 다만 export UI에서 “프롬프트 본문에 민감정보가 들어 있으면 백업에 포함됩니다” 경고를 표시합니다.
* 자동 redaction은 본문을 훼손할 수 있으므로 기본으로 하지 마세요.
* 선택 기능으로 simple secret pattern warning 정도는 가능하지만, 자동 삭제는 하지 않습니다.

14. Backup Schema Versioning

schemaVersion을 도입합니다.

요구사항:

* 현재 export schemaVersion = 1
* import 시 schemaVersion이 없으면 reject
* schemaVersion > currentSupportedVersion이면 reject
* schemaVersion < currentSupportedVersion이면 migration path가 없으면 reject
* error message는 명확해야 함

향후 확장:

* backup migration function을 둘 수 있음
* 이번 Phase에서는 schemaVersion 1만 지원

15. IPC API 요구사항

preload bridge에 다음 API를 추가합니다.

권장 API:

* window.prompter.backup.exportFullBackup(input)
* window.prompter.backup.exportProjectBackup(input)
* window.prompter.backup.exportPromptAssetsBackup(input)
* window.prompter.backup.exportPromptTemplatesPack(input)
* window.prompter.backup.exportHarnessTemplatesPack(input)
* window.prompter.backup.validateBackupFile()
* window.prompter.backup.importBackup(input)

주의:

* validateBackupFile은 main process에서 open dialog를 열고 파일을 읽은 뒤 preview를 반환합니다.
* renderer에 파일 경로를 직접 노출하지 않는 것을 권장합니다.
* importBackup은 validateBackupFile 결과에서 받은 temporary import session id를 사용해도 됩니다.
* 더 단순한 구현은 validateBackupFile이 parsed payload를 main memory에 보관하고 importBackup이 이를 사용합니다.
* 앱 재시작 시 import session은 사라져도 됩니다.

input 예시:

ExportFullBackupInput:

* includeSettings?: boolean
* includeQualityReviews?: boolean
* includePromptTemplates?: boolean
* includeHarnessTemplates?: boolean
* includeProjectContextProfiles?: boolean

ExportProjectBackupInput:

* projectId: string
* includeQualityReviews?: boolean
* includeProjectContextProfiles?: boolean

ExportPromptAssetsBackupInput:

* promptAssetIds: string[]
* includeQualityReviews?: boolean
* includeTags?: boolean

ExportPromptTemplatesPackInput:

* promptTemplateIds?: string[]
* includeAll?: boolean

ExportHarnessTemplatesPackInput:

* harnessTemplateIds?: string[]
* includeAllUserTemplates?: boolean
* includeBuiltin?: boolean

ImportBackupInput:

* importSessionId: string
* strategy: "safe_duplicate"
* options:

  * reuseExistingTagsByName?: boolean
  * importQualityReviews?: boolean
  * importPromptTemplates?: boolean
  * importHarnessTemplates?: boolean
  * importProjectContextProfiles?: boolean

금지:

* promptRuns 관련 API 추가 금지
* executionResults 관련 API 추가 금지
* Codex 실행 API 추가 금지
* shortcuts/appEvents/globalShortcut API 추가 금지

16. Zod schema 요구사항

다음 schema를 정의합니다.

Backup:

* BackupEnvelopeSchema
* BackupTypeSchema
* BackupMetadataSchema
* BackupDataSchema
* BackupItemCountsSchema
* BackupValidationPreviewSchema
* BackupConflictSchema
* BackupWarningSchema
* BackupImportStrategySchema
* BackupImportResultSchema

Export input:

* ExportFullBackupInputSchema
* ExportProjectBackupInputSchema
* ExportPromptAssetsBackupInputSchema
* ExportPromptTemplatesPackInputSchema
* ExportHarnessTemplatesPackInputSchema

Import input:

* ValidateBackupFileResultSchema
* ImportBackupInputSchema
* ImportBackupOptionsSchema

Entity backup schemas:

* ProjectBackupSchema
* PromptAssetBackupSchema
* PromptVersionBackupSchema
* TagBackupSchema
* PromptTagBackupSchema
* HarnessTemplateBackupSchema
* ProjectContextProfileBackupSchema
* PromptQualityReviewBackupSchema
* PromptTemplateBackupSchema
* PromptAssetLineageBackupSchema

검증 규칙:

* schemaVersion은 number
* appName은 "Prompter"
* backupType은 허용 enum
* exportedAt은 number
* IDs는 string
* optional table은 없을 수 있음
* prompt_runs, execution_results 등 금지 데이터 키가 있으면 warning 또는 reject
* API Key로 보이는 top-level key가 있으면 reject
* backup file size가 너무 크면 경고

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

* src/renderer/components/backup/BackupSettingsPanel.tsx
* src/renderer/components/backup/BackupExportActions.tsx
* src/renderer/components/backup/ImportBackupDialog.tsx
* src/renderer/components/backup/ImportPreview.tsx
* src/renderer/components/backup/ImportResultSummary.tsx
* src/renderer/hooks/useBackup.ts

Shared:

* src/shared/backup/backupTypes.ts
* src/shared/backup/backupSchemas.ts
* src/shared/backup/backupVersion.ts
* src/shared/backup/backupRedaction.ts
* src/shared/backup/backupValidation.ts

Main:

* src/main/services/backup/BackupExportService.ts
* src/main/services/backup/BackupImportService.ts
* src/main/services/backup/BackupValidationService.ts
* src/main/ipc/backup.ts

Repository integration:

* existing project repository
* existing prompt repository
* existing tag repository
* existing harness template repository
* existing project context repository
* existing prompt quality repository
* existing prompt template repository
* existing search index service

18. Menu Integration

File 메뉴에 다음 항목을 추가할 수 있습니다.

* Export Full Backup…
* Import Backup…

요구사항:

* 기존 menu.onAction / MENU_ACTION_CHANNEL 패턴 재사용
* 새 appEvents bridge 만들지 않음
* shortcuts bridge 만들지 않음
* OS globalShortcut 만들지 않음
* 메뉴 action은 renderer에 “backup UI 열기” 정도의 신호만 전달
* 실제 파일 읽기/쓰기는 backup IPC를 통해 main process에서 처리

19. Stale State 규칙

import 후 다음 상태를 갱신해야 합니다.

갱신 대상:

* project list
* prompt library list
* tag list
* harness template list
* project context profile list
* prompt template list
* search index
* selected project/prompt 상태, 필요한 경우

주의:

* import가 current draft를 자동 덮어쓰지 않게 합니다.
* import가 PromptCompilerPanel의 originalInput을 변경하지 않게 합니다.
* import가 자동 analyze / compile / review를 실행하지 않게 합니다.
* import 완료 후 “가져온 프로젝트 보기” 버튼을 제공할 수 있습니다.

20. 보안 요구사항

* renderer에서 fs, path, process에 직접 접근하지 않습니다.
* renderer에서 ipcRenderer를 직접 사용하지 않습니다.
* 파일 읽기와 쓰기는 main process에서만 수행합니다.
* 백업 파일에 API Key를 포함하지 않습니다.
* secret store를 백업하지 않습니다.
* safeStorage ciphertext를 백업하지 않습니다.
* 백업 파일에 DB 경로, userData 경로, log path를 포함하지 않습니다.
* 프롬프트 본문 전체를 로그로 남기지 않습니다.
* import 파일 내용을 console.log하지 않습니다.
* 백업 파일은 평문 JSON임을 사용자에게 안내합니다.
* import 중 template_body, prompt content, project context text를 코드로 실행하지 않습니다.
* repo_path는 import/export할 수 있지만 파일 시스템 접근에 사용하지 않습니다.
* prompt execution 또는 외부 프로세스 실행 기능을 추가하지 않습니다.
* 실행 결과 저장 관련 테이블과 API를 추가하지 않습니다.

21. TDD 구현 순서

가능하면 다음 순서로 구현하세요.

1. backup schema 테스트 작성

* valid full backup envelope
* invalid appName
* missing schemaVersion
* unsupported schemaVersion
* invalid backupType
* forbidden prompt_runs key 감지
* forbidden secret key 감지

2. backup redaction 테스트 작성

* API Key top-level field 제거 또는 reject
* secret 관련 key 감지
* settings에서 secret 제외
* repo_path는 유지하되 파일 내용은 없음

3. backup export service 테스트 작성, 가능하면

* full backup item counts
* project backup includes only selected project data
* prompt asset backup includes versions and tags
* prompt template pack export
* harness template pack export
* excludes API Key
* excludes prompt_runs

4. backup validation service 테스트 작성

* valid backup preview 생성
* conflicts 계산
* warnings 계산
* no DB writes during validation

5. backup import service 테스트 작성, 가능하면

* safe duplicate import
* oldId → newId mapping
* tag reuse by name
* transaction rollback on error
* imported prompt versions searchable after rebuild
* lineage remapping
* no overwrite

6. renderer behavior 테스트, 가능하면

* export button loading/success/cancelled
* import preview 표시
* import confirmation 필요
* import result summary 표시
* cancel does not mutate DB

22. 파일별 예상 변경

예상 변경 파일:

* shared backup schema/type 파일 추가
* backup redaction utility 추가
* backup validation utility 추가
* BackupExportService 추가
* BackupImportService 추가
* BackupValidationService 추가
* backup IPC handler 추가
* preload bridge 타입 추가
* Settings에 BackupSettingsPanel 추가
* File menu action 추가
* ImportBackupDialog 추가
* ImportPreview 추가
* ImportResultSummary 추가
* search index rebuild 호출 연결
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
* 백업 암호화 추가 금지, 별도 Phase로 미룸

23. 의존성 그래프

권장 의존성 방향:

shared/backup schemas
→ shared/backup validation/redaction utilities
→ main backup export/import services
→ existing repositories
→ main backup IPC
→ preload typed bridge
→ renderer backup hooks
→ renderer backup UI
→ menu action integration

금지 방향:

* renderer → fs/path/process 직접 접근
* renderer → DB 직접 접근
* renderer → Electron ipcRenderer 직접 접근
* backup import → prompt execution
* backup export → secret store
* backup import → external repo scanner
* repo_path → automatic filesystem read
* import → automatic LLM call

24. 자동 테스트 목록

가능한 경우 다음 테스트를 추가하세요.

Schema:

* BackupEnvelopeSchema accepts valid full backup
* rejects missing schemaVersion
* rejects unsupported schemaVersion
* rejects invalid backupType
* detects forbidden prompt_runs key
* detects suspicious secret keys

Export:

* full backup includes projects/prompts/tags/templates
* full backup excludes API Key
* full backup excludes secret store
* project backup includes only one project
* prompt asset backup includes selected prompt versions
* prompt template pack includes selected templates
* harness template pack includes selected harness templates
* backup metadata itemCounts are correct

Validation:

* validate backup returns preview
* validate backup does not write DB
* detects ID conflicts
* detects name conflicts
* detects missing external lineage source
* detects unsupported schema

Import:

* safe duplicate creates new ids
* preserves relationships using id map
* reuses tags by name when option enabled
* renames conflicting project names
* imports prompt templates
* imports harness templates
* imports project context profiles
* imports quality reviews only when option enabled
* rolls back transaction on failure
* rebuilds or updates search index
* does not create prompt_runs or execution_results

UI behavior:

* export cancel shows cancelled state
* import preview required before import
* import confirmation required
* import success updates lists
* current draft is not overwritten
* no automatic analyze/compile/review after import

25. 수동 QA 체크리스트

| 항목                    | 기대 결과                        |
| --------------------- | ---------------------------- |
| 전체 백업 내보내기            | .prompter-backup.json 저장     |
| 백업 파일 열기              | API Key 없음                   |
| 백업 파일 열기              | secret store 없음              |
| 백업 파일 열기              | prompt_runs 없음               |
| 프로젝트 백업               | 선택 프로젝트 데이터만 포함              |
| PromptAsset 백업        | 선택 프롬프트와 버전 포함               |
| Prompt Template pack  | 선택 템플릿 포함                    |
| Harness Template pack | 선택 하네스 포함                    |
| 잘못된 JSON import       | validation error 표시          |
| 지원하지 않는 schemaVersion | import 거부                    |
| import preview        | item counts와 warnings 표시     |
| import 취소             | DB 변경 없음                     |
| safe duplicate import | 기존 데이터 덮어쓰기 없음               |
| tag reuse 옵션          | 같은 이름 tag 재사용                |
| import 완료             | project/prompt 목록 갱신         |
| import 완료             | 검색으로 imported prompt 검색 가능   |
| import 완료             | current draft 변경 없음          |
| import 완료             | 자동 analyze/compile/review 없음 |
| 백업 파일에 repo_path 있음   | 파일 시스템 접근 없음                 |
| 앱 재시작                 | imported data 유지             |
| prompt_runs 확인        | 실행 결과 관련 데이터 생성 없음           |

26. Attribution

이 Phase 16 명세는 Phase 11, Phase 12, Phase 13, Phase 14, Phase 15의 최종 guardrail을 반영합니다.

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

Phase 16에서 이 결정을 깨뜨리지 마세요.

27. 이번 단계에서 구현하지 말 것

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
* 백그라운드 백업
* 원격 백업 업로드
* 백업 암호화
* 백업 파일 자동 동기화
* import 후 자동 LLM 호출
* import 후 자동 prompt 실행
* import overwrite 전략

완료 기준:

* 전체 라이브러리 백업을 JSON 파일로 내보낼 수 있습니다.
* 프로젝트 단위 백업을 JSON 파일로 내보낼 수 있습니다.
* 선택된 PromptAsset 백업을 JSON 파일로 내보낼 수 있습니다.
* Prompt Template pack을 내보낼 수 있습니다.
* Harness Template pack을 내보낼 수 있습니다.
* 백업 파일에는 API Key, secret store, safeStorage 값, DB 경로, prompt_runs가 포함되지 않습니다.
* 백업 파일은 schemaVersion과 backupType을 포함합니다.
* 백업 파일을 import 전에 검증할 수 있습니다.
* import preview가 item counts, conflicts, warnings를 표시합니다.
* import는 safe duplicate strategy로만 수행됩니다.
* import는 기존 데이터를 덮어쓰지 않습니다.
* import는 transaction 기반으로 처리되고 실패 시 rollback됩니다.
* import 후 관계가 oldId → newId mapping으로 올바르게 복원됩니다.
* import 후 검색 인덱스가 갱신됩니다.
* import 후 current draft는 자동 변경되지 않습니다.
* import 후 자동 analyze, compile, review, execution이 실행되지 않습니다.
* 모든 IPC 입력값은 Zod로 검증됩니다.
* renderer는 DB, fs, path, process, ipcRenderer에 직접 접근하지 않습니다.
* Phase 11, 12, 13, 14, 15 guardrail이 유지됩니다.
* TypeScript 타입 검사가 통과합니다.
* 앱이 개발 모드에서 정상 실행됩니다.
* 프롬프트 실행이나 실행 결과 저장 기능은 추가되지 않았습니다.

작업 전:

1. 현재 Phase 0부터 Phase 15까지의 코드 구조를 확인합니다.
2. DB schema 전체를 확인합니다.
3. prompt_templates와 lineage 구현 방식을 확인합니다.
4. prompt_quality_reviews 테이블이 있는지 확인합니다.
5. search index rebuild 함수가 있는지 확인합니다.
6. Settings UI와 File menu action 구조를 확인합니다.
7. 기존 menu.onAction / MENU_ACTION_CHANNEL 패턴을 확인합니다.
8. preload bridge 타입 선언 방식을 확인합니다.
9. 백업 대상 entity와 제외 대상 entity를 명확히 정리합니다.
10. import strategy는 safe_duplicate만 구현하도록 계획합니다.
11. TDD 순서에 따라 backup schema와 validation 테스트를 먼저 작성합니다.
12. 간결한 구현 계획을 세운 뒤 Phase 16만 구현합니다.

작업 후:

1. 변경된 내용을 요약합니다.
2. 생성되거나 수정된 파일 목록을 제공합니다.
3. schema 또는 migration 변경이 있다면 설명합니다.
4. 백업 파일 포맷과 schemaVersion을 설명합니다.
5. export 범위와 제외 데이터를 설명합니다.
6. API Key와 secret이 백업에 포함되지 않는 방식을 설명합니다.
7. import validation과 preview 흐름을 설명합니다.
8. safe duplicate import 전략과 ID mapping 방식을 설명합니다.
9. transaction rollback 방식을 설명합니다.
10. search index 갱신 방식을 설명합니다.
11. renderer가 파일 시스템에 직접 접근하지 않는 방식을 설명합니다.
12. Phase 11 quick capture, Phase 12 harness, Phase 13 project context, Phase 14 quality review, Phase 15 prompt template guardrail을 유지한 방식을 설명합니다.
13. 추가한 테스트와 테스트 결과를 설명합니다.
14. 앱 실행 및 타입 검사 명령어를 제공합니다.
15. 수동 테스트 절차를 제공합니다.
16. 아직 구현하지 않은 기능을 명확히 구분해서 설명합니다.
