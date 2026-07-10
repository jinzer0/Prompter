

# Plan Archive

> **READ-ONLY FILE — DO NOT MODIFY**
> 
> This file is the authoritative project plan and must be treated as strictly read-only.
> 
> - Do not edit, overwrite, delete, rename, move, truncate, or regenerate this file.
> 
> - Do not automatically update task statuses, checkboxes, dates, or content.
> 
> - You may read and reference this file when performing tasks.
> 
> - Any proposed changes must be presented separately and must not be applied unless the user explicitly instructs you to modify `plan.md`.
> 
> Under no circumstances should this file be changed as part of an automated refactoring, cleanup, formatting, or documentation update.

# Phase 0

```
당신은 Prompter라는 새로운 Electron 데스크톱 앱을 개발하고 있습니다.

Prompter는 로컬 우선(local-first) 프롬프트 컴파일러이자 프롬프트 라이브러리입니다. 이 앱의 목적은 모호한 인간의 요청을 에이전트가 실행 가능한 프롬프트로 변환하고, 이를 버전 관리되는 프롬프트 자산으로 저장하며, Codex, Claude Code, Cursor 및 일반 LLM 에이전트와 같은 코딩 에이전트에 사용할 수 있도록 내보내는 것입니다.

이 작업은 Phase 0: 초기 프로젝트 설정입니다.

목표:
Electron, React, TypeScript, Vite를 사용하여 초기 Electron 앱의 기반을 구축합니다.

중요:
아직 제품 기능을 구현하지 마세요.
아직 데이터베이스 로직을 추가하지 마세요.
아직 OpenAI 또는 LLM 통합을 추가하지 마세요.
아직 프롬프트 컴파일 로직을 추가하지 마세요.
아직 Codex 통합을 추가하지 마세요.
이 단계는 깨끗하고, 안전하며, 유지보수 가능한 데스크톱 앱 기반을 설정하는 데만 집중합니다.

기술 스택:

* Electron
* React
* TypeScript
* Vite
* 기존 프로젝트 설정에 따라 npm 또는 pnpm

아키텍처 요구사항:

* Electron의 main, preload, renderer 코드를 명확하게 분리합니다.
* Electron main 프로세스는 앱 생명주기와 윈도우 생성을 담당해야 합니다.
* preload 스크립트는 renderer에 최소한의 타입이 정의된 브리지를 제공해야 합니다.
* renderer는 React + TypeScript 앱이어야 합니다.
* renderer는 Node.js API에 직접 접근해서는 안 됩니다.
* 안전한 Electron 기본 설정을 사용합니다:

  * nodeIntegration: false
  * contextIsolation: true
  * sandbox: 선택한 설정과 호환되는 경우 true
* preload 브리지를 통해 기본적인 IPC ping/pong 테스트를 추가하여 renderer가 main 프로세스와의 통신을 확인할 수 있도록 합니다.

예상 프로젝트 구조:

* src/main
* src/preload
* src/renderer
* src/shared 또는 src/common (공통 타입이 필요한 경우)

구현 요구사항:

1. Electron + React + TypeScript + Vite 프로젝트 구조를 초기화하거나 정리합니다.
2. Electron main 프로세스 엔트리를 생성합니다.
3. preload 스크립트를 생성합니다.
4. React renderer 엔트리를 생성합니다.
5. 기본 앱 윈도우를 생성합니다.
6. 다음을 표시하는 최소한의 홈 화면을 추가합니다:

   * 앱 이름: Prompter
   * 부제: Local-first prompt compiler
   * ping/pong 브리지를 통한 IPC 상태
7. TypeScript가 window.prompter 또는 이에 준하는 안전한 글로벌 브리지를 인식할 수 있도록 타입이 정의된 preload API를 추가합니다.
8. 기본 스크립트를 추가합니다:

   * dev
   * build
   * typecheck
   * lint (이미 설정되어 있거나 복잡도를 크게 증가시키지 않고 추가 가능한 경우)
9. 앱이 개발 모드에서 실행될 수 있도록 합니다.
10. TypeScript 타입 검사가 통과하도록 합니다.

보안 요구사항:

* renderer에서 nodeIntegration을 활성화하지 마세요.
* ipcRenderer를 renderer에 직접 노출하지 마세요.
* 파일 시스템, 셸, 프로세스, 데이터베이스 등에 대한 광범위한 접근을 노출하지 마세요.
* 현재는 preload를 통해 최소한의 테스트 API만 노출하세요.

완료 기준:

* 앱이 개발 모드에서 정상적으로 실행됩니다.
* 데스크톱 창이 열립니다.
* renderer에 Prompter 초기 화면이 표시됩니다.
* renderer가 타입이 정의된 preload 브리지를 호출하여 IPC ping 응답을 정상적으로 표시할 수 있습니다.
* TypeScript 타입 검사가 통과합니다.
* 코드베이스에서 main, preload, renderer가 명확히 분리되어 있습니다.
* 아직 제품 기능은 구현되지 않았습니다.

작업 전:

1. 기존 저장소 구조를 확인합니다.
2. 빈 저장소인지, 기존 Electron 설정이 있는지 파악합니다.
3. 간결한 구현 계획을 세웁니다.
4. Phase 0만 구현합니다.

작업 후:

1. 변경된 내용을 요약합니다.
2. 생성되거나 수정된 파일 목록을 제공합니다.
3. 앱 실행 및 타입 검사 명령어를 제공합니다.
4. 가정한 사항이나 설정 결정 사항을 설명합니다.

```



# Phase 1

```textile
당신은 Prompter라는 Electron 데스크톱 앱을 개발하고 있습니다.

Prompter는 로컬 우선(local-first) 프롬프트 컴파일러이자 프롬프트 라이브러리입니다. 이 앱의 목적은 모호한 인간의 요청을 에이전트가 실행 가능한 프롬프트로 변환하고, 이를 버전 관리되는 프롬프트 자산으로 저장하며, Codex, Claude Code, Cursor 및 일반 LLM 에이전트에 사용할 수 있도록 내보내는 것입니다.

현재 Phase 0에서는 Electron, React, TypeScript, Vite 기반 앱 골격과 main, preload, renderer 분리, 기본 IPC ping/pong 브리지가 준비되어 있다고 가정합니다.

이 작업은 Phase 1: 기본 레이아웃 / 디자인 시스템입니다.

목표:
Prompter 앱의 기본 UI 뼈대를 구현합니다. 아직 실제 데이터베이스, LLM 호출, 프롬프트 저장 기능은 구현하지 않습니다. 이번 단계에서는 사용자가 앱의 전체 구조를 이해할 수 있는 3단 레이아웃과 기본 UI 컴포넌트만 만듭니다.

중요:
아직 데이터베이스를 연결하지 마세요.
아직 OpenAI 또는 LLM 통합을 추가하지 마세요.
아직 프롬프트 컴파일 로직을 추가하지 마세요.
아직 Codex 통합을 추가하지 마세요.
아직 실제 저장, 검색, 버전 관리 기능을 구현하지 마세요.
이번 단계는 UI 구조와 디자인 시스템 기반만 구현합니다.

기술 스택:

* Electron
* React
* TypeScript
* Vite
* Tailwind CSS
* shadcn/ui 스타일의 로컬 UI 컴포넌트 또는 Radix UI 기반 컴포넌트
* lucide-react 또는 이에 준하는 아이콘 라이브러리

아키텍처 요구사항:

* 기존 Phase 0의 main, preload, renderer 분리 구조를 유지합니다.
* renderer는 여전히 Node.js API에 직접 접근하면 안 됩니다.
* 이번 단계의 UI는 renderer 안에서만 구현합니다.
* main/preload 쪽 코드는 꼭 필요한 경우가 아니면 변경하지 않습니다.
* 기존 IPC ping/pong 테스트는 유지합니다.

레이아웃 요구사항:
앱은 기본적으로 3단 패널 구조를 가져야 합니다.

1. 왼쪽 사이드바

   * 앱 이름: Prompter
   * 프로젝트 섹션
   * 태그 섹션
   * 하네스 템플릿 섹션
   * 설정 진입 버튼 또는 아이콘
   * 현재는 mock 데이터 또는 placeholder를 사용합니다.

2. 중앙 패널

   * 프롬프트 라이브러리 영역
   * 상단 검색 입력창 placeholder
   * “새 프롬프트” 버튼
   * 프롬프트 카드 목록 placeholder
   * 빈 상태(empty state) 표시

3. 오른쪽 패널

   * 프롬프트 컴파일러 영역
   * 원본 요청 입력 영역 placeholder
   * 시나리오 선택 UI placeholder
   * 대상 에이전트 선택 UI placeholder
   * “프롬프트 컴파일” 버튼
   * 생성 결과 preview 영역 placeholder

UI 컴포넌트 요구사항:
다음 기본 컴포넌트를 재사용 가능한 형태로 구성합니다.

* Button
* Input
* Textarea
* Card
* Badge
* Select 또는 간단한 커스텀 선택 UI
* Tabs 또는 Section header
* EmptyState
* SidebarItem
* Panel 또는 Layout 컴포넌트

스타일 요구사항:

* Tailwind CSS를 설정합니다.
* 전체 앱은 데스크톱 생산성 도구처럼 보여야 합니다.
* 너무 화려한 애니메이션이나 과한 장식은 넣지 않습니다.
* 기본적으로 다크 모드에 잘 어울리는 색감을 사용하되, 하드코딩을 과하게 하지 않습니다.
* 간격, 테두리, 배경, hover 상태가 일관되어야 합니다.
* UI는 “대충 만든 폼 모음”처럼 보이면 안 됩니다. 인간은 이미 그런 화면을 충분히 많이 봤습니다.

상태 관리:

* 이번 단계에서는 실제 전역 상태 라이브러리를 도입하지 않아도 됩니다.
* 필요한 경우 React local state만 사용합니다.
* Zustand 등은 나중 단계에서 필요할 때 도입해도 됩니다.
* mock 데이터는 컴포넌트 내부 또는 별도 mock 파일에 둡니다.

구현 요구사항:

1. Tailwind CSS를 설정합니다.
2. renderer의 기본 화면을 Prompter 앱 레이아웃으로 교체합니다.
3. 3단 패널 레이아웃을 구현합니다.
4. 왼쪽 사이드바에 프로젝트, 태그, 하네스 템플릿 placeholder를 표시합니다.
5. 중앙 패널에 프롬프트 라이브러리 placeholder를 표시합니다.
6. 오른쪽 패널에 프롬프트 컴파일러 placeholder를 표시합니다.
7. 기본 UI 컴포넌트를 재사용 가능한 파일로 분리합니다.
8. 기존 IPC ping/pong 상태는 화면 어딘가에 작게 표시해 Phase 0 기능이 유지되는지 확인할 수 있게 합니다.
9. TypeScript 타입 검사가 통과하도록 합니다.
10. 앱이 개발 모드에서 정상 실행되도록 합니다.

권장 파일 구조:

* src/renderer/App.tsx
* src/renderer/components/ui/Button.tsx
* src/renderer/components/ui/Input.tsx
* src/renderer/components/ui/Textarea.tsx
* src/renderer/components/ui/Card.tsx
* src/renderer/components/ui/Badge.tsx
* src/renderer/components/layout/AppShell.tsx
* src/renderer/components/layout/Sidebar.tsx
* src/renderer/components/prompt/PromptLibraryPanel.tsx
* src/renderer/components/prompt/PromptCompilerPanel.tsx
* src/renderer/components/common/EmptyState.tsx
* src/renderer/styles 또는 기존 CSS 엔트리

정확한 파일 구조는 기존 프로젝트 구조에 맞춰 조정해도 됩니다. 단, 컴포넌트 역할은 명확히 분리하세요.

완료 기준:

* 앱이 개발 모드에서 정상적으로 실행됩니다.
* 3단 레이아웃이 화면에 표시됩니다.
* 왼쪽 사이드바, 중앙 프롬프트 라이브러리, 오른쪽 프롬프트 컴파일러 영역이 구분됩니다.
* 기본 UI 컴포넌트가 재사용 가능한 구조로 분리되어 있습니다.
* Tailwind CSS가 정상 동작합니다.
* 기존 IPC ping/pong 상태가 여전히 표시됩니다.
* TypeScript 타입 검사가 통과합니다.
* 데이터베이스, LLM, 저장 기능은 아직 구현되지 않았습니다.

작업 전:

1. 기존 Phase 0 코드 구조를 확인합니다.
2. renderer 엔트리와 App 컴포넌트 구조를 파악합니다.
3. Tailwind CSS 설정 여부를 확인합니다.
4. 필요한 변경 파일을 정리합니다.
5. 간결한 구현 계획을 세운 뒤 Phase 1만 구현합니다.

작업 후:

1. 변경된 내용을 요약합니다.
2. 생성되거나 수정된 파일 목록을 제공합니다.
3. 앱 실행 및 타입 검사 명령어를 제공합니다.
4. UI 구조상 가정한 사항을 설명합니다.
5. 아직 구현하지 않은 기능을 명확히 구분해서 설명합니다.

```



# Phase 2

```
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

  * 왼쪽 사이드바
  * 중앙 프롬프트 라이브러리
  * 오른쪽 프롬프트 컴파일러
* 재사용 가능한 기본 UI 컴포넌트
* 아직 실제 데이터 저장 기능은 없음

이 작업은 Phase 2: 로컬 DB 스키마 / CRUD입니다.

목표:
SQLite + Drizzle ORM + better-sqlite3를 사용하여 Prompter의 로컬 데이터 저장 기반을 구현합니다. 데이터베이스 접근은 Electron main process에서만 수행하고, renderer는 typed IPC를 통해서만 데이터를 요청하거나 변경해야 합니다.

중요:
아직 OpenAI 또는 LLM 통합을 추가하지 마세요.
아직 프롬프트 컴파일 로직을 추가하지 마세요.
아직 Codex 통합을 추가하지 마세요.
아직 프롬프트 실행 기능을 추가하지 마세요.
아직 프롬프트 실행 결과 저장 기능을 추가하지 마세요.
prompt_runs, run history, validation result persistence, agent execution logs 테이블을 만들지 마세요.
이번 단계는 로컬 DB 스키마, 마이그레이션, 기본 CRUD, IPC 연결만 구현합니다.

기술 스택:

* SQLite
* Drizzle ORM
* better-sqlite3
* Zod
* Electron IPC

아키텍처 요구사항:

* SQLite 데이터베이스는 Electron main process에서만 초기화하고 접근합니다.
* renderer는 데이터베이스에 직접 접근하면 안 됩니다.
* renderer는 preload bridge를 통해 노출된 안전한 API만 사용해야 합니다.
* ipcRenderer를 renderer에 직접 노출하지 마세요.
* 모든 IPC 입력값은 Zod로 검증합니다.
* DB repository/service 계층을 분리하여 UI와 저장소 로직이 섞이지 않게 합니다.
* 앱 데이터베이스 파일은 Electron app userData 경로 아래에 저장합니다.
* 개발 환경과 프로덕션 환경 모두에서 DB 경로가 안정적으로 동작해야 합니다.

이번 단계에서 만들 테이블:

* projects
* prompt_assets
* prompt_versions
* tags
* prompt_tags
* harness_templates
* settings

절대 만들지 말아야 할 테이블:

* prompt_runs
* agent_runs
* execution_results
* validation_results
* run_logs

권장 스키마:

1. projects

필드:

* id: text, primary key
* name: text, required
* description: text, nullable
* tech_stack: text, nullable
* default_agent: text, nullable
* created_at: integer, required
* updated_at: integer, required

설명:
프로젝트 단위로 프롬프트를 묶기 위한 테이블입니다.

2. prompt_assets

필드:

* id: text, primary key
* project_id: text, nullable, references projects.id
* title: text, required
* scenario: text, required
* target_agent: text, required
* current_version_id: text, nullable
* parent_prompt_id: text, nullable, references prompt_assets.id
* created_at: integer, required
* updated_at: integer, required

설명:
프롬프트의 논리적 자산 단위입니다. 실제 프롬프트 내용은 prompt_versions에 저장합니다.
current_version_id는 최신 또는 사용자가 현재로 지정한 버전을 가리킵니다.
Drizzle에서 순환 참조가 복잡해질 경우 current_version_id의 foreign key는 생략하고 service 계층에서 유효성을 보장해도 됩니다.

3. prompt_versions

필드:

* id: text, primary key
* prompt_asset_id: text, required, references prompt_assets.id
* version_number: integer, required
* original_input: text, required
* compiled_prompt: text, required
* assumptions: text, nullable
* questions: text, nullable
* answers: text, nullable
* acceptance_criteria: text, nullable
* validation_commands: text, nullable
* quality_score: integer, nullable
* created_at: integer, required

설명:
프롬프트 자산의 개별 버전을 저장합니다.
assumptions, questions, answers, acceptance_criteria, validation_commands는 JSON 문자열로 저장해도 됩니다.
이번 단계에서는 LLM이 없으므로 값이 비어 있어도 됩니다.

4. tags

필드:

* id: text, primary key
* name: text, required, unique
* created_at: integer, required

설명:
프롬프트 분류용 태그입니다.
태그 이름은 중복되지 않아야 합니다.

5. prompt_tags

필드:

* prompt_asset_id: text, required, references prompt_assets.id
* tag_id: text, required, references tags.id

제약:

* prompt_asset_id + tag_id 복합 primary key 또는 unique constraint

설명:
프롬프트와 태그의 many-to-many 연결 테이블입니다.

6. harness_templates

필드:

* id: text, primary key
* name: text, required
* scenario: text, required
* target_agent: text, required
* template_body: text, required
* required_fields: text, nullable
* clarification_policy: text, nullable
* created_at: integer, required
* updated_at: integer, required

설명:
나중에 프롬프트 컴파일러가 사용할 시나리오별 템플릿입니다.
이번 단계에서는 기본 CRUD만 준비하면 됩니다.

7. settings

필드:

* key: text, primary key
* value: text, required
* updated_at: integer, required

설명:
비밀값이 아닌 일반 설정을 저장합니다.
API key 같은 secret은 이 테이블에 저장하지 마세요. API key 저장은 나중 Phase에서 Electron safeStorage 또는 OS-backed secure storage를 사용합니다.

ID 및 시간 처리:

* id는 crypto.randomUUID 또는 이에 준하는 안전한 text ID를 사용합니다.
* created_at, updated_at은 Unix timestamp milliseconds를 integer로 저장합니다.
* repository/service 계층에서 생성 및 수정 시간을 일관되게 처리합니다.

마이그레이션 요구사항:

* Drizzle schema를 정의합니다.
* drizzle-kit 또는 기존 프로젝트에 맞는 migration 방식을 설정합니다.
* 앱 시작 시 필요한 마이그레이션이 적용되도록 합니다.
* 개발 환경에서 DB를 쉽게 초기화하거나 마이그레이션할 수 있는 스크립트를 추가합니다.
* 마이그레이션 실패 시 앱이 조용히 실패하지 않고 명확한 에러를 표시하거나 로그를 남기도록 합니다.

Repository / Service 요구사항:
다음 함수들을 main process 쪽에 구현합니다.

Project:

* createProject(input)
* listProjects()
* getProject(id)
* updateProject(id, input)
* deleteProject(id)

PromptAsset:

* createPromptAsset(input)
* listPromptAssets(filter?)
* getPromptAsset(id)
* updatePromptAsset(id, input)
* deletePromptAsset(id)

PromptVersion:

* createPromptVersion(input)
* listPromptVersions(promptAssetId)
* getPromptVersion(id)
* setCurrentPromptVersion(promptAssetId, versionId)

Tag:

* createTag(input)
* listTags()
* updateTag(id, input)
* deleteTag(id)
* attachTagToPrompt(promptAssetId, tagId)
* detachTagFromPrompt(promptAssetId, tagId)

HarnessTemplate:

* createHarnessTemplate(input)
* listHarnessTemplates()
* getHarnessTemplate(id)
* updateHarnessTemplate(id, input)
* deleteHarnessTemplate(id)

Settings:

* getSetting(key)
* setSetting(key, value)
* listSettings()

IPC 요구사항:
preload bridge를 통해 renderer에 다음과 같은 안전한 API를 노출합니다.
정확한 네이밍은 기존 코드 스타일에 맞춰 조정해도 됩니다.

* window.prompter.projects.create(input)

* window.prompter.projects.list()

* window.prompter.projects.get(id)

* window.prompter.projects.update(id, input)

* window.prompter.projects.delete(id)

* window.prompter.prompts.createAsset(input)

* window.prompter.prompts.listAssets(filter?)

* window.prompter.prompts.getAsset(id)

* window.prompter.prompts.updateAsset(id, input)

* window.prompter.prompts.deleteAsset(id)

* window.prompter.prompts.createVersion(input)

* window.prompter.prompts.listVersions(promptAssetId)

* window.prompter.prompts.getVersion(id)

* window.prompter.prompts.setCurrentVersion(promptAssetId, versionId)

* window.prompter.tags.create(input)

* window.prompter.tags.list()

* window.prompter.tags.update(id, input)

* window.prompter.tags.delete(id)

* window.prompter.tags.attachToPrompt(promptAssetId, tagId)

* window.prompter.tags.detachFromPrompt(promptAssetId, tagId)

* window.prompter.harnessTemplates.create(input)

* window.prompter.harnessTemplates.list()

* window.prompter.harnessTemplates.get(id)

* window.prompter.harnessTemplates.update(id, input)

* window.prompter.harnessTemplates.delete(id)

* window.prompter.settings.get(key)

* window.prompter.settings.set(key, value)

* window.prompter.settings.list()

보안 요구사항:

* renderer에서 DB 파일 경로를 알 필요가 없게 합니다.
* renderer에 better-sqlite3, drizzle, fs, path, process, shell 접근을 노출하지 않습니다.
* IPC handler마다 Zod schema로 입력을 검증합니다.
* 잘못된 입력은 명확한 에러로 반환합니다.
* 삭제 작업은 실제 UI 연결 전이라도 repository 수준에서 안전하게 처리합니다.
* 가능한 경우 foreign key 제약을 활성화합니다.

Zod 요구사항:
다음 입력 스키마를 정의합니다.

* CreateProjectInput
* UpdateProjectInput
* CreatePromptAssetInput
* UpdatePromptAssetInput
* CreatePromptVersionInput
* CreateTagInput
* UpdateTagInput
* CreateHarnessTemplateInput
* UpdateHarnessTemplateInput
* SetSettingInput

공통 규칙:

* 빈 문자열 name/title은 허용하지 않습니다.
* scenario와 target_agent는 enum 또는 제한된 문자열 union으로 정의합니다.
* target_agent 후보:

  * codex
  * claude_code
  * cursor
  * generic_agent
* scenario 후보:

  * feature
  * bugfix
  * refactor
  * code_review
  * docs
  * research

Renderer 연결 요구사항:
이번 단계에서는 완전한 UI 연동을 구현하지 않아도 됩니다.
단, 기존 mock UI가 깨지지 않아야 합니다.
가능하면 개발 확인용으로 다음 정도만 연결합니다.

* 앱 시작 시 projects.list()를 호출해 콘솔 또는 임시 UI 영역에 표시
* “New Project” 버튼이 이미 있다면 임시 프로젝트 생성 기능 연결
* 또는 별도의 간단한 DB smoke test 버튼을 만들어 create/list가 동작하는지 확인

단, Phase 3에서 프롬프트 라이브러리 UI를 본격적으로 연결할 예정이므로 이번 단계에서 UI를 과하게 구현하지 마세요.

테스트 / 확인 요구사항:

* TypeScript typecheck가 통과해야 합니다.
* 앱이 개발 모드에서 실행되어야 합니다.
* DB 파일이 userData 경로에 생성되어야 합니다.
* projects create/list가 동작해야 합니다.
* prompt_assets create/list가 동작해야 합니다.
* prompt_versions create/list가 동작해야 합니다.
* tags create/list 및 attach/detach가 동작해야 합니다.
* settings get/set이 동작해야 합니다.
* renderer가 DB에 직접 접근하지 않아야 합니다.

권장 파일 구조:
기존 구조에 맞추되, 다음과 같은 분리를 권장합니다.

* src/main/db/schema.ts
* src/main/db/client.ts
* src/main/db/migrations 또는 drizzle 설정 파일
* src/main/repositories/projectRepository.ts
* src/main/repositories/promptRepository.ts
* src/main/repositories/tagRepository.ts
* src/main/repositories/harnessTemplateRepository.ts
* src/main/repositories/settingsRepository.ts
* src/main/ipc/projects.ts
* src/main/ipc/prompts.ts
* src/main/ipc/tags.ts
* src/main/ipc/harnessTemplates.ts
* src/main/ipc/settings.ts
* src/shared/types 또는 src/shared/schemas
* src/preload/index.ts
* src/renderer/types/window.d.ts 또는 기존 preload 타입 선언 파일

정확한 파일명은 기존 프로젝트 스타일에 맞게 조정해도 됩니다. 단, main process의 DB 로직과 renderer UI 로직은 섞지 마세요.

완료 기준:

* SQLite + Drizzle + better-sqlite3 기반 로컬 DB가 설정되어 있습니다.
* 앱 시작 시 DB가 초기화됩니다.
* 필요한 테이블이 생성됩니다.
* prompt_runs 또는 실행 결과 관련 테이블은 존재하지 않습니다.
* 주요 CRUD repository/service 함수가 구현되어 있습니다.
* typed IPC를 통해 renderer에서 CRUD를 호출할 수 있습니다.
* IPC 입력값이 Zod로 검증됩니다.
* renderer는 DB, 파일시스템, Node.js API에 직접 접근하지 않습니다.
* TypeScript 타입 검사가 통과합니다.
* 앱이 개발 모드에서 정상 실행됩니다.

작업 전:

1. 현재 Phase 0, Phase 1 코드 구조를 확인합니다.
2. Electron main, preload, renderer 구조를 파악합니다.
3. package manager가 npm인지 pnpm인지 확인합니다.
4. 현재 Tailwind/UI 코드와 충돌하지 않도록 변경 범위를 정합니다.
5. SQLite, Drizzle, better-sqlite3 추가가 필요한지 확인합니다.
6. 간결한 구현 계획을 세운 뒤 Phase 2만 구현합니다.

작업 후:

1. 변경된 내용을 요약합니다.
2. 생성되거나 수정된 파일 목록을 제공합니다.
3. 추가한 패키지 목록을 제공합니다.
4. DB 파일 위치와 마이그레이션 방식을 설명합니다.
5. 앱 실행, 타입 검사, 마이그레이션 실행 명령어를 제공합니다.
6. smoke test 방법을 설명합니다.
7. 아직 구현하지 않은 기능을 명확히 구분해서 설명합니다.

```



# Phase 3

```
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

  * 왼쪽 사이드바
  * 중앙 프롬프트 라이브러리
  * 오른쪽 프롬프트 컴파일러
* 재사용 가능한 기본 UI 컴포넌트

Phase 2:

* SQLite + Drizzle ORM + better-sqlite3 기반 로컬 DB
* DB는 Electron main process에서만 접근
* renderer는 typed IPC를 통해서만 DB 기능 호출
* Zod 기반 IPC 입력값 검증
* 다음 테이블 및 기본 CRUD 준비:

  * projects
  * prompt_assets
  * prompt_versions
  * tags
  * prompt_tags
  * harness_templates
  * settings

이 작업은 Phase 3: 프롬프트 라이브러리 UI 연결입니다.

목표:
Phase 1에서 만든 프롬프트 라이브러리 UI를 Phase 2에서 만든 실제 로컬 DB와 연결합니다. 사용자는 프로젝트를 생성하고, 프로젝트별 프롬프트 목록을 보고, 새 프롬프트를 만들고, 선택한 프롬프트의 최신 버전을 확인할 수 있어야 합니다.

중요:
아직 OpenAI 또는 LLM 통합을 추가하지 마세요.
아직 프롬프트 컴파일 로직을 추가하지 마세요.
아직 Codex 통합을 추가하지 마세요.
아직 프롬프트 실행 기능을 추가하지 마세요.
아직 프롬프트 실행 결과 저장 기능을 추가하지 마세요.
prompt_runs, agent_runs, execution_results, validation_results, run_logs를 만들거나 사용하지 마세요.
이번 단계는 프롬프트 라이브러리 UI와 로컬 DB CRUD 연결만 구현합니다.

아키텍처 요구사항:

* renderer는 여전히 DB에 직접 접근하면 안 됩니다.
* renderer는 preload bridge에 노출된 window.prompter API만 사용해야 합니다.
* main process의 repository/service 구조는 유지합니다.
* IPC payload 검증 구조를 유지합니다.
* UI 컴포넌트와 데이터 호출 로직을 과도하게 섞지 마세요.
* 필요하다면 renderer 안에 간단한 hooks 또는 service wrapper를 추가해도 됩니다.
* 상태 관리는 React local state로 충분하면 local state를 사용하세요.
* 전역 상태가 명확히 필요하지 않다면 Zustand를 아직 도입하지 마세요.

이번 단계에서 구현할 주요 기능:

1. 프로젝트 목록 표시

* 왼쪽 사이드바에서 projects.list()를 호출해 실제 프로젝트 목록을 표시합니다.
* 프로젝트가 없으면 적절한 빈 상태를 표시합니다.
* 프로젝트를 클릭하면 해당 프로젝트가 선택됩니다.
* 선택된 프로젝트는 시각적으로 구분되어야 합니다.

2. 새 프로젝트 생성

* “새 프로젝트” 버튼 또는 기존 placeholder 버튼을 실제 생성 플로우에 연결합니다.
* 최소 입력값:

  * name
  * description, 선택
  * tech_stack, 선택
  * default_agent, 선택
* 생성 후 프로젝트 목록을 갱신합니다.
* 생성된 프로젝트를 자동으로 선택해도 됩니다.
* 빈 name은 허용하지 않습니다.
* 에러 발생 시 사용자에게 명확한 메시지를 보여줍니다.

3. 프로젝트별 프롬프트 목록 표시

* 중앙 패널에서 선택된 프로젝트의 prompt_assets 목록을 표시합니다.
* 프로젝트가 선택되지 않은 경우 “프로젝트를 선택하세요” 빈 상태를 표시합니다.
* 선택된 프로젝트에 프롬프트가 없으면 “아직 프롬프트가 없습니다” 빈 상태를 표시합니다.
* 각 프롬프트 카드에는 다음 정보를 표시합니다:

  * title
  * scenario
  * target_agent
  * updated_at
  * 가능하면 current version의 일부 preview
* 태그 표시는 나중 Phase 7에서 본격 구현하므로, 현재 DB에서 쉽게 가져올 수 있는 경우에만 표시하고 무리해서 복잡한 태그 UI를 만들지 마세요.

4. 새 프롬프트 생성

* “새 프롬프트” 버튼을 실제 생성 플로우에 연결합니다.
* 아직 LLM 컴파일러가 없으므로 수동 생성 방식으로 구현합니다.
* 최소 입력값:

  * title
  * scenario
  * target_agent
  * original_input
  * compiled_prompt
* selected project가 있으면 project_id를 연결합니다.
* prompt_assets를 먼저 생성하고, 이어서 prompt_versions의 첫 번째 버전을 생성합니다.
* 첫 번째 버전의 version_number는 1이어야 합니다.
* prompt_assets.current_version_id를 생성된 첫 버전 id로 설정합니다.
* 생성 후 프롬프트 목록을 갱신하고 새 프롬프트를 선택합니다.

5. 프롬프트 선택 및 상세 표시

* 중앙 패널에서 프롬프트 카드를 클릭하면 해당 프롬프트가 선택됩니다.
* 오른쪽 패널 또는 상세 영역에 선택된 프롬프트의 최신/current version 내용을 표시합니다.
* 표시할 정보:

  * title
  * scenario
  * target_agent
  * original_input
  * compiled_prompt
  * version_number
  * created_at
  * updated_at
* compiled_prompt는 읽기 쉬운 preformatted text 또는 Markdown preview 스타일로 보여줍니다.
* 아직 편집 기능은 필수로 구현하지 않아도 됩니다.

6. 기본 삭제 또는 수정 기능

* 이번 단계에서 delete/update는 필수는 아닙니다.
* 다만 Phase 2에서 repository가 준비되어 있으므로 간단히 구현할 수 있다면 다음 정도만 추가해도 됩니다:

  * 프로젝트 이름 수정
  * 프롬프트 삭제
* 단, 이 기능 때문에 범위가 커진다면 구현하지 말고 다음 단계로 미룹니다.
* 핵심은 create/list/select/detail 흐름입니다.

UI 요구사항:

* Phase 1의 3단 레이아웃을 유지합니다.
* mock 데이터는 실제 DB 호출로 대체합니다.
* loading 상태를 표시합니다.
* error 상태를 표시합니다.
* empty state를 적절히 표시합니다.
* 버튼 클릭 후 중복 요청을 막기 위해 pending 상태를 처리합니다.
* 날짜는 사람이 읽기 쉬운 형식으로 표시합니다.
* 시나리오와 대상 에이전트는 Badge 형태로 표시하면 좋습니다.

시나리오 후보:

* feature
* bugfix
* refactor
* code_review
* docs
* research

대상 에이전트 후보:

* codex
* claude_code
* cursor
* generic_agent

데이터 로딩 요구사항:

* 앱 시작 시 프로젝트 목록을 로드합니다.
* 프로젝트 선택 시 해당 프로젝트의 프롬프트 목록을 로드합니다.
* 프롬프트 선택 시 해당 프롬프트의 current version 또는 최신 version을 로드합니다.
* create 작업 후 관련 목록을 다시 로드합니다.
* DB 호출 실패 시 UI가 깨지지 않아야 합니다.

권장 renderer 구조:
기존 구조에 맞추되, 다음과 같은 분리를 권장합니다.

* src/renderer/components/layout/Sidebar.tsx
* src/renderer/components/prompt/PromptLibraryPanel.tsx
* src/renderer/components/prompt/PromptCompilerPanel.tsx
* src/renderer/components/prompt/PromptDetailPanel.tsx
* src/renderer/components/project/NewProjectDialog.tsx
* src/renderer/components/prompt/NewPromptDialog.tsx
* src/renderer/hooks/useProjects.ts
* src/renderer/hooks/usePromptAssets.ts
* src/renderer/lib/formatDate.ts

정확한 파일명과 구조는 기존 코드 스타일에 맞춰 조정해도 됩니다.
단, 너무 거대한 App.tsx 하나에 모든 로직을 몰아넣지 마세요. 그건 앱 개발이 아니라 미래의 자기 자신에게 보내는 저주입니다.

Dialog / Modal 요구사항:

* 새 프로젝트 생성과 새 프롬프트 생성은 Dialog, Modal, Drawer, 또는 간단한 inline form 중 하나로 구현합니다.
* 기존 UI 컴포넌트 구조에 가장 잘 맞는 방식을 선택하세요.
* 폼 입력값은 기본적인 validation을 적용합니다.
* 저장 성공 후 폼을 초기화합니다.
* 저장 실패 시 에러 메시지를 보여줍니다.

타입 요구사항:

* shared 타입 또는 Zod schema에서 추론한 타입을 최대한 재사용합니다.
* renderer에서 any를 남발하지 마세요.
* window.prompter API 타입이 깨지지 않도록 preload 타입 선언을 갱신합니다.
* TypeScript typecheck가 통과해야 합니다.

보안 요구사항:

* renderer에서 fs, path, better-sqlite3, drizzle, process에 접근하지 않습니다.
* renderer에서 ipcRenderer를 직접 사용하지 않습니다.
* preload에서 허용된 API만 노출합니다.
* DB 로직은 main process에만 남깁니다.

테스트 / 확인 요구사항:

* 앱이 개발 모드에서 정상 실행되어야 합니다.
* TypeScript typecheck가 통과해야 합니다.
* 프로젝트 생성이 가능해야 합니다.
* 생성된 프로젝트가 왼쪽 사이드바에 표시되어야 합니다.
* 프로젝트 선택 시 중앙 패널이 해당 프로젝트의 프롬프트 목록을 표시해야 합니다.
* 새 프롬프트 생성이 가능해야 합니다.
* 생성된 프롬프트는 prompt_asset과 prompt_version으로 저장되어야 합니다.
* 생성된 프롬프트를 선택하면 상세 정보와 compiled_prompt가 표시되어야 합니다.
* 앱을 재시작해도 저장된 프로젝트와 프롬프트가 유지되어야 합니다.
* prompt_runs 또는 실행 결과 관련 데이터는 생성되지 않아야 합니다.

이번 단계에서 구현하지 말 것:

* LLM 기반 분석
* LLM 기반 프롬프트 컴파일
* clarification question 생성
* API key 저장
* Codex CLI 실행
* Codex OAuth
* 프롬프트 실행 결과 저장
* 버전 비교 diff
* 검색 FTS
* 태그 필터링 고도화
* AGENTS.md / SKILL.md export

완료 기준:

* Phase 1의 mock UI가 실제 DB 데이터 기반 UI로 바뀝니다.
* 프로젝트 생성, 목록 표시, 선택이 가능합니다.
* 선택한 프로젝트별 프롬프트 목록 표시가 가능합니다.
* 새 프롬프트를 수동으로 생성할 수 있습니다.
* 프롬프트 생성 시 prompt_asset과 첫 prompt_version이 함께 생성됩니다.
* 프롬프트 선택 시 current version 상세 내용을 볼 수 있습니다.
* loading, error, empty state가 기본적으로 처리됩니다.
* renderer는 DB에 직접 접근하지 않습니다.
* TypeScript 타입 검사가 통과합니다.
* 앱이 개발 모드에서 정상 실행됩니다.

작업 전:

1. 현재 Phase 0, Phase 1, Phase 2 코드 구조를 확인합니다.
2. preload bridge에 노출된 DB API 이름과 타입을 확인합니다.
3. projects, prompt_assets, prompt_versions 관련 IPC 메서드가 정상 동작하는지 확인합니다.
4. 기존 mock UI를 어디까지 실제 데이터로 대체할지 계획합니다.
5. 간결한 구현 계획을 세운 뒤 Phase 3만 구현합니다.

작업 후:

1. 변경된 내용을 요약합니다.
2. 생성되거나 수정된 파일 목록을 제공합니다.
3. 앱 실행 및 타입 검사 명령어를 제공합니다.
4. 수동 테스트 절차를 제공합니다.
5. 아직 구현하지 않은 기능을 명확히 구분해서 설명합니다.
6. 데이터 흐름이 renderer → preload → IPC → main → DB 순서로 유지되는지 설명합니다.

```



# Phase 4

```
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

  * 왼쪽 사이드바
  * 중앙 프롬프트 라이브러리
  * 오른쪽 프롬프트 컴파일러
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

이 작업은 Phase 4: 프롬프트 컴파일러 UI입니다.

목표:
오른쪽 패널의 프롬프트 컴파일러 UI를 실제로 사용할 수 있게 만듭니다. 사용자가 원본 요청, 시나리오, 대상 에이전트, 프로젝트 맥락, 제약 조건, 검증 명령어 등을 입력하면, LLM 없이 정적 템플릿 기반으로 에이전트 친화적인 프롬프트를 생성합니다. 생성된 프롬프트는 미리보기할 수 있고, 선택된 프로젝트에 PromptAsset + PromptVersion으로 저장할 수 있어야 합니다.

중요:
아직 OpenAI 또는 LLM 통합을 추가하지 마세요.
아직 API key 설정을 추가하지 마세요.
아직 LLM 기반 clarification question 생성을 추가하지 마세요.
아직 LLM 기반 분석이나 자동 시나리오 감지를 추가하지 마세요.
아직 Codex 통합을 추가하지 마세요.
아직 프롬프트 실행 기능을 추가하지 마세요.
아직 프롬프트 실행 결과 저장 기능을 추가하지 마세요.
prompt_runs, agent_runs, execution_results, validation_results, run_logs를 만들거나 사용하지 마세요.
이번 단계는 정적 템플릿 기반 프롬프트 생성 UI와 저장 흐름만 구현합니다.

아키텍처 요구사항:

* renderer는 여전히 DB에 직접 접근하면 안 됩니다.
* 저장은 기존 preload bridge의 prompt 관련 API를 통해 수행합니다.
* main process의 DB repository/service 구조는 유지합니다.
* 프롬프트 생성 자체는 LLM 호출이 아니므로 renderer의 순수 함수 또는 renderer service로 구현해도 됩니다.
* 프롬프트 템플릿 로직은 UI 컴포넌트에 직접 길게 박아넣지 말고 별도 utility 또는 service로 분리합니다.
* 타입은 명확하게 정의합니다.
* any를 남발하지 마세요. 미래의 유지보수자를 향한 저주문입니다.

이번 단계에서 구현할 주요 기능:

1. 프롬프트 컴파일러 입력 폼
   오른쪽 패널에 다음 입력 필드를 구현합니다.

필수 입력:

* 원본 요청(original_input)
* 시나리오(scenario)
* 대상 에이전트(target_agent)

선택 입력:

* 제목(title)
* 프로젝트 맥락(project_context)
* 기술 스택(tech_stack)
* 제약 조건(constraints)
* 성공 기준(acceptance_criteria)
* 검증 명령어(validation_commands)
* 추가 메모(additional_notes)

title이 비어 있으면 original_input을 기반으로 간단한 기본 제목을 생성합니다.
예:

* original_input 첫 줄 또는 앞 60자 사용
* 너무 긴 경우 말줄임 처리

2. 시나리오 선택
   다음 시나리오를 선택할 수 있어야 합니다.

* feature
* bugfix
* refactor
* code_review
* docs
* research

각 시나리오는 UI에서 사람이 읽기 좋은 라벨로 표시합니다.

예:

* feature: 기능 구현
* bugfix: 버그 수정
* refactor: 리팩터링
* code_review: 코드 리뷰
* docs: 문서화
* research: 리서치 / 계획

3. 대상 에이전트 선택
   다음 대상 에이전트를 선택할 수 있어야 합니다.

* codex
* claude_code
* cursor
* generic_agent

각 대상 에이전트는 UI에서 사람이 읽기 좋은 라벨로 표시합니다.

예:

* codex: Codex
* claude_code: Claude Code
* cursor: Cursor
* generic_agent: Generic Agent

4. 정적 템플릿 기반 프롬프트 생성
   “프롬프트 컴파일” 버튼을 누르면 입력값을 기반으로 compiled_prompt를 생성합니다.

생성 프롬프트는 기본적으로 다음 섹션을 포함해야 합니다.

# Objective

사용자의 원본 요청을 바탕으로 작업 목표를 명확히 작성합니다.

# Context

프로젝트 맥락, 기술 스택, 추가 메모가 있으면 포함합니다.
비어 있으면 “No additional context provided.”처럼 명확히 표시합니다.

# Task

에이전트가 수행해야 할 구체적인 작업을 작성합니다.

# Scope

## In scope

* 이번 작업에 포함되는 내용을 작성합니다.

## Out of scope

* 이번 작업에서 하지 말아야 할 내용을 작성합니다.
* 기본적으로 “Do not implement unrelated features.”를 포함합니다.
* “Do not store prompt execution results.”를 포함합니다.

# Constraints

사용자가 입력한 제약 조건을 포함합니다.
없으면 “Prefer small, focused, reviewable changes.” 같은 기본 제약을 포함합니다.

# Acceptance Criteria

사용자가 입력한 성공 기준을 포함합니다.
없으면 시나리오별 기본 성공 기준을 생성합니다.

# Validation

사용자가 입력한 검증 명령어를 포함합니다.
없으면 “Run the existing test, typecheck, lint, or build commands if available.” 같은 기본 문구를 포함합니다.

# Working Instructions

다음 기본 지침을 포함합니다.

* Inspect the existing project structure before editing.
* Make a concise implementation plan before changing files.
* Keep changes small and reviewable.
* Do not introduce unrelated refactors.
* Preserve existing architecture boundaries.
* If important information is missing, state assumptions before proceeding.

# Final Response Format

다음 결과 형식을 포함합니다.

1. Summary of changes

2. Files changed

3. How to test

4. Assumptions

5. Follow-up work, if any

6. 시나리오별 템플릿 차이
   시나리오에 따라 Task, Acceptance Criteria, Working Instructions 일부를 다르게 생성합니다.

feature:

* 새 기능 구현에 집중
* 기존 구조와 자연스럽게 통합
* edge case 고려

bugfix:

* 재현 조건 파악
* 원인 분석
* 최소 수정
* regression 방지

refactor:

* 동작 변경 없이 구조 개선
* public behavior 유지
* 불필요한 대규모 변경 금지

code_review:

* 코드 변경 대신 리뷰 결과 중심
* severity별 findings
* 구체적인 파일/위치 언급

docs:

* 문서 대상 독자 명확화
* 사용법, 예시, 주의사항 포함
* 불필요한 코드 변경 금지

research:

* 구현보다 조사와 계획 중심
* 선택지 비교
* 장단점과 추천안 제시

6. 대상 에이전트별 템플릿 차이
   target_agent에 따라 미세한 지침을 추가합니다.

codex:

* repository inspection을 먼저 하도록 지시
* 작은 변경 단위 선호
* 테스트와 타입 검사 결과를 최종 응답에 포함하도록 지시

claude_code:

* 계획, 변경 요약, 검증 결과를 명확히 분리하도록 지시
* 불확실한 부분은 assumptions로 분리하도록 지시

cursor:

* 편집할 파일을 먼저 식별하도록 지시
* 기존 코드 스타일을 따르도록 지시

generic_agent:

* 특정 도구에 의존하지 않는 일반적인 작업 지침 사용

7. 생성 결과 미리보기

* 생성된 compiled_prompt를 오른쪽 패널 또는 적절한 preview 영역에 표시합니다.
* Markdown 스타일로 읽기 쉽게 보여줍니다.
* 편집 가능한 textarea 또는 읽기 전용 preview 중 하나를 선택해도 됩니다.
* 가능하면 사용자가 생성된 prompt를 저장 전에 직접 수정할 수 있게 합니다.
* 수정 가능한 경우, 저장되는 compiled_prompt는 사용자가 수정한 최종 내용을 사용합니다.

8. 저장 기능
   생성된 프롬프트를 선택된 프로젝트에 저장할 수 있어야 합니다.

저장 동작:

* 선택된 프로젝트가 있으면 해당 project_id로 저장합니다.
* 선택된 프로젝트가 없으면 project_id 없이 저장하거나, 사용자에게 프로젝트 선택을 요구합니다.
* 더 단순한 MVP 흐름을 원하면 프로젝트 선택을 요구해도 됩니다.
* 저장 시 prompt_asset을 생성합니다.
* 이어서 prompt_version을 생성합니다.
* 첫 version_number는 1입니다.
* prompt_asset.current_version_id를 생성된 prompt_version id로 설정합니다.
* 저장 후 프로젝트의 프롬프트 목록을 갱신합니다.
* 저장된 프롬프트를 자동 선택하면 좋습니다.

저장할 값:
PromptAsset:

* title
* project_id
* scenario
* target_agent

PromptVersion:

* prompt_asset_id
* version_number: 1
* original_input
* compiled_prompt
* assumptions: 비워두거나 정적 템플릿에서 사용한 기본 가정을 JSON 문자열로 저장
* questions: null 또는 빈 배열 JSON 문자열
* answers: null 또는 빈 배열 JSON 문자열
* acceptance_criteria
* validation_commands
* quality_score: 간단한 정적 점수 또는 null

quality_score는 이번 단계에서 필수는 아닙니다.
구현한다면 간단히 1에서 5 또는 0에서 100 범위의 정적 휴리스틱을 사용합니다.
복잡한 품질 평가 로직은 나중에 구현합니다.

9. 저장 후 UI 반영

* 저장 성공 메시지를 보여줍니다.
* 저장 실패 시 에러 메시지를 보여줍니다.
* 저장 중에는 버튼을 disabled 처리합니다.
* 저장 후 중앙 프롬프트 라이브러리 목록이 갱신되어야 합니다.
* 가능하면 새로 저장된 프롬프트가 선택되어 상세 표시됩니다.

10. 기본 복사 기능
    이번 단계에서 가능하면 “복사” 버튼도 추가합니다.

* generated compiled_prompt를 클립보드에 복사합니다.
* Electron clipboard API를 직접 renderer에 노출하지 마세요.
* 브라우저의 navigator.clipboard가 사용 가능하면 그것을 사용합니다.
* Electron main/preload를 통한 clipboard API가 필요하다면 최소 API만 노출합니다.
* 복사 성공/실패 메시지를 표시합니다.

복사 기능이 범위를 키운다면 필수는 아닙니다.
단, 구현한다면 보안 경계를 유지해야 합니다.

UI 요구사항:

* 기존 3단 레이아웃을 유지합니다.
* 오른쪽 패널은 실제 프롬프트 컴파일러로 동작해야 합니다.
* 폼 입력, 생성 결과, 저장 버튼의 흐름이 명확해야 합니다.
* loading, saving, error, success 상태를 표시합니다.
* required field가 비어 있으면 컴파일 버튼을 비활성화하거나 validation message를 표시합니다.
* 시나리오와 대상 에이전트는 select, segmented control, tabs 중 기존 UI에 가장 잘 맞는 방식으로 구현합니다.
* 생성된 prompt가 없을 때는 preview 영역에 empty state를 보여줍니다.

권장 파일 구조:
기존 구조에 맞추되, 다음 분리를 권장합니다.

* src/renderer/components/prompt/PromptCompilerPanel.tsx
* src/renderer/components/prompt/CompiledPromptPreview.tsx
* src/renderer/components/prompt/PromptCompilerForm.tsx
* src/renderer/lib/promptCompiler/staticPromptCompiler.ts
* src/renderer/lib/promptCompiler/templates.ts
* src/renderer/lib/promptCompiler/types.ts
* src/renderer/lib/promptCompiler/formatters.ts
* src/renderer/lib/labels.ts

정확한 파일명은 기존 프로젝트 구조에 맞게 조정해도 됩니다.
단, 템플릿 문자열과 React UI를 한 파일에 마구 섞지 마세요. 그러면 나중에 LLM 컴파일러를 붙일 때 사람이든 에이전트든 울게 됩니다.

타입 요구사항:
다음 타입 또는 이에 준하는 타입을 정의합니다.

* PromptScenario
* TargetAgent
* PromptCompilerInput
* CompiledPromptResult

PromptCompilerInput 예시:

* title?: string
* originalInput: string
* scenario: PromptScenario
* targetAgent: TargetAgent
* projectContext?: string
* techStack?: string
* constraints?: string
* acceptanceCriteria?: string
* validationCommands?: string
* additionalNotes?: string

CompiledPromptResult 예시:

* title: string
* originalInput: string
* compiledPrompt: string
* scenario: PromptScenario
* targetAgent: TargetAgent
* assumptions: string[]
* acceptanceCriteria: string[]
* validationCommands: string[]
* qualityScore?: number

보안 요구사항:

* renderer에서 fs, path, better-sqlite3, drizzle, process에 접근하지 않습니다.
* renderer에서 ipcRenderer를 직접 사용하지 않습니다.
* DB 저장은 preload bridge를 통해서만 수행합니다.
* OpenAI API key 또는 secret 관련 로직을 추가하지 않습니다.
* prompt 실행 또는 외부 프로세스 실행 기능을 추가하지 않습니다.

테스트 / 확인 요구사항:

* 앱이 개발 모드에서 정상 실행되어야 합니다.
* TypeScript typecheck가 통과해야 합니다.
* 원본 요청을 입력하고 시나리오와 대상 에이전트를 선택할 수 있어야 합니다.
* “프롬프트 컴파일” 버튼을 누르면 정적 템플릿 기반 compiled_prompt가 생성되어야 합니다.
* 생성된 prompt가 preview 영역에 표시되어야 합니다.
* 생성된 prompt를 저장하면 prompt_asset과 prompt_version이 DB에 생성되어야 합니다.
* 저장 후 중앙 프롬프트 라이브러리 목록이 갱신되어야 합니다.
* 앱 재시작 후에도 저장된 프롬프트가 유지되어야 합니다.
* prompt_runs 또는 실행 결과 관련 데이터는 생성되지 않아야 합니다.

이번 단계에서 구현하지 말 것:

* LLM 기반 분석
* LLM 기반 프롬프트 컴파일
* clarification question 생성
* API key 저장
* OpenAI SDK 추가
* Codex CLI 실행
* Codex OAuth
* 프롬프트 실행 결과 저장
* 버전 diff
* 검색 FTS
* 태그 필터 고도화
* AGENTS.md / SKILL.md export

완료 기준:

* 오른쪽 패널의 프롬프트 컴파일러 UI가 실제로 동작합니다.
* 사용자가 원본 요청, 시나리오, 대상 에이전트, 선택 입력값을 입력할 수 있습니다.
* 정적 템플릿 기반으로 에이전트 친화적인 compiled_prompt가 생성됩니다.
* 생성 결과를 preview에서 확인할 수 있습니다.
* 생성 결과를 선택된 프로젝트에 PromptAsset + PromptVersion으로 저장할 수 있습니다.
* 저장 후 프롬프트 라이브러리가 갱신됩니다.
* renderer는 DB에 직접 접근하지 않습니다.
* TypeScript 타입 검사가 통과합니다.
* 앱이 개발 모드에서 정상 실행됩니다.
* LLM, API key, Codex, 실행 결과 저장 기능은 아직 구현되지 않았습니다.

작업 전:

1. 현재 Phase 0, Phase 1, Phase 2, Phase 3 코드 구조를 확인합니다.
2. PromptCompilerPanel placeholder가 어디에 있는지 확인합니다.
3. 프롬프트 저장에 사용할 preload bridge API를 확인합니다.
4. prompt_asset과 prompt_version 생성 흐름이 Phase 3에서 어떻게 구현되어 있는지 확인합니다.
5. 기존 UI 컴포넌트를 최대한 재사용할 계획을 세웁니다.
6. 간결한 구현 계획을 세운 뒤 Phase 4만 구현합니다.

작업 후:

1. 변경된 내용을 요약합니다.
2. 생성되거나 수정된 파일 목록을 제공합니다.
3. 앱 실행 및 타입 검사 명령어를 제공합니다.
4. 수동 테스트 절차를 제공합니다.
5. 정적 템플릿 생성 로직의 위치와 구조를 설명합니다.
6. 아직 구현하지 않은 기능을 명확히 구분해서 설명합니다.
7. 데이터 흐름이 renderer → preload → IPC → main → DB 순서로 유지되는지 설명합니다.

```





# Phase 5

```
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

  * 왼쪽 사이드바
  * 중앙 프롬프트 라이브러리
  * 오른쪽 프롬프트 컴파일러
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

* 오른쪽 패널의 프롬프트 컴파일러 UI 구현
* 정적 템플릿 기반 compiled_prompt 생성 가능
* 생성된 프롬프트를 PromptAsset + PromptVersion으로 저장 가능

Phase 9:

* Settings UI 구현
* OpenAI API Key를 안전하게 저장, 상태 확인, 삭제 가능
* API Key 평문은 renderer, logs, settings 테이블에 노출되지 않음
* default_model, default_target_agent, default_scenario, default_project_id 관리 가능

이 작업은 Phase 5: LLM 기반 clarification / compile입니다.

목표:
OpenAI TypeScript SDK를 Electron main process에 추가하고, 기존 정적 템플릿 기반 프롬프트 컴파일러를 LLM 기반 분석 및 컴파일 흐름으로 확장합니다. 사용자의 원본 요청을 분석해 애매한 부분을 질문하고, 사용자의 답변을 반영해 최종 에이전트 친화 프롬프트를 생성할 수 있어야 합니다.

중요:
프롬프트 실행 기능을 추가하지 마세요.
Codex, Claude Code, Cursor 같은 외부 코딩 에이전트를 직접 실행하지 마세요.
프롬프트 실행 결과 저장 기능을 추가하지 마세요.
prompt_runs, agent_runs, execution_results, validation_results, run_logs를 만들거나 사용하지 마세요.
이번 단계는 LLM 기반 “프롬프트 생성”까지만 구현합니다.
생성된 프롬프트를 저장하는 것은 기존 PromptAsset + PromptVersion 구조를 사용합니다.

아키텍처 요구사항:

* OpenAI SDK 호출은 Electron main process에서만 수행합니다.
* renderer는 OpenAI SDK를 직접 import하거나 호출하면 안 됩니다.
* renderer는 API Key를 직접 읽거나 보관하면 안 됩니다.
* API Key는 Phase 9에서 만든 main process 전용 secret store를 통해서만 읽습니다.
* renderer는 preload bridge를 통해 promptCompiler API만 호출합니다.
* 모든 IPC 입력값과 LLM 출력값은 Zod로 검증합니다.
* LLM 응답이 잘못된 JSON이거나 스키마와 맞지 않으면 복구 가능한 에러를 반환합니다.
* 정적 템플릿 컴파일러는 fallback 또는 “로컬 템플릿으로 생성” 옵션으로 유지해도 됩니다.
* LLM 컴파일 로직은 UI 컴포넌트에 직접 넣지 말고 main process service로 분리합니다.

이번 단계에서 구현할 주요 기능:

1. OpenAI SDK 추가

* OpenAI TypeScript SDK를 프로젝트에 추가합니다.
* SDK는 main process 코드에서만 사용합니다.
* renderer bundle에 OpenAI SDK와 API Key 관련 코드가 들어가지 않게 합니다.
* API Key가 없을 경우 명확한 에러를 반환합니다.

2. PromptCompilerService 구현
   main process에 PromptCompilerService를 구현합니다.

권장 위치:

* src/main/services/promptCompiler/PromptCompilerService.ts
* src/main/services/promptCompiler/openAIClient.ts
* src/main/services/promptCompiler/prompts.ts
* src/main/ipc/promptCompiler.ts
* src/shared/schemas/promptCompilerSchemas.ts
* src/shared/types/promptCompiler.ts

정확한 파일 구조는 기존 프로젝트 스타일에 맞춰 조정해도 됩니다.

PromptCompilerService는 최소 두 가지 작업을 지원해야 합니다.

A. analyze
사용자의 원본 요청과 선택 입력값을 분석하여 clarification question을 생성합니다.

B. compile
사용자의 원본 요청, 입력값, clarification question 답변을 바탕으로 최종 compiled_prompt를 생성합니다.

3. promptCompiler.analyze IPC 구현
   preload bridge에 다음 API를 추가합니다.

* window.prompter.promptCompiler.analyze(input)

입력값 예시:

* originalInput: string
* scenario?: PromptScenario
* targetAgent?: TargetAgent
* projectContext?: string
* techStack?: string
* constraints?: string
* acceptanceCriteria?: string
* validationCommands?: string
* additionalNotes?: string
* projectId?: string | null

analyze 결과 예시:

* detectedScenario: PromptScenario
* detectedTargetAgent: TargetAgent
* summary: string
* clarificationNeeded: boolean
* questions: ClarificationQuestion[]
* assumptions: string[]
* suggestedTags: string[]
* riskLevel: "low" | "medium" | "high"

ClarificationQuestion 예시:

* id: string
* question: string
* whyItMatters: string
* options?: string[]
* required: boolean

요구사항:

* 질문은 최대 3개까지만 생성합니다.
* 최종 프롬프트 품질에 실질적으로 영향을 주는 질문만 생성합니다.
* 사소한 정보 누락은 질문하지 말고 assumptions로 처리합니다.
* 질문은 가능하면 선택지 형태를 제공합니다.
* scenario나 targetAgent가 사용자가 이미 명확히 선택한 경우, 함부로 바꾸지 말고 suggested 또는 detected 값으로만 제안합니다.
* 사용자의 입력이 충분히 명확하면 clarificationNeeded는 false가 될 수 있습니다.

4. promptCompiler.compile IPC 구현
   preload bridge에 다음 API를 추가합니다.

* window.prompter.promptCompiler.compile(input)

입력값 예시:

* originalInput: string
* scenario: PromptScenario
* targetAgent: TargetAgent
* projectContext?: string
* techStack?: string
* constraints?: string
* acceptanceCriteria?: string
* validationCommands?: string
* additionalNotes?: string
* clarificationAnswers?: ClarificationAnswer[]
* assumptions?: string[]
* projectId?: string | null

ClarificationAnswer 예시:

* questionId: string
* question: string
* answer: string

compile 결과 예시:

* title: string
* scenario: PromptScenario
* targetAgent: TargetAgent
* summary: string
* compiledPrompt: string
* assumptions: string[]
* questions: ClarificationQuestion[]
* answers: ClarificationAnswer[]
* acceptanceCriteria: string[]
* validationCommands: string[]
* suggestedTags: string[]
* qualityScore: number
* warnings: string[]

요구사항:

* compiledPrompt는 에이전트에게 바로 전달 가능한 최종 프롬프트여야 합니다.
* compiledPrompt는 Markdown 형식이어야 합니다.
* compiledPrompt는 반드시 아래 섹션을 포함해야 합니다:

  * # Objective
  * # Context
  * # Task
  * # Scope
  * # Constraints
  * # Acceptance Criteria
  * # Validation
  * # Working Instructions
  * # Final Response Format
* 사용자가 입력한 제약, 성공 기준, 검증 명령어가 있으면 반드시 반영합니다.
* 사용자가 제공하지 않은 프로젝트 사실을 지어내지 않습니다.
* 누락된 정보는 assumptions에 명확히 분리합니다.
* 에이전트가 불필요한 대규모 리팩터링을 하지 않도록 지시합니다.
* “Do not store prompt execution results.”를 필요한 경우 out of scope 또는 constraints에 포함합니다.
* targetAgent에 맞는 지침을 추가합니다.

5. 대상 에이전트별 지침
   targetAgent에 따라 compiledPrompt에 다음 성격의 지침을 반영합니다.

codex:

* 저장소 구조를 먼저 확인하도록 지시합니다.
* 변경 전 간단한 계획을 세우도록 지시합니다.
* 작고 검토 가능한 변경을 선호하도록 지시합니다.
* 테스트, 타입 검사, 빌드 결과를 최종 응답에 포함하도록 지시합니다.

claude_code:

* 계획, 변경 요약, 검증 결과, 가정을 명확히 분리하도록 지시합니다.
* 불확실한 부분은 assumptions로 분리하도록 지시합니다.
* 기존 아키텍처 경계를 보존하도록 지시합니다.

cursor:

* 수정할 파일 후보를 먼저 식별하도록 지시합니다.
* 기존 코드 스타일과 인접 코드 패턴을 따르도록 지시합니다.
* 편집 범위를 작게 유지하도록 지시합니다.

generic_agent:

* 특정 도구에 의존하지 않는 일반적인 작업 지침을 사용합니다.
* 필요한 경우 먼저 파일과 맥락을 확인하도록 지시합니다.

6. 시나리오별 지침
   scenario에 따라 compiledPrompt의 Task, Acceptance Criteria, Working Instructions가 달라져야 합니다.

feature:

* 새 기능 구현에 집중합니다.
* 기존 구조와 자연스럽게 통합하도록 지시합니다.
* edge case와 테스트 가능성을 포함합니다.

bugfix:

* 문제 재현 조건을 먼저 파악하도록 지시합니다.
* 원인을 설명하고 최소 수정으로 해결하도록 지시합니다.
* regression 방지를 위한 검증을 포함합니다.

refactor:

* 외부 동작 변경 없이 구조 개선하도록 지시합니다.
* public behavior와 기존 테스트를 유지하도록 지시합니다.
* 불필요한 대규모 변경을 금지합니다.

code_review:

* 코드 변경보다 리뷰 결과 작성에 집중하도록 지시합니다.
* findings를 severity별로 정리하도록 지시합니다.
* 가능하면 파일/위치/근거를 포함하도록 지시합니다.
* 불필요한 rewrite를 하지 않도록 지시합니다.

docs:

* 대상 독자와 문서 목적을 명확히 하도록 지시합니다.
* 사용법, 예시, 주의사항을 포함하도록 지시합니다.
* 문서 작업 외의 코드 변경을 최소화하도록 지시합니다.

research:

* 바로 구현하지 말고 조사와 선택지 비교에 집중하도록 지시합니다.
* 장단점, 리스크, 추천안을 포함하도록 지시합니다.
* 다음 실행 단계까지 제안하도록 지시합니다.

7. LLM 시스템 프롬프트 요구사항
   PromptCompilerService에서 사용할 시스템 프롬프트를 별도 파일 또는 함수로 분리합니다.

시스템 프롬프트의 역할:

* 너는 agent prompt compiler다.
* 사용자의 모호한 요청을 코딩 에이전트가 실행 가능한 작업 명세로 바꾼다.
* 애매한 부분을 감지한다.
* 필요한 경우 최대 3개의 clarification question만 생성한다.
* 질문하지 않아도 되는 사소한 누락은 assumptions로 처리한다.
* 프로젝트에 대해 제공되지 않은 사실을 지어내지 않는다.
* 최종 프롬프트에는 목표, 맥락, 작업 범위, 제약, 성공 기준, 검증 방법, 최종 응답 형식을 포함한다.
* 출력은 반드시 요청된 JSON schema를 따라야 한다.

8. JSON 출력 검증
   LLM 응답은 반드시 구조화된 JSON으로 파싱하고 Zod로 검증합니다.

요구사항:

* analyze 응답 schema 정의
* compile 응답 schema 정의
* schema 검증 실패 시 사용자에게 복구 가능한 에러 반환
* 가능하면 JSON parsing 실패 시 한 번 정도 재시도하거나, “모델 응답 형식이 올바르지 않다”는 명확한 에러를 반환
* 잘못된 LLM 출력이 앱 전체를 crash시키면 안 됩니다.

9. PromptCompiler UI 업데이트
   Phase 4에서 만든 오른쪽 패널을 LLM 기반 흐름으로 확장합니다.

UI 흐름:

1. 사용자가 원본 요청과 선택 입력값을 작성합니다.
2. “분석하기” 또는 “질문 생성” 버튼을 누릅니다.
3. 앱이 promptCompiler.analyze를 호출합니다.
4. clarificationNeeded가 true이면 질문 목록을 표시합니다.
5. 사용자가 질문에 답변합니다.
6. “최종 프롬프트 생성” 버튼을 누릅니다.
7. 앱이 promptCompiler.compile을 호출합니다.
8. compiledPrompt를 preview/editor 영역에 표시합니다.
9. 사용자가 필요하면 compiledPrompt를 직접 수정합니다.
10. 저장 버튼으로 PromptAsset + PromptVersion에 저장합니다.

단순화를 원한다면 버튼은 하나로 시작해도 됩니다.
예:

* “LLM으로 컴파일”
* 내부적으로 analyze를 먼저 호출하고, 질문이 필요하면 질문 UI를 보여줌
* 질문 답변 후 compile 호출

하지만 데이터 흐름은 analyze와 compile로 분리하는 것을 권장합니다.

UI에 표시할 정보:

* 분석 요약
* 감지된 시나리오
* 감지된 대상 에이전트
* clarification questions
* assumptions
* suggested tags
* risk level
* compiled prompt
* quality score
* warnings

10. 저장 기능 업데이트
    LLM compile 결과를 기존 저장 흐름에 연결합니다.

저장 시:
PromptAsset:

* title
* project_id
* scenario
* target_agent

PromptVersion:

* version_number: 1 또는 기존 asset에 새 버전을 추가하는 경우 다음 번호
* original_input
* compiled_prompt
* assumptions: JSON 문자열
* questions: JSON 문자열
* answers: JSON 문자열
* acceptance_criteria: JSON 문자열 또는 newline string
* validation_commands: JSON 문자열 또는 newline string
* quality_score

이번 단계에서는 “새 PromptAsset으로 저장”만 구현해도 됩니다.
기존 PromptAsset에 새 버전으로 저장하는 기능은 Phase 6에서 본격 구현합니다.
다만 쉽게 가능하다면 “선택된 prompt에 새 버전으로 저장” 옵션을 추가해도 됩니다.

11. 설정과의 연결
    Phase 9에서 만든 설정을 활용합니다.

요구사항:

* default_model을 LLM 호출에 사용합니다.
* default_target_agent를 컴파일러 폼 초기값으로 사용합니다.
* default_scenario를 컴파일러 폼 초기값으로 사용합니다.
* API Key가 없으면 LLM 버튼을 비활성화하거나 명확한 안내를 표시합니다.
* API Key가 없을 때 정적 템플릿 fallback을 사용할 수 있게 해도 됩니다.

12. 에러 처리
    다음 상황을 처리합니다.

* API Key가 없음
* API Key 복호화 실패
* OpenAI SDK 호출 실패
* 네트워크 오류
* 모델 응답 파싱 실패
* Zod schema 검증 실패
* 사용자가 필수 입력을 비워둠
* 요청 중 사용자가 다시 버튼을 누름
* 저장 실패

에러 메시지는 사용자가 다음 행동을 알 수 있게 작성합니다.
단, API Key 전체 값이나 내부 secret 경로를 노출하지 마세요.

13. 로딩 / 취소 처리

* analyze 중 로딩 상태를 표시합니다.
* compile 중 로딩 상태를 표시합니다.
* 버튼 중복 클릭을 막습니다.
* 가능하면 AbortController 또는 이에 준하는 취소 구조를 고려합니다.
* 취소가 범위를 키운다면 이번 단계에서는 생략해도 됩니다.

보안 요구사항:

* API Key 평문을 renderer로 반환하지 않습니다.
* API Key 평문을 console.log로 출력하지 않습니다.
* API Key 평문을 에러 메시지에 포함하지 않습니다.
* OpenAI SDK는 renderer에서 import하지 않습니다.
* renderer에서 fs, path, process, safeStorage, ipcRenderer에 직접 접근하지 않습니다.
* LLM 호출은 main process의 PromptCompilerService를 통해서만 수행합니다.
* 프롬프트 실행 또는 외부 프로세스 실행 기능을 추가하지 않습니다.

테스트 / 확인 요구사항:

* 앱이 개발 모드에서 정상 실행되어야 합니다.
* TypeScript typecheck가 통과해야 합니다.
* API Key가 없을 때 LLM 분석/컴파일이 명확한 에러를 반환해야 합니다.
* API Key가 저장된 상태에서 analyze가 동작해야 합니다.
* analyze는 최대 3개의 clarification question을 반환해야 합니다.
* 사용자가 질문에 답변한 뒤 compile이 동작해야 합니다.
* compile 결과는 Markdown compiledPrompt를 포함해야 합니다.
* compiledPrompt는 필수 섹션을 포함해야 합니다.
* compile 결과를 PromptAsset + PromptVersion으로 저장할 수 있어야 합니다.
* 저장 후 프롬프트 라이브러리가 갱신되어야 합니다.
* LLM 응답이 schema와 맞지 않아도 앱이 crash되지 않아야 합니다.
* API Key 평문이 renderer, logs, settings table에 노출되지 않아야 합니다.
* prompt_runs 또는 실행 결과 관련 데이터는 생성되지 않아야 합니다.

이번 단계에서 구현하지 말 것:

* Codex CLI 실행
* Codex OAuth
* Claude Code 실행
* Cursor 실행
* 프롬프트 실행 기능
* 프롬프트 실행 결과 저장
* prompt_runs, agent_runs, execution_results, validation_results, run_logs
* 버전 diff UI
* 검색 FTS
* 태그 필터 고도화
* AGENTS.md / SKILL.md export
* 클라우드 동기화
* 팀 협업

완료 기준:

* OpenAI SDK가 main process에만 연결되어 있습니다.
* PromptCompilerService가 analyze와 compile을 제공합니다.
* renderer는 preload bridge를 통해 promptCompiler.analyze와 promptCompiler.compile을 호출합니다.
* API Key는 main process의 secret store에서만 사용됩니다.
* 사용자는 원본 요청을 분석하고 clarification question을 받을 수 있습니다.
* 사용자는 질문 답변을 반영해 최종 compiledPrompt를 생성할 수 있습니다.
* LLM 출력은 Zod schema로 검증됩니다.
* generated compiledPrompt를 기존 PromptAsset + PromptVersion 저장 흐름으로 저장할 수 있습니다.
* 정적 템플릿 컴파일러는 fallback 또는 기존 기능으로 유지됩니다.
* TypeScript 타입 검사가 통과합니다.
* 앱이 개발 모드에서 정상 실행됩니다.
* 프롬프트 실행이나 실행 결과 저장 기능은 추가되지 않았습니다.

작업 전:

1. 현재 Phase 0, Phase 1, Phase 2, Phase 3, Phase 4, Phase 9 코드 구조를 확인합니다.
2. Phase 9에서 구현한 API Key secret store 구조를 확인합니다.
3. settings에서 default_model을 읽는 방식을 확인합니다.
4. PromptCompilerPanel의 현재 정적 템플릿 생성 흐름을 확인합니다.
5. preload bridge와 타입 선언 구조를 확인합니다.
6. LLM 호출이 main process 안에만 머물도록 구현 계획을 세웁니다.
7. JSON schema 검증 실패 시 처리 전략을 정합니다.
8. 간결한 구현 계획을 세운 뒤 Phase 5만 구현합니다.

작업 후:

1. 변경된 내용을 요약합니다.
2. 생성되거나 수정된 파일 목록을 제공합니다.
3. 추가한 패키지 목록을 제공합니다.
4. OpenAI SDK 호출이 main process에만 존재하는지 설명합니다.
5. API Key가 renderer로 노출되지 않는 데이터 흐름을 설명합니다.
6. analyze와 compile의 입력/출력 구조를 설명합니다.
7. 앱 실행 및 타입 검사 명령어를 제공합니다.
8. 수동 테스트 절차를 제공합니다.
9. LLM 응답 schema 검증 실패 시 어떤 동작을 하는지 설명합니다.
10. 아직 구현하지 않은 기능을 명확히 구분해서 설명합니다.

```



# Phase 6

```
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
* prompt_assets, prompt_versions 테이블 포함

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

이 작업은 Phase 6: 프롬프트 버전 관리입니다.

목표:
하나의 PromptAsset이 여러 PromptVersion을 가질 수 있도록 UI와 데이터 흐름을 완성합니다. 사용자는 선택한 프롬프트의 버전 목록을 보고, 버전을 전환하고, 현재 버전을 지정하고, 새 컴파일 결과를 기존 프롬프트의 새 버전으로 저장할 수 있어야 합니다. 또한 두 버전 간의 간단한 diff를 확인할 수 있어야 합니다.

중요:
프롬프트 실행 기능을 추가하지 마세요.
Codex, Claude Code, Cursor 같은 외부 코딩 에이전트를 직접 실행하지 마세요.
프롬프트 실행 결과 저장 기능을 추가하지 마세요.
prompt_runs, agent_runs, execution_results, validation_results, run_logs를 만들거나 사용하지 마세요.
검색 FTS, 태그 필터링, export 기능은 아직 구현하지 마세요.
이번 단계는 PromptAsset과 PromptVersion의 버전 관리에만 집중합니다.

아키텍처 요구사항:

* renderer는 DB에 직접 접근하면 안 됩니다.
* renderer는 preload bridge에 노출된 typed API만 사용해야 합니다.
* DB 접근과 version_number 계산은 main process의 service 또는 repository에서 처리합니다.
* 새 버전 생성과 current_version_id 업데이트는 가능한 한 transaction으로 처리합니다.
* IPC 입력값은 Zod로 검증합니다.
* UI 컴포넌트와 버전 계산 로직을 섞지 마세요.
* version_number를 renderer에서 임의로 계산하지 마세요. renderer는 요청만 보내고, main process가 다음 버전 번호를 결정해야 합니다.

이번 단계에서 구현할 주요 기능:

1. PromptVersion 목록 조회 개선
   선택된 PromptAsset에 연결된 모든 PromptVersion을 조회하고 UI에 표시합니다.

표시할 정보:

* version_number
* created_at
* quality_score
* original_input 일부 preview
* compiled_prompt 일부 preview
* current version 여부

정렬:

* 기본적으로 version_number 내림차순 또는 created_at 내림차순
* current version은 시각적으로 구분합니다.

2. 버전 선택
   사용자가 버전 목록에서 특정 버전을 선택하면 해당 버전의 상세 내용을 볼 수 있어야 합니다.

상세 표시 항목:

* version_number
* original_input
* compiled_prompt
* assumptions
* questions
* answers
* acceptance_criteria
* validation_commands
* quality_score
* created_at

compiled_prompt는 읽기 쉬운 Markdown preview 또는 preformatted text로 표시합니다.
assumptions, questions, answers가 JSON 문자열로 저장되어 있다면 안전하게 파싱해서 표시합니다.
파싱 실패 시 앱이 crash되지 않고 raw text 또는 fallback 메시지를 표시해야 합니다.

3. 현재 버전 지정
   사용자는 선택한 버전을 current version으로 지정할 수 있어야 합니다.

동작:

* “현재 버전으로 지정” 버튼을 추가합니다.
* 클릭 시 prompt_assets.current_version_id를 해당 version id로 업데이트합니다.
* 목록과 상세 UI가 즉시 갱신됩니다.
* current version badge를 표시합니다.
* 이미 current version이면 버튼을 비활성화하거나 “현재 버전”으로 표시합니다.

4. 기존 PromptAsset에 새 버전 추가
   새 컴파일 결과를 기존 PromptAsset의 새 PromptVersion으로 저장할 수 있어야 합니다.

동작 예시:

* 사용자가 기존 프롬프트를 선택합니다.
* 오른쪽 프롬프트 컴파일러에서 내용을 수정하거나 다시 컴파일합니다.
* “새 프롬프트로 저장”과 별도로 “선택한 프롬프트의 새 버전으로 저장” 옵션을 제공합니다.
* 새 버전 저장 시 prompt_asset_id는 기존 PromptAsset id를 사용합니다.
* version_number는 기존 최대 version_number + 1로 main process에서 계산합니다.
* 저장 후 새 버전을 current version으로 지정합니다.
* 프롬프트 상세와 버전 목록을 갱신합니다.

주의:

* version_number 계산은 renderer에서 하지 마세요.
* 같은 PromptAsset 안에서 version_number가 중복되지 않게 합니다.
* 가능한 경우 prompt_asset_id + version_number unique constraint를 추가합니다.
* schema 변경이 필요하면 migration을 작성합니다.

5. PromptAsset current version 표시 개선
   프롬프트 라이브러리 목록에서 각 PromptAsset은 current version 정보를 기반으로 preview를 보여줘야 합니다.

표시 예:

* title
* scenario
* target_agent
* updated_at
* current version number
* current compiled_prompt preview
* quality_score, 있으면 표시

current_version_id가 null이거나 깨진 경우:

* 가장 높은 version_number를 fallback으로 사용하거나
* 명확한 empty/error 상태를 표시합니다.
* 앱이 crash되면 안 됩니다.

6. 간단한 diff view
   두 PromptVersion을 선택하여 compiled_prompt 차이를 비교할 수 있어야 합니다.

MVP diff 요구사항:

* 완벽한 코드 diff 라이브러리가 필수는 아닙니다.
* 간단한 line-by-line diff로 충분합니다.
* 추가된 줄, 삭제된 줄, 변경되지 않은 줄을 구분합니다.
* 스타일은 기존 Tailwind UI와 어울리게 표시합니다.

UI 흐름:

* “버전 비교” 버튼 또는 탭을 추가합니다.
* 기준 버전과 비교 버전을 선택합니다.
* 기본값:

  * 기준 버전: current version
  * 비교 버전: 선택된 버전 또는 직전 버전
* compiled_prompt 기준으로 diff를 표시합니다.

가능하면 original_input diff도 볼 수 있게 해도 됩니다.
단, 범위가 커지면 compiled_prompt diff만 구현하세요.

7. 새 버전 생성 시 메타데이터 저장
   새 버전 저장 시 다음 값이 올바르게 저장되어야 합니다.

PromptVersion:

* prompt_asset_id
* version_number
* original_input
* compiled_prompt
* assumptions
* questions
* answers
* acceptance_criteria
* validation_commands
* quality_score
* created_at

PromptAsset:

* current_version_id
* updated_at

중요:

* PromptAsset의 title, scenario, target_agent는 기본적으로 유지합니다.
* 사용자가 새 컴파일 결과에서 title, scenario, target_agent를 바꾼 경우:

  * 단순 MVP에서는 기존 PromptAsset 값을 유지해도 됩니다.
  * 더 나은 구현이 가능하다면 “자산 메타데이터도 업데이트할지” 선택하게 해도 됩니다.
* 복잡해지면 이번 단계에서는 기존 PromptAsset 메타데이터 유지로 충분합니다.

8. IPC API 요구사항
   preload bridge에 필요한 API를 추가하거나 기존 API를 보완합니다.

권장 API:

* window.prompter.prompts.listVersions(promptAssetId)
* window.prompter.prompts.getVersion(versionId)
* window.prompter.prompts.createVersion(input)
* window.prompter.prompts.createNextVersion(input)
* window.prompter.prompts.setCurrentVersion(promptAssetId, versionId)
* window.prompter.prompts.getCurrentVersion(promptAssetId)
* window.prompter.prompts.compareVersions(baseVersionId, compareVersionId)

createNextVersion(input) 권장 입력:

* promptAssetId: string
* originalInput: string
* compiledPrompt: string
* assumptions?: string
* questions?: string
* answers?: string
* acceptanceCriteria?: string
* validationCommands?: string
* qualityScore?: number | null
* makeCurrent?: boolean

compareVersions는 main process에서 구현해도 되고 renderer utility로 구현해도 됩니다.
단, DB 접근은 main process에서만 해야 합니다.
이미 renderer가 두 version의 compiled_prompt를 가지고 있다면 diff 계산은 renderer에서 순수 함수로 처리해도 됩니다.

9. Zod schema 요구사항
   다음 schema를 정의하거나 보완합니다.

* ListPromptVersionsInput
* GetPromptVersionInput
* CreatePromptVersionInput
* CreateNextPromptVersionInput
* SetCurrentPromptVersionInput
* ComparePromptVersionsInput

검증 규칙:

* promptAssetId, versionId는 빈 문자열 불가
* originalInput은 빈 문자열 불가
* compiledPrompt는 빈 문자열 불가
* qualityScore는 null 또는 허용 범위 내 숫자
* makeCurrent는 boolean, 기본값 true

10. UI 요구사항
    기존 3단 레이아웃을 유지합니다.

중앙 패널:

* 프롬프트 카드에서 current version number를 표시합니다.
* 선택된 프롬프트를 시각적으로 구분합니다.

오른쪽 패널 또는 상세 패널:

* 선택된 PromptAsset의 상세 정보
* 현재 선택된 PromptVersion 상세
* 버전 목록
* 현재 버전 지정 버튼
* 새 버전으로 저장 버튼
* 버전 비교 UI

프롬프트 컴파일러와 상세 패널이 같은 오른쪽 영역을 공유한다면:

* 탭 구조를 사용해도 됩니다.

  * 컴파일러
  * 상세
  * 버전
  * 비교
* 또는 선택된 프롬프트가 있을 때 상세/버전 영역을 표시하고, 새 프롬프트 모드일 때 컴파일러를 표시해도 됩니다.

기존 UI 구조에 가장 자연스러운 방식을 선택하세요.

11. PromptCompilerPanel 연결
    Phase 5에서 생성된 LLM compiledPrompt를 기존 PromptAsset에 새 버전으로 저장할 수 있게 합니다.

저장 옵션:

* 새 프롬프트로 저장
* 선택한 프롬프트의 새 버전으로 저장

동작:

* 선택된 PromptAsset이 없으면 “새 프롬프트로 저장”만 가능하게 합니다.
* 선택된 PromptAsset이 있으면 “새 버전으로 저장”도 가능하게 합니다.
* 새 버전으로 저장한 경우 버전 목록을 갱신하고 새 버전을 선택합니다.
* 새 버전은 기본적으로 current version으로 지정합니다.

12. 삭제 기능에 대한 범위
    이번 단계에서 버전 삭제는 필수로 구현하지 마세요.

이유:

* current_version_id 처리
* 마지막 버전 삭제 처리
* 참조 무결성 처리
* UI 복구 흐름

이런 것들이 얽히면 Phase 6이 갑자기 작은 행정 재판소가 됩니다.
필요하다면 나중에 별도 Phase로 구현합니다.

이번 단계에서는 삭제 대신:

* 버전 선택
* 현재 버전 지정
* 새 버전 생성
* 버전 비교

이 네 가지에 집중합니다.

보안 요구사항:

* renderer에서 fs, path, better-sqlite3, drizzle, process에 접근하지 않습니다.
* renderer에서 ipcRenderer를 직접 사용하지 않습니다.
* DB 저장과 조회는 preload bridge를 통해서만 수행합니다.
* API Key나 secret 관련 로직을 새로 노출하지 않습니다.
* 프롬프트 실행 또는 외부 프로세스 실행 기능을 추가하지 않습니다.

테스트 / 확인 요구사항:

* 앱이 개발 모드에서 정상 실행되어야 합니다.
* TypeScript typecheck가 통과해야 합니다.
* 기존 프롬프트를 선택하면 version list가 표시되어야 합니다.
* 첫 번째 버전이 current version으로 표시되어야 합니다.
* 같은 PromptAsset에 새 버전을 추가할 수 있어야 합니다.
* 새 버전의 version_number가 이전 최대값 + 1이어야 합니다.
* 새 버전 저장 후 current_version_id가 새 버전으로 업데이트되어야 합니다.
* 사용자가 과거 버전을 current version으로 다시 지정할 수 있어야 합니다.
* current version 변경 후 프롬프트 목록 preview가 갱신되어야 합니다.
* 두 버전 간 compiled_prompt diff를 볼 수 있어야 합니다.
* 앱 재시작 후 version list와 current version 상태가 유지되어야 합니다.
* prompt_runs 또는 실행 결과 관련 데이터는 생성되지 않아야 합니다.

이번 단계에서 구현하지 말 것:

* 프롬프트 실행 기능
* 프롬프트 실행 결과 저장
* Codex CLI 실행
* Codex OAuth
* Claude Code 실행
* Cursor 실행
* prompt_runs, agent_runs, execution_results, validation_results, run_logs
* 검색 FTS
* 태그 필터 고도화
* AGENTS.md / SKILL.md export
* 클라우드 동기화
* 팀 협업
* 버전 삭제 기능

완료 기준:

* 하나의 PromptAsset이 여러 PromptVersion을 가질 수 있습니다.
* 버전 목록 UI가 구현되어 있습니다.
* 버전을 선택해 상세 내용을 볼 수 있습니다.
* current version을 지정할 수 있습니다.
* 새 컴파일 결과를 기존 PromptAsset의 새 버전으로 저장할 수 있습니다.
* 새 버전 저장 시 version_number가 main process에서 안전하게 계산됩니다.
* 새 버전 저장 후 current_version_id와 updated_at이 갱신됩니다.
* 프롬프트 목록은 current version 기반 preview를 보여줍니다.
* 두 버전 간 compiled_prompt diff를 볼 수 있습니다.
* 모든 IPC 입력값은 Zod로 검증됩니다.
* renderer는 DB에 직접 접근하지 않습니다.
* TypeScript 타입 검사가 통과합니다.
* 앱이 개발 모드에서 정상 실행됩니다.
* 프롬프트 실행이나 실행 결과 저장 기능은 추가되지 않았습니다.

작업 전:

1. 현재 Phase 0, Phase 1, Phase 2, Phase 3, Phase 4, Phase 9, Phase 5 코드 구조를 확인합니다.
2. prompt_assets와 prompt_versions schema를 확인합니다.
3. current_version_id 처리 방식과 기존 repository 함수를 확인합니다.
4. PromptCompilerPanel에서 저장 흐름이 어떻게 구현되어 있는지 확인합니다.
5. 선택된 PromptAsset 상태가 어디에서 관리되는지 확인합니다.
6. version_number 계산을 main process service에서 처리할 계획을 세웁니다.
7. 필요한 schema 변경과 migration 여부를 확인합니다.
8. 간결한 구현 계획을 세운 뒤 Phase 6만 구현합니다.

작업 후:

1. 변경된 내용을 요약합니다.
2. 생성되거나 수정된 파일 목록을 제공합니다.
3. schema 또는 migration 변경이 있다면 설명합니다.
4. 새 버전 생성과 current version 지정의 데이터 흐름을 설명합니다.
5. 앱 실행 및 타입 검사 명령어를 제공합니다.
6. 수동 테스트 절차를 제공합니다.
7. diff view 구현 방식을 설명합니다.
8. 아직 구현하지 않은 기능을 명확히 구분해서 설명합니다.

```



# Phase 7

```
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
* projects, prompt_assets, prompt_versions, tags, prompt_tags, settings 등 기본 테이블 구현

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

이 작업은 Phase 7: 검색 / 태그 / 프로젝트 분류입니다.

목표:
저장된 프롬프트를 빠르게 찾고 분류할 수 있도록 검색, 태그, 필터 기능을 구현합니다. 사용자는 키워드로 프롬프트를 검색하고, 프로젝트, 시나리오, 대상 에이전트, 태그 기준으로 필터링할 수 있어야 합니다. 또한 프롬프트에 태그를 추가하거나 제거하고, LLM compile 결과의 suggestedTags를 저장 과정에 반영할 수 있어야 합니다.

중요:
프롬프트 실행 기능을 추가하지 마세요.
Codex, Claude Code, Cursor 같은 외부 코딩 에이전트를 직접 실행하지 마세요.
프롬프트 실행 결과 저장 기능을 추가하지 마세요.
prompt_runs, agent_runs, execution_results, validation_results, run_logs를 만들거나 사용하지 마세요.
벡터 검색, 임베딩 검색, 클라우드 동기화는 구현하지 마세요.
이번 단계는 SQLite 기반 키워드 검색, 태그, 필터링에만 집중합니다.

아키텍처 요구사항:

* renderer는 DB에 직접 접근하면 안 됩니다.
* renderer는 preload bridge에 노출된 typed API만 사용해야 합니다.
* 검색 쿼리 실행은 Electron main process에서 처리합니다.
* 검색 입력값과 필터 입력값은 Zod로 검증합니다.
* 태그 생성, 연결, 해제는 main process repository/service를 통해 처리합니다.
* 검색 로직은 UI 컴포넌트에 직접 넣지 말고 search repository 또는 service로 분리합니다.
* 기존 prompt_assets, prompt_versions, tags, prompt_tags 구조를 최대한 활용합니다.
* current version 기준으로 검색 결과 preview를 보여줍니다.

이번 단계에서 구현할 주요 기능:

1. SQLite FTS 기반 검색

SQLite FTS5를 사용해 프롬프트 검색을 구현합니다.

검색 대상:

* prompt_assets.title
* prompt_versions.original_input
* prompt_versions.compiled_prompt
* prompt_versions.assumptions
* prompt_versions.acceptance_criteria
* prompt_versions.validation_commands

기본 원칙:

* 검색 결과는 PromptAsset 단위로 반환합니다.
* preview는 current version 기준으로 표시합니다.
* current_version_id가 없는 경우 가장 높은 version_number를 fallback으로 사용합니다.
* 검색어가 비어 있으면 필터 조건에 맞는 전체 목록을 반환합니다.
* 검색어가 있으면 FTS 검색 결과를 우선 사용합니다.

FTS 구현 방식:

* Drizzle schema로 표현하기 어렵다면 raw SQL migration을 사용해도 됩니다.
* 예시 테이블명:

  * prompt_search_fts
* FTS 테이블은 prompt version 단위로 인덱싱해도 됩니다.
* 검색 결과를 prompt_asset_id 기준으로 묶어 반환합니다.

FTS에 포함할 권장 컬럼:

* prompt_asset_id
* prompt_version_id
* title
* original_input
* compiled_prompt
* assumptions
* acceptance_criteria
* validation_commands

주의:

* FTS 테이블과 실제 prompt_versions 데이터가 동기화되어야 합니다.
* createPromptVersion 또는 createNextVersion 시 FTS 인덱스를 갱신합니다.
* prompt asset title이 변경되면 FTS title도 갱신합니다.
* 구현 범위를 줄이려면 초기에는 search service에서 rebuildSearchIndex()를 제공하고, 앱 시작 시 또는 개발용 버튼으로 전체 재색인을 수행해도 됩니다.
* 단, 최종적으로는 새 version 생성 시 검색 인덱스가 갱신되어야 합니다.

2. 검색 API 구현

preload bridge에 검색 API를 추가합니다.

권장 API:

* window.prompter.search.searchPrompts(input)
* window.prompter.search.rebuildIndex()

searchPrompts input 예시:

* query?: string
* projectId?: string | null
* tagIds?: string[]
* scenarios?: PromptScenario[]
* targetAgents?: TargetAgent[]
* limit?: number
* offset?: number
* sortBy?: "updated_at" | "created_at" | "relevance" | "title"
* sortDirection?: "asc" | "desc"

searchPrompts result 예시:

* items: PromptSearchResult[]
* total: number

PromptSearchResult 예시:

* promptAssetId: string
* currentVersionId: string | null
* title: string
* scenario: PromptScenario
* targetAgent: TargetAgent
* projectId: string | null
* projectName?: string | null
* versionNumber?: number | null
* compiledPromptPreview?: string
* originalInputPreview?: string
* matchedTextPreview?: string
* qualityScore?: number | null
* tags: Tag[]
* createdAt: number
* updatedAt: number

검색 결과는 중앙 프롬프트 라이브러리 패널에서 사용합니다.

3. 중앙 패널 검색 UI

중앙 프롬프트 라이브러리 패널 상단에 검색 입력창을 구현합니다.

요구사항:

* 검색어 입력
* 입력 후 debounce 적용
* Enter로 즉시 검색 가능
* 검색어 clear 버튼
* 검색 중 loading 상태 표시
* 검색 결과 없음 empty state 표시
* 검색 오류 error state 표시

검색어 debounce:

* 200ms에서 400ms 정도
* 과도하게 복잡한 debounce 훅을 만들 필요는 없습니다.
* 기존 훅 구조가 있다면 재사용합니다.

검색 결과 카드 표시:

* title
* scenario badge
* targetAgent badge
* project name
* current version number
* updatedAt
* tags
* compiledPromptPreview 또는 matchedTextPreview
* qualityScore가 있으면 표시

4. 필터 UI

검색 입력 주변 또는 사이드바/상단 영역에 필터 UI를 추가합니다.

필터 기준:

* 프로젝트
* 태그
* 시나리오
* 대상 에이전트

프로젝트 필터:

* 왼쪽 사이드바에서 프로젝트를 선택하면 해당 projectId 필터가 적용됩니다.
* “전체 프로젝트” 선택을 제공하면 좋습니다.
* 기존 selectedProject 상태와 충돌하지 않게 설계합니다.

태그 필터:

* 하나 이상의 태그를 선택할 수 있습니다.
* 선택된 태그가 있는 경우 해당 태그가 붙은 프롬프트만 표시합니다.
* MVP에서는 AND 조건 또는 OR 조건 중 하나를 선택해 구현합니다.
* 더 단순한 구현을 원하면 OR 조건으로 시작합니다.
* 선택한 방식은 코드 주석 또는 작업 후 설명에 명확히 적습니다.

시나리오 필터:

* feature
* bugfix
* refactor
* code_review
* docs
* research

대상 에이전트 필터:

* codex
* claude_code
* cursor
* generic_agent

필터 UI 요구사항:

* 선택된 필터를 badge/chip 형태로 표시합니다.
* 개별 필터 제거가 가능해야 합니다.
* 전체 필터 초기화 버튼을 제공합니다.
* 필터 변경 시 검색 결과가 갱신되어야 합니다.

5. 태그 목록 및 태그 관리 UI

왼쪽 사이드바의 태그 섹션을 실제 DB와 연결합니다.

기능:

* 전체 태그 목록 표시
* 태그별 프롬프트 개수 표시, 가능하면 구현
* 새 태그 생성
* 태그 이름 수정, 가능하면 구현
* 태그 삭제, 가능하면 구현

범위 조정:

* 태그 삭제는 참조된 prompt_tags 처리 때문에 복잡해질 수 있습니다.
* 가능하면 cascade delete 또는 service 계층에서 prompt_tags 연결 제거 후 삭제를 처리합니다.
* 범위가 커지면 이번 단계에서는 태그 생성과 목록 표시까지만 필수로 구현하고, 수정/삭제는 간단히 가능한 경우에만 구현합니다.

태그 이름 규칙:

* 빈 문자열 금지
* 앞뒤 공백 trim
* 같은 이름 중복 금지
* 대소문자 중복 처리 방식은 명확히 정합니다.

  * 예: “Swift”와 “swift”를 같은 태그로 취급
  * 또는 DB unique 기준만 따름
* 가능하면 소문자 normalizedName을 내부적으로 사용하거나 service에서 중복을 방지합니다.

6. 프롬프트 상세 화면의 태그 연결/해제

선택된 PromptAsset 상세 영역에서 태그를 관리할 수 있게 합니다.

기능:

* 현재 프롬프트에 연결된 태그 표시
* 기존 태그 검색/선택 후 연결
* 새 태그 생성 후 즉시 연결
* 연결된 태그 제거

요구사항:

* attachTagToPrompt(promptAssetId, tagId)
* detachTagFromPrompt(promptAssetId, tagId)
* 중복 연결을 방지합니다.
* 태그 변경 후 프롬프트 목록과 상세 UI를 갱신합니다.
* 태그 변경 후 검색/필터 결과도 일관되게 갱신합니다.

7. LLM suggestedTags 저장 연결

Phase 5의 LLM compile 결과에 suggestedTags가 있다면 저장 흐름에 반영합니다.

동작:

* compile 결과 preview 근처에 suggestedTags를 표시합니다.
* 사용자는 suggestedTags를 저장 전에 선택/해제할 수 있습니다.
* 저장 시 선택된 suggestedTags를 tags 테이블에 생성하거나 기존 태그를 재사용합니다.
* 저장된 PromptAsset에 해당 태그들을 연결합니다.

새 프롬프트 저장:

* PromptAsset + PromptVersion 생성
* selected suggestedTags 생성/연결

기존 프롬프트 새 버전 저장:

* PromptVersion 생성
* PromptAsset에 selected suggestedTags 연결
* 기존 태그는 유지합니다.
* 사용자가 명시적으로 제거하지 않는 한 기존 태그를 지우지 마세요.

정적 템플릿 컴파일 결과에는 suggestedTags가 없을 수 있습니다.
이 경우 사용자가 수동으로 태그를 추가할 수 있으면 됩니다.

8. 프로젝트 분류 개선

프로젝트별 프롬프트 분류 경험을 개선합니다.

기능:

* 왼쪽 사이드바의 프로젝트 선택이 검색 필터와 연동됩니다.
* 전체 프로젝트 보기 지원
* 선택된 프로젝트 이름을 중앙 패널 상단에 표시
* 새 프롬프트 저장 시 현재 선택된 프로젝트를 기본 project_id로 사용
* 설정의 default_project_id가 있으면 초기 선택에 반영, 가능하면 구현

프로젝트가 없는 경우:

* “새 프로젝트를 먼저 만드세요” 안내
* 또는 project_id 없이 프롬프트 저장 가능
* 기존 앱 흐름에 맞춰 하나를 선택하세요.

9. 검색 결과와 일반 목록의 통합

중앙 패널은 다음 조건에 따라 목록을 표시해야 합니다.

* 검색어 없음 + 필터 없음:

  * 선택된 프로젝트 또는 전체 프로젝트의 기본 프롬프트 목록 표시

* 검색어 있음:

  * searchPrompts 결과 표시

* 필터 있음:

  * 필터 적용 결과 표시

* 검색어 + 필터 모두 있음:

  * 검색어와 필터를 모두 반영한 결과 표시

중요:

* 검색어가 없는 기본 목록과 검색 결과 UI가 너무 다르게 동작하지 않게 합니다.
* 가능하면 중앙 목록은 하나의 PromptList 컴포넌트를 재사용합니다.
* 기존 listPromptAssets API를 유지하되, 검색/필터가 필요한 경우 searchPrompts API를 사용합니다.
* 단순화를 위해 중앙 목록을 전부 searchPrompts 기반으로 바꿔도 됩니다.

10. 검색 인덱스 재생성

개발과 유지보수를 위해 검색 인덱스 재생성 기능을 제공합니다.

기능:

* main process search service에 rebuildSearchIndex() 구현
* 모든 prompt_assets와 prompt_versions를 읽어 FTS 테이블을 재구성
* Settings 또는 개발용 메뉴에서 호출 가능하면 좋음
* UI 연결이 범위를 키운다면 IPC만 구현하고 작업 후 호출 방법을 설명합니다.

주의:

* rebuild 중 기존 FTS 데이터를 안전하게 삭제하고 다시 생성합니다.
* 실패 시 명확한 에러를 반환합니다.
* 앱 전체가 crash되지 않아야 합니다.

11. IPC API 요구사항

preload bridge에 필요한 API를 추가하거나 기존 API를 보완합니다.

Search:

* window.prompter.search.searchPrompts(input)
* window.prompter.search.rebuildIndex()

Tags:

* window.prompter.tags.create(input)
* window.prompter.tags.list()
* window.prompter.tags.update(id, input)
* window.prompter.tags.delete(id)
* window.prompter.tags.attachToPrompt(promptAssetId, tagId)
* window.prompter.tags.detachFromPrompt(promptAssetId, tagId)
* window.prompter.tags.listForPrompt(promptAssetId)
* window.prompter.tags.createAndAttachToPrompt(input)

createAndAttachToPrompt input 예시:

* promptAssetId: string
* tagName: string

가능하다면 추가:

* window.prompter.tags.listWithCounts()

Prompts:

* 기존 listAssets가 필터를 받지 못한다면 filter 지원을 추가해도 됩니다.
* 단, 검색과 필터는 searchPrompts로 처리하는 편이 더 일관적입니다.

12. Zod schema 요구사항

다음 schema를 정의하거나 보완합니다.

* SearchPromptsInput
* SearchPromptsResult
* CreateTagInput
* UpdateTagInput
* AttachTagToPromptInput
* DetachTagFromPromptInput
* CreateAndAttachTagInput
* ListTagsForPromptInput

검증 규칙:

* query는 optional string, trim 처리
* limit은 1 이상, 최대 100 정도로 제한
* offset은 0 이상
* tagIds는 string array
* scenarios는 허용된 PromptScenario 배열
* targetAgents는 허용된 TargetAgent 배열
* projectId는 string 또는 null
* tagName은 빈 문자열 불가, trim 처리
* promptAssetId와 tagId는 빈 문자열 불가

13. UI 상태 요구사항

검색/태그/필터 UI는 다음 상태를 처리해야 합니다.

* loading
* error
* empty
* saving
* deleting
* no tags
* no search results
* invalid tag name
* duplicate tag

사용자에게 표시할 메시지는 간결하고 구체적이어야 합니다.
예:

* “검색 결과가 없습니다.”
* “이미 존재하는 태그입니다.”
* “태그를 추가하지 못했습니다.”
* “검색 인덱스를 갱신하지 못했습니다.”

14. 성능 요구사항

MVP 수준에서 과하게 최적화하지 마세요.
그래도 다음은 지킵니다.

* 검색 입력은 debounce 처리합니다.
* 검색 결과 limit을 둡니다.
* 대량 데이터를 한 번에 renderer로 보내지 않습니다.
* preview 텍스트는 main process 또는 search service에서 적당히 잘라 반환합니다.
* 태그 목록은 필요할 때만 갱신하거나 변경 후 다시 로드합니다.

15. 데이터 일관성 요구사항

다음 상황에서 UI와 DB 상태가 일관되어야 합니다.

* 새 프롬프트 저장 후 검색 가능해야 합니다.
* 기존 프롬프트에 새 버전 저장 후 검색 인덱스가 갱신되어야 합니다.
* 프롬프트 제목 변경 시 검색 결과 title도 갱신되어야 합니다.
* 태그 추가 후 필터에서 즉시 사용 가능해야 합니다.
* 태그 연결/해제 후 프롬프트 카드와 상세 화면이 갱신되어야 합니다.
* 앱 재시작 후 태그와 검색 결과가 유지되어야 합니다.

보안 요구사항:

* renderer에서 fs, path, better-sqlite3, drizzle, process에 접근하지 않습니다.
* renderer에서 ipcRenderer를 직접 사용하지 않습니다.
* DB 검색과 태그 변경은 preload bridge를 통해서만 수행합니다.
* 검색어를 SQL 문자열에 직접 이어붙이지 마세요.
* FTS query를 구성할 때 injection이나 특수문자 오류에 주의합니다.
* 검색어에 따옴표, 특수문자, 한글, 공백이 있어도 앱이 crash되지 않아야 합니다.
* API Key나 secret 관련 로직을 새로 노출하지 않습니다.
* 프롬프트 실행 또는 외부 프로세스 실행 기능을 추가하지 않습니다.

테스트 / 확인 요구사항:

* 앱이 개발 모드에서 정상 실행되어야 합니다.
* TypeScript typecheck가 통과해야 합니다.
* 검색어로 prompt title을 검색할 수 있어야 합니다.
* 검색어로 original_input을 검색할 수 있어야 합니다.
* 검색어로 compiled_prompt를 검색할 수 있어야 합니다.
* 프로젝트 필터가 동작해야 합니다.
* 시나리오 필터가 동작해야 합니다.
* 대상 에이전트 필터가 동작해야 합니다.
* 태그 필터가 동작해야 합니다.
* 태그를 생성할 수 있어야 합니다.
* 프롬프트에 태그를 연결할 수 있어야 합니다.
* 프롬프트에서 태그를 제거할 수 있어야 합니다.
* LLM suggestedTags를 저장 시 선택적으로 연결할 수 있어야 합니다.
* 새 프롬프트 저장 후 검색 결과에 나타나야 합니다.
* 기존 프롬프트에 새 버전 저장 후 검색 결과가 최신 내용을 반영해야 합니다.
* 검색어에 특수문자나 한글이 있어도 앱이 crash되지 않아야 합니다.
* 앱 재시작 후 태그와 검색 기능이 유지되어야 합니다.
* prompt_runs 또는 실행 결과 관련 데이터는 생성되지 않아야 합니다.

이번 단계에서 구현하지 말 것:

* 프롬프트 실행 기능
* 프롬프트 실행 결과 저장
* Codex CLI 실행
* Codex OAuth
* Claude Code 실행
* Cursor 실행
* prompt_runs, agent_runs, execution_results, validation_results, run_logs
* 벡터 검색
* 임베딩 생성
* 클라우드 동기화
* 팀 협업
* AGENTS.md / SKILL.md export
* 고급 검색 쿼리 문법 UI
* 태그 색상 커스터마이징, 범위가 커지면 제외

완료 기준:

* SQLite FTS 기반 검색이 구현되어 있습니다.
* 중앙 프롬프트 라이브러리에서 키워드 검색이 가능합니다.
* 프로젝트, 태그, 시나리오, 대상 에이전트 필터가 동작합니다.
* 태그 목록을 실제 DB에서 불러옵니다.
* 새 태그를 생성할 수 있습니다.
* 프롬프트에 태그를 연결하거나 제거할 수 있습니다.
* LLM suggestedTags를 저장 과정에서 선택적으로 연결할 수 있습니다.
* 검색 결과는 current version 기준 preview를 표시합니다.
* 새 PromptVersion 생성 시 검색 인덱스가 갱신됩니다.
* 검색 인덱스 재생성 기능이 main process에 구현되어 있습니다.
* 모든 IPC 입력값은 Zod로 검증됩니다.
* renderer는 DB에 직접 접근하지 않습니다.
* TypeScript 타입 검사가 통과합니다.
* 앱이 개발 모드에서 정상 실행됩니다.
* 프롬프트 실행이나 실행 결과 저장 기능은 추가되지 않았습니다.

작업 전:

1. 현재 Phase 0, Phase 1, Phase 2, Phase 3, Phase 4, Phase 9, Phase 5, Phase 6 코드 구조를 확인합니다.
2. prompt_assets, prompt_versions, tags, prompt_tags schema를 확인합니다.
3. 기존 tag repository와 prompt repository 구현을 확인합니다.
4. current_version_id와 version list 조회 흐름을 확인합니다.
5. PromptCompilerPanel에서 suggestedTags가 어떤 형태로 반환되는지 확인합니다.
6. 중앙 PromptLibraryPanel의 목록 표시 흐름을 확인합니다.
7. FTS 구현에 schema migration이 필요한지 확인합니다.
8. 검색 결과를 PromptAsset 단위로 반환하는 계획을 세웁니다.
9. 간결한 구현 계획을 세운 뒤 Phase 7만 구현합니다.

작업 후:

1. 변경된 내용을 요약합니다.
2. 생성되거나 수정된 파일 목록을 제공합니다.
3. schema 또는 migration 변경이 있다면 설명합니다.
4. FTS 검색 인덱스 구조와 갱신 방식을 설명합니다.
5. searchPrompts 입력/출력 구조를 설명합니다.
6. 태그 생성, 연결, 해제의 데이터 흐름을 설명합니다.
7. LLM suggestedTags가 저장 흐름에 어떻게 반영되는지 설명합니다.
8. 앱 실행 및 타입 검사 명령어를 제공합니다.
9. 수동 테스트 절차를 제공합니다.
10. 검색어 특수문자 처리 방식과 제한 사항을 설명합니다.
11. 아직 구현하지 않은 기능을 명확히 구분해서 설명합니다.

```



# Phase 8

```
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

이 작업은 Phase 8: Export / Copy 기능입니다.

목표:
선택된 PromptVersion 또는 현재 컴파일된 프롬프트를 외부 코딩 에이전트에 바로 사용할 수 있는 형식으로 복사하거나 파일로 내보낼 수 있게 만듭니다. 지원 대상은 Markdown, Codex, Claude Code, Cursor, Generic Agent, AGENTS.md snippet, SKILL.md draft입니다.

중요:
프롬프트 실행 기능을 추가하지 마세요.
Codex, Claude Code, Cursor 같은 외부 코딩 에이전트를 직접 실행하지 마세요.
Codex CLI를 호출하지 마세요.
Claude Code CLI를 호출하지 마세요.
Cursor를 자동 실행하지 마세요.
프롬프트 실행 결과 저장 기능을 추가하지 마세요.
prompt_runs, agent_runs, execution_results, validation_results, run_logs를 만들거나 사용하지 마세요.
이번 단계는 “복사”와 “파일 내보내기”만 구현합니다.

아키텍처 요구사항:

* renderer는 DB, 파일시스템, shell, process에 직접 접근하면 안 됩니다.
* 파일 저장 다이얼로그와 파일 쓰기는 Electron main process에서 처리합니다.
* renderer는 preload bridge에 노출된 typed export API만 사용해야 합니다.
* 클립보드 복사는 navigator.clipboard를 우선 사용해도 됩니다.
* Electron clipboard API가 필요하다면 main/preload를 통해 최소 API만 노출합니다.
* export 포맷 변환 로직은 UI 컴포넌트에 직접 넣지 말고 별도 formatter/service로 분리합니다.
* export formatter는 가능하면 순수 함수로 작성합니다.
* 모든 IPC 입력값은 Zod로 검증합니다.
* 선택된 PromptVersion 기준으로 export해야 합니다.
* current version이 선택되어 있으면 current version을 기본 export 대상으로 사용합니다.

이번 단계에서 구현할 주요 기능:

1. Export format 정의

다음 export format을 지원합니다.

* markdown
* codex
* claude_code
* cursor
* generic_agent
* agents_md
* skill_md

각 format은 UI에서 사람이 읽기 좋은 이름으로 표시합니다.

라벨 예시:

* markdown: Markdown Prompt
* codex: Codex Prompt
* claude_code: Claude Code Prompt
* cursor: Cursor Prompt
* generic_agent: Generic Agent Prompt
* agents_md: AGENTS.md Snippet
* skill_md: SKILL.md Draft

2. 공통 Export 데이터 모델

export formatter는 다음 입력을 받을 수 있어야 합니다.

ExportPromptInput:

* promptAssetId?: string
* promptVersionId: string
* title: string
* scenario: PromptScenario
* targetAgent: TargetAgent
* originalInput: string
* compiledPrompt: string
* assumptions?: string[]
* questions?: ClarificationQuestion[]
* answers?: ClarificationAnswer[]
* acceptanceCriteria?: string[]
* validationCommands?: string[]
* tags?: Tag[]
* projectName?: string | null
* qualityScore?: number | null
* createdAt?: number
* updatedAt?: number
* format: ExportFormat

ExportPromptResult:

* format: ExportFormat
* filename: string
* content: string
* mimeType: string

3. Markdown Prompt export

Markdown export는 가장 원본에 가까운 형태로 내보냅니다.

포함할 내용:

* 제목
* 프로젝트 이름, 있으면
* 시나리오
* 대상 에이전트
* 태그
* quality score
* original input
* compiled prompt
* assumptions
* clarification questions and answers
* acceptance criteria
* validation commands

권장 구조:

# {title}

## Metadata

* Project:
* Scenario:
* Target Agent:
* Tags:
* Quality Score:

## Original Input

## Compiled Prompt

## Assumptions

## Clarification

## Acceptance Criteria

## Validation Commands

4. Codex Prompt export

Codex용 export는 compiledPrompt를 중심으로 하되, 코딩 에이전트가 저장소에서 작업할 것을 전제로 합니다.

추가 지침:

* 저장소 구조를 먼저 확인하라고 지시
* 변경 전 간단한 계획을 세우라고 지시
* 작은 변경 단위를 선호하라고 지시
* 테스트, 타입 검사, 빌드 결과를 최종 응답에 포함하라고 지시
* 불필요한 리팩터링 금지
* prompt execution result 저장 금지 문구 유지

Codex export는 너무 많은 metadata를 앞에 붙여 모델의 주의를 흐리지 않게 합니다.
핵심 compiledPrompt를 가장 중요하게 배치하세요.

5. Claude Code Prompt export

Claude Code용 export는 계획, 변경 요약, 검증 결과, 가정 분리를 강조합니다.

추가 지침:

* 작업 전 계획을 간결히 작성
* assumptions를 명확히 분리
* 변경 파일 목록을 최종 응답에 포함
* 검증 결과를 별도 섹션에 포함
* 기존 아키텍처 경계를 유지
* 불확실한 부분은 임의 구현하지 않고 명시

6. Cursor Prompt export

Cursor용 export는 파일 편집 맥락을 잘 잡도록 작성합니다.

추가 지침:

* 먼저 수정할 파일 후보를 식별
* 인접 코드 스타일을 따름
* 변경 범위를 작게 유지
* 대규모 rewrite 금지
* 사용자가 붙여넣기 후 바로 작업을 시작할 수 있게 구체적인 Task 중심으로 구성

7. Generic Agent Prompt export

Generic Agent용 export는 특정 도구나 CLI에 의존하지 않는 범용 형식으로 작성합니다.

추가 지침:

* 먼저 맥락을 확인
* 작업 계획 작성
* 작업 범위 유지
* 결과 요약과 검증 방법 반환
* 특정 에이전트 전용 명령이나 용어는 피함

8. AGENTS.md snippet export

AGENTS.md snippet은 프로젝트 수준 지침으로 재사용할 수 있는 짧은 규칙 블록을 생성합니다.

요구사항:

* 전체 compiledPrompt를 그대로 넣지 마세요.
* 반복적으로 유용한 지침만 추출하거나 재구성합니다.
* 특정 일회성 작업 지시보다는 프로젝트/에이전트 작업 원칙 중심으로 작성합니다.
* 너무 길지 않게 유지합니다.

권장 구조:

# Prompter Agent Instructions

## Project Context

...

## General Working Rules

* Inspect relevant files before editing.
* Keep changes small and reviewable.
* Preserve existing architecture boundaries.
* Do not introduce unrelated refactors.
* Include validation results in the final response.

## Prompt Workflow Rules

...

## Out of Scope

* Do not store prompt execution results.
* Do not add agent run history unless explicitly requested.

주의:

* AGENTS.md snippet은 기존 파일에 자동 삽입하지 않습니다.
* 이번 단계에서는 snippet을 복사하거나 파일로 저장만 합니다.
* 실제 프로젝트 파일에 자동 병합하지 마세요.

9. SKILL.md draft export

SKILL.md draft는 Codex Skill 또는 유사한 재사용 가능한 작업 지침 초안으로 작성합니다.

요구사항:

* Skill 이름
* 설명
* 사용해야 하는 상황
* 작업 절차
* 입력값
* 출력 형식
* 주의사항
* 검증 기준

권장 구조:

---

name: generated-skill-name
description: Use this skill when ...
------------------------------------

# Skill Purpose

# When to Use

# Inputs

# Workflow

# Output Format

# Validation

# Constraints

주의:

* skill 이름은 title 또는 tags를 기반으로 slug 형태로 생성합니다.
* description은 너무 길지 않게 작성합니다.
* 일회성 prompt를 그대로 SKILL.md로 복사하지 마세요.
* 반복 가능한 workflow로 재구성합니다.
* scripts, references, assets 디렉터리는 이번 단계에서 생성하지 않아도 됩니다.
* 이번 단계에서는 SKILL.md 단일 파일 초안만 생성합니다.

10. Copy 기능

선택된 PromptVersion 또는 현재 compiled prompt preview에서 복사 기능을 제공합니다.

필수 복사 기능:

* Copy compiled prompt
* Copy as Codex prompt
* Copy as Claude Code prompt
* Copy as Cursor prompt
* Copy as Markdown

선택 복사 기능:

* Copy AGENTS.md snippet
* Copy SKILL.md draft

요구사항:

* 복사 성공 메시지를 표시합니다.
* 복사 실패 메시지를 표시합니다.
* 복사할 내용이 없으면 버튼을 비활성화하거나 안내 메시지를 표시합니다.
* 복사 시 전체 API Key, secret, 내부 DB 경로 등이 포함되지 않아야 합니다.
* renderer에서 navigator.clipboard를 사용할 수 있으면 사용합니다.
* Electron clipboard bridge를 사용할 경우 최소한의 copyText(text) API만 노출합니다.

11. File export 기능

파일로 내보내기를 구현합니다.

요구사항:

* Electron main process에서 save dialog를 엽니다.
* renderer는 파일 경로를 직접 다루지 않습니다.
* 사용자가 저장 위치와 파일명을 선택할 수 있어야 합니다.
* 기본 파일명을 format에 맞게 제안합니다.
* 사용자가 취소하면 에러가 아니라 cancelled 상태로 처리합니다.
* 저장 성공 시 성공 메시지를 표시합니다.
* 저장 실패 시 명확한 에러 메시지를 표시합니다.

권장 기본 파일명:

* markdown: {slug-title}.md
* codex: {slug-title}.codex.md
* claude_code: {slug-title}.claude.md
* cursor: {slug-title}.cursor.md
* generic_agent: {slug-title}.agent.md
* agents_md: AGENTS.snippet.md
* skill_md: SKILL.md

파일명 생성 규칙:

* title을 slug로 변환
* 공백은 하이픈 처리
* 특수문자 제거 또는 안전 문자로 대체
* 너무 긴 파일명은 자르기
* title이 없으면 prompt-{timestamp}.md 사용

12. Export IPC API 요구사항

preload bridge에 다음 API를 추가합니다.

권장 API:

* window.prompter.exports.formatPrompt(input)
* window.prompter.exports.savePromptToFile(input)
* window.prompter.clipboard.copyText(input)

formatPrompt(input):

* renderer가 특정 format의 preview를 보고 싶을 때 사용
* pure formatter를 renderer에서 직접 사용해도 되지만, selected prompt version의 DB 조회까지 포함한다면 main process에서 처리

savePromptToFile(input):

* promptVersionId
* format
* optional filename
* optional content, 이미 renderer에서 포맷된 경우
* main process에서 content를 생성하거나 전달받은 content를 저장

copyText(input):

* text: string

중요:

* 파일 저장은 main process에서만 수행합니다.
* renderer가 fs.writeFile을 직접 호출하지 않습니다.
* shell.openPath, external app 실행 같은 기능은 이번 단계에서 추가하지 않습니다.

13. Export formatter 요구사항

formatter는 다음처럼 분리합니다.

권장 파일 구조:

* src/shared/export/exportTypes.ts
* src/shared/export/formatMarkdownPrompt.ts
* src/shared/export/formatCodexPrompt.ts
* src/shared/export/formatClaudeCodePrompt.ts
* src/shared/export/formatCursorPrompt.ts
* src/shared/export/formatGenericAgentPrompt.ts
* src/shared/export/formatAgentsMdSnippet.ts
* src/shared/export/formatSkillMdDraft.ts
* src/shared/export/formatPromptForExport.ts
* src/shared/export/slugifyFilename.ts

main process에서만 써야 할 파일 저장 로직:

* src/main/services/export/exportService.ts
* src/main/ipc/exports.ts
* src/main/ipc/clipboard.ts, 필요한 경우

renderer UI:

* src/renderer/components/export/ExportMenu.tsx
* src/renderer/components/export/ExportDialog.tsx
* src/renderer/components/export/ExportPreview.tsx
* src/renderer/components/prompt/PromptActions.tsx

정확한 파일명은 기존 프로젝트 구조에 맞춰 조정해도 됩니다.
단, formatter와 UI를 한 파일에 뒤섞지 마세요.

14. Export UI 요구사항

선택된 프롬프트 상세 또는 버전 상세 영역에 export/copy 액션을 추가합니다.

필수 UI:

* Copy 버튼
* Export 버튼 또는 Dropdown menu
* Export format 선택
* Preview, 가능하면 구현
* Save to file 버튼

권장 흐름:

1. 사용자가 PromptAsset과 PromptVersion을 선택합니다.
2. 상세 패널에서 Export 메뉴를 엽니다.
3. format을 선택합니다.
4. preview가 표시됩니다.
5. Copy 또는 Save to file을 선택합니다.
6. 성공/실패 메시지를 표시합니다.

컴파일러 preview 영역에도 복사 기능을 추가합니다.

* 아직 저장하지 않은 generated prompt도 Copy 가능해야 합니다.
* 아직 저장하지 않은 generated prompt의 파일 export는 가능하면 지원합니다.
* 다만 저장되지 않은 prompt export가 범위를 키운다면, 이번 단계에서는 저장된 PromptVersion export를 우선 구현합니다.

15. 현재 버전과 선택 버전 처리

Export 대상 결정 규칙:

* 사용자가 특정 PromptVersion을 선택한 경우 그 버전을 export합니다.
* 선택된 버전이 없고 PromptAsset이 선택된 경우 current version을 export합니다.
* current version이 없으면 가장 높은 version_number를 fallback으로 사용합니다.
* export 가능한 version이 없으면 버튼을 비활성화하고 안내 메시지를 표시합니다.

16. 태그와 메타데이터 포함

Export formatter는 tags와 project 정보를 가능하면 포함합니다.

단, agent-specific prompt에서는 metadata를 과하게 앞에 붙이지 마세요.

* Markdown export: metadata 풍부하게 포함
* Codex/Claude/Cursor export: 실행에 필요한 정보 중심
* AGENTS.md/SKILL.md: 재사용 가능한 지침 중심

17. 보안 요구사항

* API Key를 export content에 포함하지 마세요.
* secret storage 경로를 export content에 포함하지 마세요.
* DB 파일 경로를 export content에 포함하지 마세요.
* 내부 IPC 채널명이나 구현 세부사항을 불필요하게 노출하지 마세요.
* renderer에서 fs, path, process, shell에 직접 접근하지 않습니다.
* renderer에서 ipcRenderer를 직접 사용하지 않습니다.
* 파일 쓰기는 main process에서만 수행합니다.
* 프롬프트 실행 또는 외부 프로세스 실행 기능을 추가하지 않습니다.

18. Zod schema 요구사항

다음 schema를 정의하거나 보완합니다.

* ExportFormatSchema
* FormatPromptForExportInputSchema
* SavePromptToFileInputSchema
* CopyTextInputSchema

검증 규칙:

* format은 허용된 ExportFormat 중 하나
* promptVersionId는 저장된 prompt export의 경우 필수
* text는 copyText에서 빈 문자열 불가
* content는 savePromptToFile에서 직접 전달되는 경우 빈 문자열 불가
* filename은 optional이지만, 있으면 안전한 문자열인지 검증
* export format이 skill_md이면 기본 filename은 SKILL.md
* export format이 agents_md이면 기본 filename은 AGENTS.snippet.md 또는 AGENTS.md를 제안하되, 자동 덮어쓰기는 하지 않음

19. 에러 처리 요구사항

처리할 상황:

* PromptVersion이 존재하지 않음
* current version이 없음
* export content 생성 실패
* 파일 저장 다이얼로그 취소
* 파일 쓰기 실패
* clipboard 복사 실패
* 잘못된 export format
* formatter가 빈 content를 생성함

에러 메시지는 사용자에게 다음 행동을 알려야 합니다.
예:

* “내보낼 프롬프트 버전을 선택하세요.”
* “파일 저장이 취소되었습니다.”
* “파일을 저장하지 못했습니다.”
* “복사할 내용이 없습니다.”

20. 테스트 / 확인 요구사항

* 앱이 개발 모드에서 정상 실행되어야 합니다.
* TypeScript typecheck가 통과해야 합니다.
* 선택된 PromptVersion을 Markdown 형식으로 복사할 수 있어야 합니다.
* 선택된 PromptVersion을 Codex 형식으로 복사할 수 있어야 합니다.
* 선택된 PromptVersion을 Claude Code 형식으로 복사할 수 있어야 합니다.
* 선택된 PromptVersion을 Cursor 형식으로 복사할 수 있어야 합니다.
* AGENTS.md snippet을 생성하고 복사할 수 있어야 합니다.
* SKILL.md draft를 생성하고 복사할 수 있어야 합니다.
* Markdown 파일로 저장할 수 있어야 합니다.
* Codex/Claude/Cursor 형식 파일로 저장할 수 있어야 합니다.
* SKILL.md 파일로 저장할 수 있어야 합니다.
* 파일 저장 취소 시 앱이 에러 상태로 망가지지 않아야 합니다.
* export content에 API Key 또는 secret 정보가 포함되지 않아야 합니다.
* renderer가 파일시스템에 직접 접근하지 않아야 합니다.
* 프롬프트 실행 또는 실행 결과 저장 관련 데이터는 생성되지 않아야 합니다.

이번 단계에서 구현하지 말 것:

* 프롬프트 실행 기능
* Codex CLI 실행
* Codex OAuth
* Claude Code 실행
* Cursor 실행
* 외부 앱 자동 열기
* prompt_runs, agent_runs, execution_results, validation_results, run_logs
* AGENTS.md 기존 파일 자동 수정
* SKILL 디렉터리 전체 생성
* scripts/references/assets 자동 생성
* 클라우드 동기화
* 팀 협업
* export history 저장
* 실행 결과 저장

완료 기준:

* 선택된 PromptVersion을 여러 format으로 변환할 수 있습니다.
* Markdown, Codex, Claude Code, Cursor, Generic Agent export가 동작합니다.
* AGENTS.md snippet export가 동작합니다.
* SKILL.md draft export가 동작합니다.
* export content를 클립보드에 복사할 수 있습니다.
* export content를 파일로 저장할 수 있습니다.
* 파일 저장은 Electron main process에서 처리됩니다.
* formatter 로직은 UI와 분리되어 있습니다.
* 모든 IPC 입력값은 Zod로 검증됩니다.
* renderer는 DB, 파일시스템, shell, process에 직접 접근하지 않습니다.
* API Key와 secret 정보가 export content에 포함되지 않습니다.
* TypeScript 타입 검사가 통과합니다.
* 앱이 개발 모드에서 정상 실행됩니다.
* 프롬프트 실행이나 실행 결과 저장 기능은 추가되지 않았습니다.

작업 전:

1. 현재 Phase 0, Phase 1, Phase 2, Phase 3, Phase 4, Phase 9, Phase 5, Phase 6, Phase 7 코드 구조를 확인합니다.
2. PromptAsset, PromptVersion, Tag, Project 조회 흐름을 확인합니다.
3. current version 선택 로직을 확인합니다.
4. Prompt detail 또는 version detail UI에서 action 버튼을 추가할 위치를 확인합니다.
5. preload bridge와 IPC handler 구조를 확인합니다.
6. 파일 저장 다이얼로그를 main process에서 처리할 계획을 세웁니다.
7. export formatter를 shared pure function으로 분리할 계획을 세웁니다.
8. 간결한 구현 계획을 세운 뒤 Phase 8만 구현합니다.

작업 후:

1. 변경된 내용을 요약합니다.
2. 생성되거나 수정된 파일 목록을 제공합니다.
3. 추가한 패키지가 있다면 목록을 제공합니다.
4. export format별 formatter 구조를 설명합니다.
5. copy와 file export의 데이터 흐름을 설명합니다.
6. 파일 저장이 main process에서만 처리되는지 설명합니다.
7. export content에 secret이 포함되지 않도록 한 방식을 설명합니다.
8. 앱 실행 및 타입 검사 명령어를 제공합니다.
9. 수동 테스트 절차를 제공합니다.
10. 아직 구현하지 않은 기능을 명확히 구분해서 설명합니다.

```



# Phase 9

```
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

  * 왼쪽 사이드바
  * 중앙 프롬프트 라이브러리
  * 오른쪽 프롬프트 컴파일러
* 재사용 가능한 기본 UI 컴포넌트

Phase 2:

* SQLite + Drizzle ORM + better-sqlite3 기반 로컬 DB
* DB는 Electron main process에서만 접근
* renderer는 typed IPC를 통해서만 DB 기능 호출
* Zod 기반 IPC 입력값 검증
* settings 테이블 포함

Phase 3:

* 프로젝트 목록 UI가 실제 DB와 연결됨
* 프로젝트 생성 가능
* 프로젝트별 프롬프트 목록 표시 가능
* 새 프롬프트 수동 생성 가능
* prompt_asset과 첫 prompt_version 저장 가능
* 프롬프트 선택 시 current version 상세 표시 가능

Phase 4:

* 오른쪽 패널의 프롬프트 컴파일러 UI 구현
* 정적 템플릿 기반 compiled_prompt 생성 가능
* 생성된 프롬프트를 PromptAsset + PromptVersion으로 저장 가능
* 아직 LLM 호출은 없음

이 작업은 Phase 9: 설정 / API Key 저장입니다.

목표:
OpenAI API Key와 앱 기본 설정을 안전하게 저장하고 관리하는 Settings 화면과 main process 기반 secret storage 구조를 구현합니다. 이후 Phase 5에서 LLM 기반 프롬프트 컴파일을 붙일 수 있도록 준비합니다.

중요:
아직 LLM 기반 프롬프트 컴파일을 구현하지 마세요.
아직 OpenAI API 호출을 실제 프롬프트 생성에 연결하지 마세요.
아직 clarification question 생성을 구현하지 마세요.
아직 Codex 통합을 추가하지 마세요.
아직 프롬프트 실행 기능을 추가하지 마세요.
아직 프롬프트 실행 결과 저장 기능을 추가하지 마세요.
prompt_runs, agent_runs, execution_results, validation_results, run_logs를 만들거나 사용하지 마세요.
이번 단계는 설정 UI, 일반 설정 저장, API Key 보안 저장만 구현합니다.

아키텍처 요구사항:

* API Key는 renderer에 직접 노출하지 않습니다.
* API Key는 SQLite settings 테이블에 평문으로 저장하지 않습니다.
* API Key 저장, 조회, 삭제는 Electron main process에서만 처리합니다.
* renderer는 preload bridge를 통해 제한된 settings/secrets API만 호출합니다.
* renderer가 실제 API Key 값을 직접 읽어야 하는 상황을 만들지 마세요.
* renderer에는 API Key 존재 여부, 마스킹된 표시값, 저장 상태 정도만 반환합니다.
* 모든 IPC 입력값은 Zod로 검증합니다.
* 기존 main, preload, renderer 보안 경계를 유지합니다.

Secret storage 요구사항:

* Electron safeStorage를 우선 사용합니다.
* safeStorage를 사용할 수 없는 환경에 대비해 명확한 에러를 반환합니다.
* API Key는 암호화된 값으로 userData 경로 아래 별도 secret store 파일에 저장하거나, 암호화된 ciphertext만 DB에 저장해도 됩니다.
* 어떤 방식을 선택하든 평문 API Key가 SQLite settings 테이블, 로그, 콘솔, 에러 메시지에 남지 않게 합니다.
* API Key 삭제 기능을 제공합니다.
* API Key 존재 여부 확인 기능을 제공합니다.
* API Key 마스킹 표시 기능을 제공합니다.

API Key 마스킹 예시:

* sk-proj-abc123...xyz789 형태라면
* sk-proj-••••••••••••••••7890 같은 식으로 일부만 표시합니다.
* 전체 키를 renderer에 반환하지 마세요.

일반 설정 요구사항:
settings 테이블에는 비밀이 아닌 일반 설정만 저장합니다.

저장할 일반 설정:

* default_model
* default_target_agent
* default_project_id
* default_scenario
* app_theme, 선택
* compiler_default_language, 선택

기본값 후보:

* default_model: gpt-4.1 또는 기존 프로젝트에서 정한 모델명
* default_target_agent: codex
* default_scenario: feature
* app_theme: system 또는 dark
* compiler_default_language: ko

대상 에이전트 후보:

* codex
* claude_code
* cursor
* generic_agent

시나리오 후보:

* feature
* bugfix
* refactor
* code_review
* docs
* research

Settings UI 요구사항:
설정 화면 또는 설정 패널을 구현합니다.

접근 방식:

* 왼쪽 사이드바의 설정 버튼을 클릭하면 설정 패널을 열거나
* Dialog/Modal로 설정 화면을 띄우거나
* 오른쪽 패널을 설정 모드로 전환해도 됩니다.

기존 UI 구조에 가장 자연스러운 방식을 선택하세요.

설정 화면에 포함할 항목:

1. OpenAI API Key 섹션

* API Key 입력 필드
* 저장 버튼
* 삭제 버튼
* 현재 저장 여부 표시
* 마스킹된 키 표시
* 저장 성공/실패 메시지
* 삭제 성공/실패 메시지
* “API Key는 로컬에 암호화되어 저장됩니다” 안내 문구

2. 기본 모델 설정

* default_model 입력 또는 select
* 초기 후보:

  * gpt-4.1
  * gpt-4.1-mini
  * gpt-4o
  * gpt-4o-mini
* 단, 모델 목록은 나중에 바뀔 수 있으므로 너무 강하게 제한하지 않아도 됩니다.
* 사용자가 직접 모델명을 입력할 수 있게 해도 됩니다.

3. 기본 대상 에이전트

* codex
* claude_code
* cursor
* generic_agent

4. 기본 시나리오

* feature
* bugfix
* refactor
* code_review
* docs
* research

5. 기본 프로젝트

* 현재 저장된 프로젝트 목록에서 선택
* 프로젝트가 없으면 비활성화하거나 “프로젝트 없음” 표시

6. 테마 설정, 선택

* system
* light
* dark
* 실제 테마 적용은 간단히 처리하거나, 복잡하면 값 저장만 해도 됩니다.

IPC API 요구사항:
preload bridge를 통해 renderer에 다음과 같은 안전한 API를 노출합니다.
정확한 네이밍은 기존 코드 스타일에 맞춰 조정해도 됩니다.

일반 설정:

* window.prompter.settings.get(key)
* window.prompter.settings.set(key, value)
* window.prompter.settings.list()
* window.prompter.settings.getDefaults()
* window.prompter.settings.updateDefaults(input)

Secret:

* window.prompter.secrets.saveOpenAIKey(input)
* window.prompter.secrets.hasOpenAIKey()
* window.prompter.secrets.getOpenAIKeyStatus()
* window.prompter.secrets.deleteOpenAIKey()

중요:

* getOpenAIKey 같은 평문 반환 API는 renderer에 노출하지 마세요.
* Phase 5에서 main process의 LLM service가 내부적으로 API Key를 읽을 수 있도록 main 전용 함수는 만들어도 됩니다.
* main 전용 함수 이름 예:

  * getOpenAIKeyForMainProcessOnly()
* 이 함수는 preload bridge에 노출하지 마세요.

Zod schema 요구사항:
다음 입력 스키마를 정의합니다.

* SaveOpenAIKeyInput

  * apiKey: string
  * 빈 문자열 불가
  * 앞뒤 공백 trim
  * 최소 길이 검증
  * sk- 또는 sk-proj- prefix 검증은 경고 수준으로 처리해도 됩니다. 너무 강하게 막지는 마세요.

* UpdateDefaultsInput

  * defaultModel?: string
  * defaultTargetAgent?: TargetAgent
  * defaultProjectId?: string | null
  * defaultScenario?: PromptScenario
  * appTheme?: "system" | "light" | "dark"
  * compilerDefaultLanguage?: string

* SetSettingInput

  * key: string
  * value: string

보안 요구사항:

* API Key 평문을 console.log로 출력하지 마세요.
* API Key 평문을 에러 객체에 포함하지 마세요.
* API Key 평문을 renderer로 반환하지 마세요.
* API Key 평문을 settings 테이블에 저장하지 마세요.
* secret 저장소 파일을 만든다면 파일 내용은 암호화된 값이어야 합니다.
* secret 저장소 파일 경로는 main process 내부에서만 다룹니다.
* preload에서는 필요한 최소 함수만 노출합니다.
* renderer에서는 ipcRenderer를 직접 사용하지 않습니다.
* renderer에서는 fs, path, process, safeStorage에 직접 접근하지 않습니다.

API Key 검증에 대한 요구사항:
이번 단계에서는 실제 OpenAI API 네트워크 호출 검증을 구현하지 않아도 됩니다.
대신 다음 정도의 로컬 검증만 수행합니다.

* 비어 있지 않은지
* 앞뒤 공백 제거
* 너무 짧지 않은지
* 형식이 명백히 이상하면 경고 표시

실제 API 호출을 통한 검증은 Phase 5에서 OpenAI SDK를 붙일 때 구현합니다.
이번 단계에서 OpenAI SDK를 추가하지 마세요. 단, 이미 프로젝트에 추가되어 있다면 사용하지 않고 그대로 두어도 됩니다.

Renderer 상태 요구사항:

* 설정 화면을 열 때 현재 일반 설정과 API Key 상태를 로드합니다.
* 저장 중, 삭제 중, 로딩 중 상태를 표시합니다.
* 저장 성공/실패 메시지를 표시합니다.
* API Key 저장 후 입력 필드는 비우거나 마스킹 상태로 전환합니다.
* API Key 삭제 후 저장 상태가 즉시 갱신되어야 합니다.
* 기본 설정 저장 후 UI에 반영되어야 합니다.

기존 프롬프트 컴파일러와의 연결:
이번 단계에서 기본 설정을 PromptCompilerPanel에 완전히 반영하는 것은 필수는 아닙니다.
단, 쉽게 가능하다면 다음 정도를 적용합니다.

* 기본 target_agent를 새 컴파일러 폼의 초기값으로 사용
* 기본 scenario를 새 컴파일러 폼의 초기값으로 사용
* 기본 project_id가 있으면 앱 시작 시 해당 프로젝트를 선택

이 연결이 범위를 키운다면 설정 저장까지만 구현하고, 적용은 다음 단계로 미룹니다.

권장 파일 구조:
기존 구조에 맞추되, 다음 분리를 권장합니다.

Main process:

* src/main/secrets/secretStore.ts
* src/main/secrets/openAIKeyStore.ts
* src/main/ipc/secrets.ts
* src/main/ipc/settings.ts
* src/main/repositories/settingsRepository.ts

Shared:

* src/shared/schemas/settingsSchemas.ts
* src/shared/types/settings.ts
* src/shared/types/secrets.ts

Renderer:

* src/renderer/components/settings/SettingsPanel.tsx
* src/renderer/components/settings/OpenAIKeySettings.tsx
* src/renderer/components/settings/DefaultSettingsForm.tsx
* src/renderer/hooks/useSettings.ts
* src/renderer/hooks/useSecretStatus.ts

Preload:

* src/preload/index.ts
* preload 타입 선언 파일

정확한 파일명은 기존 프로젝트 구조에 맞게 조정해도 됩니다.
단, secret 관련 로직을 renderer에 섞지 마세요.

테스트 / 확인 요구사항:

* 앱이 개발 모드에서 정상 실행되어야 합니다.
* TypeScript typecheck가 통과해야 합니다.
* 설정 화면을 열 수 있어야 합니다.
* API Key를 저장할 수 있어야 합니다.
* API Key 저장 후 renderer에는 전체 평문 키가 표시되지 않아야 합니다.
* API Key 저장 여부와 마스킹된 값만 표시되어야 합니다.
* API Key를 삭제할 수 있어야 합니다.
* 삭제 후 저장 상태가 갱신되어야 합니다.
* default_model, default_target_agent, default_scenario, default_project_id를 저장하고 다시 불러올 수 있어야 합니다.
* 앱 재시작 후 일반 설정과 API Key 저장 상태가 유지되어야 합니다.
* SQLite settings 테이블에 API Key 평문이 저장되지 않아야 합니다.
* console log에 API Key 평문이 출력되지 않아야 합니다.
* renderer가 secret 저장소나 safeStorage에 직접 접근하지 않아야 합니다.

이번 단계에서 구현하지 말 것:

* LLM 기반 분석
* LLM 기반 프롬프트 컴파일
* clarification question 생성
* OpenAI API 실제 호출
* OpenAI SDK 신규 추가
* Codex CLI 실행
* Codex OAuth
* 프롬프트 실행 기능
* 프롬프트 실행 결과 저장
* prompt_runs 또는 실행 로그 테이블
* 검색 FTS
* 태그 필터 고도화
* AGENTS.md / SKILL.md export

완료 기준:

* Settings UI가 구현되어 있습니다.
* OpenAI API Key를 안전하게 저장, 상태 확인, 삭제할 수 있습니다.
* API Key 평문은 renderer, logs, settings 테이블에 노출되지 않습니다.
* 일반 설정을 settings 테이블에 저장하고 불러올 수 있습니다.
* default_model, default_target_agent, default_scenario, default_project_id를 관리할 수 있습니다.
* 모든 IPC 입력값이 Zod로 검증됩니다.
* renderer는 DB, 파일 시스템, safeStorage, ipcRenderer에 직접 접근하지 않습니다.
* TypeScript 타입 검사가 통과합니다.
* 앱이 개발 모드에서 정상 실행됩니다.
* LLM 호출과 프롬프트 실행 관련 기능은 아직 구현되지 않았습니다.

작업 전:

1. 현재 Phase 0, Phase 1, Phase 2, Phase 3, Phase 4 코드 구조를 확인합니다.
2. settings 테이블과 settingsRepository가 어떻게 구현되어 있는지 확인합니다.
3. preload bridge 구조와 타입 선언 방식을 확인합니다.
4. 왼쪽 사이드바의 설정 버튼 또는 설정 진입점이 있는지 확인합니다.
5. secret storage 구현 위치와 저장 방식을 계획합니다.
6. API Key 평문이 renderer로 새지 않도록 데이터 흐름을 설계합니다.
7. 간결한 구현 계획을 세운 뒤 Phase 9만 구현합니다.

작업 후:

1. 변경된 내용을 요약합니다.
2. 생성되거나 수정된 파일 목록을 제공합니다.
3. 추가한 패키지가 있다면 목록을 제공합니다.
4. API Key 저장 방식과 보안 경계를 설명합니다.
5. 앱 실행 및 타입 검사 명령어를 제공합니다.
6. 수동 테스트 절차를 제공합니다.
7. SQLite settings 테이블에 API Key 평문이 저장되지 않는지 확인하는 방법을 설명합니다.
8. 아직 구현하지 않은 기능을 명확히 구분해서 설명합니다.

```





# Phase 10

```
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

```



# Phase 11
