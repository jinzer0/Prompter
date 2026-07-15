# Plan Archive

> **READ-ONLY FILE — DO NOT MODIFY**
> 
> This file is the authoritative project plan and must be treated as strictly read-only.
> 
> - Do not edit, overwrite, delete, rename, move, truncate, or regenerate this file.
> - Do not automatically update task statuses, checkboxes, dates, or content.
> - You may read and reference this file when performing tasks.
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

```
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
```

# Phase 12

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
```

# Phase 13

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
* projects 테이블 포함

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
* required_fields와 clarification_policy 검증
* PromptCompilerPanel에서 하네스 템플릿 선택 가능
* 선택된 하네스 템플릿이 정적 컴파일러와 LLM PromptCompilerService에 반영됨
* 하네스 선택은 originalInput, scenario, targetAgent를 자동 덮어쓰지 않음
* 하네스 선택은 자동 analyze, 자동 compile, 자동 저장을 실행하지 않음
* 하네스 선택 시 stale compiler state 초기화
* template_body는 코드로 실행되지 않음

이 작업은 Phase 13: 프로젝트 컨텍스트 프로파일입니다.

목표:
프로젝트별로 반복 사용되는 컨텍스트를 저장하고, 프롬프트 컴파일러가 이를 안전하게 참조할 수 있도록 합니다. 사용자는 프로젝트마다 기술 스택, 아키텍처 규칙, 코딩 컨벤션, 검증 명령어, 금지사항, 기본 성공 기준, 보안 규칙 등을 저장할 수 있어야 합니다. PromptCompilerPanel은 선택된 프로젝트의 컨텍스트 프로파일을 표시하고, 사용자가 명시적으로 포함하도록 선택한 경우 정적 컴파일러와 LLM analyze / compile에 반영해야 합니다.

프로젝트 컨텍스트 프로파일은 “이 프로젝트에서 코딩 에이전트가 항상 알아야 하는 배경 지식”입니다.

예:

* 이 앱은 Electron + React + TypeScript + Vite 기반이다.
* renderer는 DB에 직접 접근하면 안 된다.
* 모든 DB 접근은 main process에서만 수행한다.
* IPC 입력값은 Zod로 검증한다.
* 프롬프트 실행 기능과 실행 결과 저장 기능은 구현하지 않는다.
* 테스트 명령어는 pnpm typecheck, pnpm test, pnpm build다.

중요:
프롬프트 실행 기능을 추가하지 마세요.
Codex CLI를 호출하지 마세요.
Claude Code CLI를 호출하지 마세요.
Cursor를 자동 실행하지 마세요.
외부 앱을 자동 제어하지 마세요.
파일 시스템에서 프로젝트 저장소를 자동 스캔하지 마세요.
외부 repo 파일을 자동으로 읽지 마세요.
프롬프트 실행 결과 저장 기능을 추가하지 마세요.
prompt_runs, agent_runs, execution_results, validation_results, run_logs를 만들거나 사용하지 마세요.
OS 전역 단축키를 추가하지 마세요.
window.prompter.appEvents.*를 추가하지 마세요.
window.prompter.shortcuts.*를 추가하지 마세요.
quick_capture_* settings key를 추가하지 마세요.
이번 단계는 프로젝트 컨텍스트 프로파일 저장, 관리, 컴파일러 연결에만 집중합니다.

Phase 11 / Phase 12와의 중요한 연결 규칙:

* quick capture 동작을 변경하지 마세요.
* quick capture로 가져온 originalInput을 프로젝트 컨텍스트 적용 과정에서 자동 변경하지 마세요.
* 프로젝트 컨텍스트 선택 또는 포함 여부 변경은 자동 LLM analyze를 실행하면 안 됩니다.
* 프로젝트 컨텍스트 선택 또는 포함 여부 변경은 자동 compile을 실행하면 안 됩니다.
* 프로젝트 컨텍스트 선택 또는 포함 여부 변경은 자동 저장을 실행하면 안 됩니다.
* 하네스 템플릿 선택 로직을 깨뜨리지 마세요.
* 프로젝트 컨텍스트는 하네스 템플릿을 대체하지 않습니다.
* 하네스 템플릿은 “프롬프트를 어떻게 만들지”를 담당하고, 프로젝트 컨텍스트는 “무엇을 배경으로 삼을지”를 담당합니다.
* 프로젝트 컨텍스트 변경은 stale compiler state를 초기화해야 합니다.

아키텍처 요구사항:

* renderer는 DB에 직접 접근하면 안 됩니다.
* renderer는 preload bridge에 노출된 typed API만 사용해야 합니다.
* 프로젝트 컨텍스트 프로파일 CRUD는 Electron main process repository/service를 통해 처리합니다.
* 모든 IPC 입력값은 Zod로 검증합니다.
* 프로젝트 컨텍스트를 LLM PromptCompilerService에 전달할 때도 main process 경계를 유지합니다.
* 프로젝트 컨텍스트는 사용자가 명시적으로 저장한 텍스트 데이터입니다.
* 프로젝트 컨텍스트는 코드로 실행하지 않습니다.
* eval, new Function, 동적 import를 사용하지 마세요.
* 프로젝트 컨텍스트는 자동으로 외부 파일이나 repo에서 수집하지 않습니다.
* 이번 단계에서는 local text profile만 구현합니다.

데이터 모델 선택:

기존 projects 테이블에 필드를 추가하거나, 별도 project_context_profiles 테이블을 만들 수 있습니다.

권장 방식:
별도 project_context_profiles 테이블을 추가합니다.

이유:

* projects 테이블을 과하게 비대하게 만들지 않음
* 나중에 프로젝트별 여러 컨텍스트 프로파일을 지원하기 쉬움
* active profile 개념을 붙이기 쉬움
* 버전 관리나 템플릿화로 확장 가능

권장 테이블: project_context_profiles

필드:

* id: text, primary key
* project_id: text, required, references projects.id
* name: text, required
* summary: text, nullable
* tech_stack: text, nullable
* architecture_notes: text, nullable
* coding_conventions: text, nullable
* constraints: text, nullable
* forbidden_actions: text, nullable
* acceptance_defaults: text, nullable
* validation_commands: text, nullable
* security_notes: text, nullable
* additional_context: text, nullable
* is_default: integer 또는 boolean, default false
* created_at: integer, required
* updated_at: integer, required

선택적 필드:

* testing_notes: text, nullable
* package_manager: text, nullable
* default_branch: text, nullable
* repo_path: text, nullable

repo_path 주의:

* repo_path를 저장하더라도 이번 단계에서 해당 경로를 자동 스캔하지 마세요.
* repo_path는 단순 메타데이터로만 저장합니다.
* 파일 읽기, 폴더 탐색, git 명령 실행은 이번 단계 범위가 아닙니다.

절대 추가하지 말아야 할 테이블:

* prompt_runs
* agent_runs
* execution_results
* validation_results
* run_logs
* clipboard_history
* quick_capture_settings

이번 단계에서 구현할 주요 기능:

1. project_context_profiles DB schema / migration

project_context_profiles 테이블을 추가합니다.

요구사항:

* project_id는 projects.id를 참조합니다.
* 프로젝트 삭제 시 profile 처리 방식을 명확히 정합니다.

  * cascade delete를 사용하거나
  * service 계층에서 관련 profile 삭제 처리
* 한 project 안에서 is_default = true인 profile은 하나만 유지하는 것을 권장합니다.
* SQLite에서 partial unique constraint가 부담되면 service 계층에서 default profile 유일성을 보장해도 됩니다.
* created_at, updated_at은 Unix timestamp milliseconds를 사용합니다.

2. ProjectContextProfile repository / service

main process에 repository/service를 구현합니다.

권장 함수:

* createProjectContextProfile(input)
* listProjectContextProfiles(projectId)
* getProjectContextProfile(id)
* getDefaultProjectContextProfile(projectId)
* updateProjectContextProfile(id, input)
* deleteProjectContextProfile(id)
* setDefaultProjectContextProfile(projectId, profileId)
* duplicateProjectContextProfile(id)
* buildProjectContextForCompiler(input)

buildProjectContextForCompiler는 선택된 profile을 컴파일러에 전달할 텍스트 블록으로 정리하는 함수입니다.

중요:

* 컴파일러용 context text를 만들 때 비어 있는 필드는 생략합니다.
* 사용자가 입력한 whitespace는 가능한 한 보존합니다.
* 코드 블록, Markdown, diff 형태가 훼손되지 않게 합니다.
* context를 임의로 요약하거나 재작성하지 마세요.
* summary 필드 정도만 별도 섹션으로 배치합니다.

3. 기본 컨텍스트 프로파일 생성

프로젝트 생성 시 기본 컨텍스트 프로파일을 만들 수 있게 합니다.

MVP 선택지:

* 프로젝트 생성 시 자동으로 “Default Context” 프로파일 생성
* 또는 프로젝트 상세에서 사용자가 직접 생성

권장:

* 새 프로젝트 생성 시 빈 “Default Context” 프로파일을 자동 생성합니다.
* 이미 프로젝트가 있는 경우, profile이 없을 때 “컨텍스트 프로파일 만들기” empty state를 표시합니다.

자동 생성되는 기본 프로파일:

* name: Default Context
* summary: 프로젝트 설명에서 가져오거나 비워둠
* tech_stack: 기존 projects.tech_stack 값이 있으면 사용
* is_default: true

주의:

* 기존 projects.description, projects.tech_stack을 삭제하거나 의미를 바꾸지 마세요.
* project_context_profiles는 projects의 확장 컨텍스트입니다.

4. 프로젝트 컨텍스트 목록 UI

프로젝트 상세 또는 사이드바 / 중앙 패널에서 선택된 프로젝트의 컨텍스트 프로파일 목록을 볼 수 있어야 합니다.

표시할 정보:

* name
* is_default 여부
* summary preview
* tech_stack preview
* updated_at

기능:

* 프로젝트별 profile 목록 표시
* default profile badge 표시
* 새 profile 생성
* profile 선택
* profile 복제
* profile 삭제
* default로 지정

프로젝트가 선택되지 않은 경우:

* “프로젝트를 선택하세요” empty state 표시

프로젝트에 profile이 없는 경우:

* “컨텍스트 프로파일이 없습니다” empty state 표시
* “Default Context 만들기” 버튼 제공

5. 프로젝트 컨텍스트 상세 / 편집 UI

선택한 profile을 상세 조회하고 편집할 수 있어야 합니다.

입력 필드:

* name, 필수
* summary, 선택
* tech_stack, 선택
* architecture_notes, 선택
* coding_conventions, 선택
* constraints, 선택
* forbidden_actions, 선택
* acceptance_defaults, 선택
* validation_commands, 선택
* security_notes, 선택
* additional_context, 선택

선택 필드:

* package_manager, 선택
* testing_notes, 선택
* repo_path, 선택, 단순 메타데이터

UI 요구사항:

* 긴 텍스트 필드는 textarea 또는 기존 editor 컴포넌트 사용
* Markdown과 코드 블록을 입력할 수 있게 합니다.
* 자동 trim/cleanup하지 않습니다.
* 사용자가 입력한 whitespace를 보존합니다.
* 저장 전 name만 trim해서 빈 문자열 여부를 검증합니다.
* 다른 텍스트 필드는 원문 보존을 우선합니다.
* 저장 성공/실패 메시지 표시
* 저장 중 버튼 disabled 처리

6. default profile 지정

프로젝트마다 default profile을 하나 지정할 수 있어야 합니다.

동작:

* “기본 프로파일로 지정” 버튼 제공
* 지정 시 같은 project_id의 다른 profile은 is_default false
* 지정된 profile은 UI에서 badge 표시
* PromptCompilerPanel에서 선택된 프로젝트의 default profile을 추천 또는 기본 선택

주의:

* default profile 지정은 자동 compile을 실행하지 않습니다.
* default profile 변경은 기존 prompt data를 변경하지 않습니다.
* default profile 변경은 현재 draft에 자동 반영하지 않아도 됩니다.
* 반영하려면 사용자가 “프로젝트 컨텍스트 불러오기” 또는 “프로파일 적용”을 명시적으로 눌러야 합니다.

7. PromptCompilerPanel과 연결

PromptCompilerPanel에서 프로젝트 컨텍스트 프로파일을 선택하고 포함할 수 있게 합니다.

UI:

* “프로젝트 컨텍스트” 섹션 추가
* 현재 선택된 프로젝트 표시
* default context profile 표시
* profile selector 제공
* “컴파일에 포함” toggle 또는 checkbox 제공
* context preview 제공
* “프로파일 편집” 진입 버튼 제공

동작 규칙:

* 프로젝트가 선택되면 default profile을 추천 선택할 수 있습니다.
* 하지만 default profile의 내용을 기존 draft 입력 필드에 자동 복사하지 마세요.
* “컴파일에 포함”이 켜진 경우 analyze / compile 요청에 projectContextProfileId 또는 resolvedProjectContext를 포함합니다.
* “컴파일에 포함”이 꺼진 경우 기존 수동 projectContext 필드만 사용하거나 context 없이 진행합니다.
* 사용자가 수동 projectContext를 입력한 경우, profile context와 충돌하지 않도록 preview에서 둘을 구분합니다.
* context profile 선택 또는 include toggle 변경 시 stale compiler state를 초기화합니다.
* 자동 analyze / 자동 compile / 자동 저장은 금지입니다.

8. 기존 projectContext / techStack 입력과의 관계

Phase 4/5에서 PromptCompilerPanel에 projectContext, techStack 같은 수동 입력 필드가 있을 수 있습니다.

이번 단계에서의 정책:

* 기존 수동 입력 필드는 유지합니다.
* project context profile은 추가 inherited context로 취급합니다.
* 수동 입력 필드를 자동 덮어쓰지 않습니다.
* 컴파일러에 전달할 때는 다음 순서로 구성합니다.

권장 컴파일러 context 구성:

1. Project Context Profile, include toggle이 켜진 경우
2. Manual Project Context, 사용자가 입력한 경우
3. Manual Tech Stack, 사용자가 입력한 경우
4. Additional Notes, 사용자가 입력한 경우

구분을 위해 compiled prompt 또는 LLM input에는 다음처럼 섹션화합니다.

## Project Context Profile

...

## User-Provided Context

...

## User-Provided Tech Stack

...

## Additional Notes

...

주의:

* 기존 수동 입력을 profile 값으로 대체하지 마세요.
* profile 값으로 수동 입력을 덮어쓰는 “적용” 기능은 이번 단계에서 구현하지 않아도 됩니다.
* 구현한다면 반드시 explicit confirmation이 필요합니다.

9. 정적 템플릿 컴파일러와 연결

정적 컴파일러가 include된 project context profile을 반영해야 합니다.

요구사항:

* static compiler input에 projectContextProfileId 또는 resolvedProjectContext 추가
* 정적 compiledPrompt의 # Context 섹션에 프로젝트 컨텍스트 프로파일 내용을 포함
* 비어 있는 profile field는 생략
* forbidden_actions는 # Scope 또는 # Constraints에도 반영 가능
* validation_commands는 # Validation에 반영 가능
* acceptance_defaults는 # Acceptance Criteria에 반영 가능
* security_notes는 # Constraints 또는 # Security Notes 섹션으로 반영 가능

주의:

* 사용자가 입력한 context를 임의로 요약하지 마세요.
* whitespace를 보존하세요.
* originalInput은 변경하지 마세요.

10. LLM analyze / compile과 연결

PromptCompilerService에서 projectContextProfileId 또는 resolvedProjectContext를 받을 수 있게 합니다.

analyze input에 추가:

* projectContextProfileId?: string | null
* includeProjectContextProfile?: boolean

compile input에 추가:

* projectContextProfileId?: string | null
* includeProjectContextProfile?: boolean

main process 동작:

* includeProjectContextProfile이 true이고 projectContextProfileId가 있으면 DB에서 profile 조회
* buildProjectContextForCompiler로 안전한 context block 생성
* LLM input에 해당 context block을 포함
* LLM 시스템 프롬프트 기본 규칙은 유지
* project context는 사용자가 제공한 사실로 취급하되, 누락된 사실을 지어내지 않도록 지시
* LLM 출력은 기존처럼 Zod로 검증

중요:

* project context가 LLM 시스템 프롬프트 전체를 덮어쓰면 안 됩니다.
* project context는 “사용자 제공 프로젝트 맥락”으로만 반영합니다.
* JSON output schema는 유지해야 합니다.
* context profile 선택만으로 자동 LLM 호출을 실행하지 않습니다.

11. 하네스 템플릿과 프로젝트 컨텍스트 동시 적용

Phase 12의 하네스 템플릿과 Phase 13의 project context profile은 동시에 적용될 수 있어야 합니다.

입력 우선순위:

* 시스템 수준 compiler safety rules
* 선택된 harness template의 compile structure / guidance
* 선택된 project context profile
* 사용자의 수동 입력
* originalInput
* clarification answers

충돌 처리:

* 하네스 템플릿은 출력 구조와 질문 정책에 영향을 줍니다.
* 프로젝트 컨텍스트는 프로젝트 사실과 제약에 영향을 줍니다.
* 둘이 충돌하면 PromptCompilerService는 warning을 반환할 수 있습니다.
* 예: harness는 test command를 요구하지만 project profile에 validation_commands가 비어 있음
* 충돌이 있어도 앱이 crash되면 안 됩니다.

12. 검색 / export와의 관계

이번 단계에서는 project context profile 자체를 FTS 검색에 포함하지 않아도 됩니다.

선택 구현:

* 프로젝트 context profile 이름과 summary를 검색할 수 있게 해도 됩니다.
* 하지만 프롬프트 검색 결과와 섞지 마세요.

export 관계:

* PromptVersion export에 project context profile을 포함할지 여부는 이번 단계에서 필수 아닙니다.
* 다만 새로 생성되는 compiledPrompt에 context가 포함되어 있으면 export는 자연스럽게 그 내용을 포함하게 됩니다.
* 별도 “context profile export”는 이번 단계에서 구현하지 않습니다.

13. IPC API 요구사항

preload bridge에 다음 API를 추가합니다.

권장 API:

* window.prompter.projectContextProfiles.create(input)
* window.prompter.projectContextProfiles.list(projectId)
* window.prompter.projectContextProfiles.get(id)
* window.prompter.projectContextProfiles.getDefault(projectId)
* window.prompter.projectContextProfiles.update(id, input)
* window.prompter.projectContextProfiles.delete(id)
* window.prompter.projectContextProfiles.duplicate(id)
* window.prompter.projectContextProfiles.setDefault(projectId, profileId)
* window.prompter.projectContextProfiles.buildCompilerContext(input)

buildCompilerContext input 예시:

* profileId: string

buildCompilerContext result 예시:

* profileId: string
* title: string
* contextText: string
* includedSections: string[]

금지:

* window.prompter.appEvents.* 추가 금지
* window.prompter.shortcuts.* 추가 금지
* globalShortcut 관련 API 추가 금지
* quick_capture_* settings API 추가 금지
* promptRuns 관련 API 추가 금지

14. Zod schema 요구사항

다음 schema를 정의합니다.

* ProjectContextProfileSchema
* CreateProjectContextProfileInputSchema
* UpdateProjectContextProfileInputSchema
* ListProjectContextProfilesInputSchema
* GetProjectContextProfileInputSchema
* DeleteProjectContextProfileInputSchema
* DuplicateProjectContextProfileInputSchema
* SetDefaultProjectContextProfileInputSchema
* BuildProjectContextForCompilerInputSchema
* BuildProjectContextForCompilerResultSchema

검증 규칙:

* projectId는 빈 문자열 불가
* profileId는 빈 문자열 불가
* name은 trim 후 빈 문자열 불가
* name은 적절한 최대 길이 제한
* 텍스트 필드는 optional string
* 텍스트 필드는 자동 trim/cleanup하지 않음
* repo_path가 있다면 string으로만 저장하고 접근/검증을 위해 파일 시스템을 읽지 않음
* is_default는 boolean 또는 0/1로 안전하게 처리

추가하지 말아야 할 schema:

* PromptRunSchema
* AgentRunSchema
* ExecutionResultSchema
* QuickCaptureSettingsSchema
* RegisterGlobalShortcutInputSchema
* ClipboardHistorySchema

15. UI 구조 권장

기존 구조에 맞추되 다음 컴포넌트를 권장합니다.

Renderer:

* src/renderer/components/projectContext/ProjectContextProfileList.tsx
* src/renderer/components/projectContext/ProjectContextProfileDetail.tsx
* src/renderer/components/projectContext/ProjectContextProfileEditor.tsx
* src/renderer/components/projectContext/ProjectContextProfileSelector.tsx
* src/renderer/components/projectContext/ProjectContextPreview.tsx
* src/renderer/hooks/useProjectContextProfiles.ts

Shared:

* src/shared/projectContext/projectContextSchemas.ts
* src/shared/projectContext/projectContextTypes.ts
* src/shared/projectContext/buildProjectContextForCompiler.ts

Main:

* src/main/repositories/projectContextProfileRepository.ts
* src/main/services/projectContextProfileService.ts
* src/main/ipc/projectContextProfiles.ts

Compiler 연결:

* existing static prompt compiler
* existing PromptCompilerService
* existing promptCompiler IPC schemas
* PromptCompilerPanel draft state

정확한 파일명은 기존 프로젝트 구조에 맞춰 조정해도 됩니다.
단, context building, validation, UI, DB repository를 한 파일에 뒤섞지 마세요.

16. stale compiler state 초기화

다음 변경이 발생하면 기존 analyze / compile 결과는 stale하므로 초기화해야 합니다.

초기화 트리거:

* projectContextProfileId 변경
* includeProjectContextProfile toggle 변경
* profile 내용 수정 후 현재 draft에서 같은 profile을 포함 중인 경우
* selectedProject 변경
* manual projectContext 변경
* manual techStack 변경
* constraints 변경
* acceptanceCriteria 변경
* validationCommands 변경
* additionalNotes 변경
* harnessTemplateId 변경
* originalInput 변경
* scenario 변경
* targetAgent 변경

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

중요:

* stale state 초기화는 originalInput을 비우거나 바꾸면 안 됩니다.
* quick capture로 가져온 원문 whitespace를 보존해야 합니다.
* profile 선택 또는 include toggle 변경은 자동 LLM 호출을 실행하면 안 됩니다.

17. 보안 요구사항

* project context text를 실행 가능한 코드로 취급하지 마세요.
* eval, new Function, 동적 import 사용 금지
* renderer에서 DB, fs, path, process에 직접 접근하지 않습니다.
* renderer에서 ipcRenderer를 직접 사용하지 않습니다.
* repo_path를 저장하더라도 파일 시스템을 자동으로 읽지 않습니다.
* project context 내용을 자동으로 로그에 남기지 않습니다.
* 사용자가 context에 secret을 넣을 수 있으므로 console.log로 출력하지 마세요.
* LLM 호출은 사용자가 명시적으로 analyze 또는 compile을 실행할 때만 발생해야 합니다.
* prompt execution 또는 외부 프로세스 실행 기능을 추가하지 않습니다.
* 실행 결과 저장 관련 테이블과 API를 추가하지 않습니다.

18. TDD 구현 순서

가능하면 다음 순서로 구현하세요.

1. project context schema 테스트 작성

* valid create input
* invalid projectId
* invalid name
* optional text fields 허용
* text field whitespace 보존
* repo_path가 파일 시스템 접근 없이 string으로만 처리되는지 확인

2. buildProjectContextForCompiler 테스트 작성

* 비어 있는 필드 생략
* summary 포함
* tech_stack 포함
* architecture_notes 포함
* constraints 포함
* forbidden_actions 포함
* validation_commands 포함
* whitespace 보존
* code fence 보존
* diff block 보존
* 임의 요약/cleanup 없음

3. repository/service 테스트 작성, 가능하면

* create/list/get/update/delete
* duplicate
* setDefault
* default profile 유일성
* project별 profile 분리

4. PromptCompilerService 연결 테스트, 가능하면

* analyze input이 projectContextProfileId를 받음
* compile input이 projectContextProfileId를 받음
* includeProjectContextProfile false면 context 미포함
* includeProjectContextProfile true면 context 포함
* missing profile이 crash를 일으키지 않음
* 하네스 템플릿과 project context가 함께 전달됨

5. renderer behavior 테스트, 가능하면

* profile selector 표시
* include toggle 변경 시 stale state 초기화
* profile 선택이 originalInput을 바꾸지 않음
* profile 선택이 자동 analyze를 실행하지 않음
* profile 선택이 자동 저장을 실행하지 않음

테스트 인프라가 부족하면 순수 함수와 schema 테스트를 우선하세요.

19. 파일별 예상 변경

예상 변경 파일:

* DB schema / migration 파일
* projectContext shared schema/type 파일 추가
* buildProjectContextForCompiler utility 추가
* projectContextProfileRepository 추가
* projectContextProfileService 추가
* projectContextProfiles IPC handler 추가
* preload bridge 타입 추가
* Project UI 또는 Sidebar에 context profile 진입점 추가
* ProjectContextProfileList / Detail / Editor / Selector 컴포넌트 추가
* PromptCompilerPanel에 projectContextProfileId 및 includeProjectContextProfile draft state 추가
* static compiler에 resolved project context 반영
* PromptCompilerService analyze/compile input에 projectContextProfileId/includeProjectContextProfile 추가
* 관련 테스트 파일 추가

건드리지 말아야 할 것:

* quick capture cleanup/trim 로직 추가 금지
* quick_capture settings 추가 금지
* globalShortcut 추가 금지
* appEvents bridge 추가 금지
* shortcuts bridge 추가 금지
* prompt_runs 관련 schema 추가 금지
* 실행 결과 저장 관련 코드 추가 금지
* 외부 repo 자동 스캔 추가 금지

20. 의존성 그래프

권장 의존성 방향:

shared/projectContext schemas
→ shared/projectContext context builder
→ main projectContext repository/service
→ main IPC projectContextProfiles
→ preload typed bridge
→ renderer hooks
→ renderer components
→ PromptCompilerPanel selector/include toggle
→ static compiler / PromptCompilerService integration

금지 방향:

* renderer → DB 직접 접근
* renderer → Electron ipcRenderer 직접 접근
* renderer → fs/path/process 직접 접근
* project context profile → prompt execution service
* project context profile → external repo scanner
* repo_path → automatic filesystem read
* context text → executable code

21. 자동 테스트 목록

가능한 경우 다음 테스트를 추가하세요.

Schema:

* CreateProjectContextProfileInputSchema accepts valid input
* rejects empty projectId
* rejects empty name
* preserves text field whitespace
* accepts optional repo_path as string
* does not attempt filesystem validation

Context builder:

* builds context with non-empty sections only
* preserves Markdown
* preserves code fences
* preserves diff blocks
* includes forbidden actions
* includes validation commands
* does not trim original multi-line text
* does not summarize or rewrite user content

Repository/service:

* creates profile
* lists profiles by project
* gets default profile
* setDefault makes only one default per project
* duplicate creates new id and modified name
* delete removes profile without breaking other projects

Compiler integration:

* includeProjectContextProfile false excludes profile context
* includeProjectContextProfile true includes profile context
* missing profile returns recoverable error or fallback
* harnessTemplateId and projectContextProfileId can coexist
* mandatory output JSON schema remains enforced

UI behavior, if testable:

* selecting profile does not modify originalInput
* selecting profile does not auto-run analyze
* selecting profile does not auto-save
* include toggle clears stale compiledPrompt
* editing included profile clears stale compiledPrompt
* changing selected project updates available profiles

22. 수동 QA 체크리스트

| 항목                               | 기대 결과                                        |
| -------------------------------- | -------------------------------------------- |
| 앱 시작                             | 기존 프로젝트/프롬프트 기능 유지                           |
| 새 프로젝트 생성                        | Default Context profile 생성 또는 empty state 표시 |
| 프로젝트 선택                          | 해당 프로젝트의 context profile 목록 표시               |
| context profile 생성               | 목록에 추가됨                                      |
| context profile 편집               | 저장 후 updated_at 갱신                           |
| context profile 복제               | 새 id와 복사본 이름으로 생성                            |
| context profile 삭제               | 확인 후 삭제되고 UI crash 없음                        |
| default 지정                       | 같은 프로젝트 내 하나만 default                        |
| 프로젝트 변경                          | profile selector가 해당 프로젝트 기준으로 갱신            |
| PromptCompilerPanel에서 profile 선택 | originalInput 보존                             |
| include toggle 변경                | 자동 analyze/compile/save 없음                   |
| include toggle 변경                | stale compiledPrompt 초기화                     |
| quick capture 후 profile 선택       | clipboard 원문 whitespace 유지                   |
| 정적 컴파일                           | # Context에 profile 내용 반영                     |
| LLM analyze                      | include true일 때 profile context 반영           |
| LLM compile                      | profile context와 harness template 동시 반영      |
| include false                    | profile context 미반영                          |
| repo_path 입력                     | 저장만 되고 파일 시스템 자동 접근 없음                       |
| 앱 재시작                            | profile 유지                                   |
| prompt_runs 확인                   | 실행 결과 관련 데이터 생성 없음                           |

23. Attribution

이 Phase 13 명세는 Phase 11과 Phase 12의 최종 guardrail을 반영합니다.

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

Phase 13에서 이 결정을 깨뜨리지 마세요.

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
* project context marketplace
* 원격 context 다운로드
* context text 안에서 코드 실행
* 자동 LLM 호출 미리보기

완료 기준:

* project_context_profiles DB schema와 migration이 구현되어 있습니다.
* 프로젝트별 context profile CRUD가 구현되어 있습니다.
* 프로젝트마다 default context profile을 지정할 수 있습니다.
* 새 프로젝트 생성 시 default context profile 생성 또는 명확한 empty state가 제공됩니다.
* Project Context Profile 목록, 상세, 생성, 수정, 복제, 삭제 UI가 구현되어 있습니다.
* PromptCompilerPanel에서 project context profile을 선택하고 include 여부를 설정할 수 있습니다.
* profile 선택과 include toggle은 originalInput을 자동 변경하지 않습니다.
* profile 선택과 include toggle은 자동 analyze, 자동 compile, 자동 저장을 실행하지 않습니다.
* profile 선택과 include toggle은 stale compiler state를 안전하게 초기화합니다.
* 정적 컴파일러가 include된 project context profile을 # Context에 반영합니다.
* LLM PromptCompilerService가 include된 project context profile을 사용자 제공 프로젝트 맥락으로 반영합니다.
* 하네스 템플릿과 project context profile을 동시에 사용할 수 있습니다.
* context text는 코드로 실행되지 않습니다.
* repo_path가 있더라도 파일 시스템을 자동으로 읽지 않습니다.
* 모든 IPC 입력값은 Zod로 검증됩니다.
* renderer는 DB, fs, path, process에 직접 접근하지 않습니다.
* Phase 11 quick capture guardrail과 Phase 12 harness guardrail이 유지됩니다.
* TypeScript 타입 검사가 통과합니다.
* 앱이 개발 모드에서 정상 실행됩니다.
* 프롬프트 실행이나 실행 결과 저장 기능은 추가되지 않았습니다.

작업 전:

1. 현재 Phase 0부터 Phase 12까지의 코드 구조를 확인합니다.
2. projects DB schema와 project repository/service 구현을 확인합니다.
3. PromptCompilerPanel의 draft state 구조를 확인합니다.
4. Phase 11 quick capture stale state 초기화 로직을 확인합니다.
5. Phase 12 harnessTemplateId draft state와 stale state 초기화 방식을 확인합니다.
6. PromptCompilerService의 analyze / compile input schema를 확인합니다.
7. static compiler가 context를 어떻게 구성하는지 확인합니다.
8. project_context_profiles migration 추가 계획을 세웁니다.
9. project context가 LLM 시스템 프롬프트를 덮어쓰지 않고 사용자 제공 context로만 반영되도록 설계합니다.
10. TDD 순서에 따라 schema와 context builder 테스트를 먼저 작성합니다.
11. 간결한 구현 계획을 세운 뒤 Phase 13만 구현합니다.

작업 후:

1. 변경된 내용을 요약합니다.
2. 생성되거나 수정된 파일 목록을 제공합니다.
3. schema 또는 migration 변경을 설명합니다.
4. project context profile CRUD 데이터 흐름을 설명합니다.
5. default profile 처리 방식을 설명합니다.
6. PromptCompilerPanel과 project context profile의 연결 방식을 설명합니다.
7. project context 선택이 originalInput/manual context/scenario/targetAgent를 자동 덮어쓰지 않는 방식을 설명합니다.
8. stale compiler state 초기화 방식을 설명합니다.
9. 정적 컴파일러와 LLM PromptCompilerService에 project context가 어떻게 반영되는지 설명합니다.
10. 하네스 템플릿과 project context profile이 함께 적용되는 방식을 설명합니다.
11. repo_path가 자동 파일 접근으로 이어지지 않도록 한 방식을 설명합니다.
12. Phase 11 quick capture guardrail과 Phase 12 harness guardrail을 유지한 방식을 설명합니다.
13. 추가한 테스트와 테스트 결과를 설명합니다.
14. 앱 실행 및 타입 검사 명령어를 제공합니다.
15. 수동 테스트 절차를 제공합니다.
16. 아직 구현하지 않은 기능을 명확히 구분해서 설명합니다.
```

# Phase 14

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
```

# Phase 15

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
* prompt_assets.parent_prompt_id 필드 존재 가능

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

이 작업은 Phase 15: 프롬프트 파생 / 복제 / 템플릿화 워크플로입니다.

목표:
좋은 프롬프트를 기반으로 새 프롬프트를 빠르게 만들 수 있도록 “복제”, “파생”, “템플릿화”, “계보 보기” 기능을 구현합니다. 사용자는 기존 PromptVersion을 기반으로 새 PromptAsset을 만들거나, 기존 PromptAsset의 구조를 재사용 가능한 Prompt Template으로 저장하고, 이후 새로운 요구사항을 입력할 때 해당 템플릿을 출발점으로 사용할 수 있어야 합니다.

이 단계의 핵심:

* 기존 프롬프트를 새 프롬프트의 출발점으로 사용
* parent_prompt_id 또는 별도 lineage metadata로 파생 관계 기록
* 좋은 PromptVersion을 재사용 가능한 Prompt Template으로 전환
* PromptCompilerPanel에서 템플릿을 선택해 draft를 시작
* 파생 관계와 원본을 추적
* 자동 LLM 호출, 자동 저장, 자동 실행은 하지 않음

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

* quick capture 동작을 변경하지 마세요.
* 클립보드 텍스트를 자동 정리하지 마세요.
* 하네스 템플릿 선택 로직을 변경하지 마세요.
* 프로젝트 컨텍스트 프로파일 선택 로직을 변경하지 마세요.
* 품질 리뷰어 동작을 자동화하지 마세요.
* 템플릿 선택은 자동 LLM analyze를 실행하면 안 됩니다.
* 템플릿 선택은 자동 compile을 실행하면 안 됩니다.
* 템플릿 선택은 자동 저장을 실행하면 안 됩니다.
* 템플릿 선택은 originalInput, scenario, targetAgent, harnessTemplateId, projectContextProfileId를 임의로 덮어쓰면 안 됩니다.
* 템플릿 적용은 사용자가 명시적으로 선택한 경우에만 draft를 변경해야 합니다.
* 템플릿 적용 후 기존 analyze / compile / quality review 결과는 stale이므로 초기화해야 합니다.

용어 정의:

1. PromptAsset

* 프롬프트의 논리적 자산 단위
* 여러 PromptVersion을 가질 수 있음
* parent_prompt_id를 통해 다른 PromptAsset에서 파생될 수 있음

2. PromptVersion

* 실제 original_input, compiled_prompt, assumptions, questions, answers 등을 가진 버전 단위

3. Derived Prompt

* 기존 PromptAsset 또는 PromptVersion을 기반으로 새로 만든 PromptAsset
* 원본과 파생 관계를 기록해야 함

4. Prompt Template

* 특정 PromptVersion의 구조를 재사용 가능한 출발점으로 만든 것
* 하네스 템플릿과 다름
* 하네스 템플릿은 “어떻게 컴파일할지”를 정의
* Prompt Template은 “어떤 작업 프롬프트 구조를 재사용할지”를 정의

아키텍처 요구사항:

* renderer는 DB에 직접 접근하면 안 됩니다.
* renderer는 preload bridge에 노출된 typed API만 사용해야 합니다.
* 복제, 파생, 템플릿 생성은 Electron main process repository/service를 통해 처리합니다.
* 모든 IPC 입력값은 Zod로 검증합니다.
* 템플릿 placeholder 치환은 단순 문자열 처리만 사용합니다.
* template content는 코드로 실행하지 않습니다.
* eval, new Function, 동적 import를 사용하지 마세요.
* Prompt Template 선택만으로 LLM 호출, 저장, 실행을 하지 않습니다.
* 템플릿 적용은 local draft state 변경일 뿐이며, 사용자가 저장하기 전까지 DB에 새 PromptAsset이 생기면 안 됩니다.

데이터 모델:

기존 prompt_assets.parent_prompt_id가 있다면 이를 활용합니다.

추가 권장 테이블 1: prompt_asset_lineage, 선택

기존 parent_prompt_id만으로 충분하면 새 테이블을 만들지 않아도 됩니다.
다만 어떤 version에서 파생되었는지 추적하려면 별도 lineage 테이블을 권장합니다.

prompt_asset_lineage 필드:

* id: text, primary key
* child_prompt_asset_id: text, required, references prompt_assets.id
* parent_prompt_asset_id: text, required, references prompt_assets.id
* parent_prompt_version_id: text, nullable, references prompt_versions.id
* relationship_type: text, required

  * duplicate
  * derived
  * templated_from
  * improved_from_review
* note: text, nullable
* created_at: integer, required

주의:

* 이미 parent_prompt_id를 사용하고 있다면 중복 책임을 피하세요.
* MVP에서는 parent_prompt_id + optional parent_version_id 필드 추가 정도로도 충분합니다.
* 더 명확한 추적이 필요하면 prompt_asset_lineage를 추가하세요.
* 선택한 방식을 작업 후 설명하세요.

추가 권장 테이블 2: prompt_templates

prompt_templates 필드:

* id: text, primary key
* name: text, required
* description: text, nullable
* source_prompt_asset_id: text, nullable, references prompt_assets.id
* source_prompt_version_id: text, nullable, references prompt_versions.id
* scenario: text, required
* target_agent: text, required
* template_body: text, required
* variables: text, nullable, JSON string
* tags: text, nullable, JSON string
* created_at: integer, required
* updated_at: integer, required

Prompt Template은 하네스 템플릿과 분리합니다.
하네스 템플릿은 compiler structure이고, prompt_templates는 reusable prompt content입니다.

절대 추가하지 말아야 할 테이블:

* prompt_runs
* agent_runs
* execution_results
* validation_results
* run_logs
* clipboard_history
* quick_capture_settings

이번 단계에서 구현할 주요 기능:

1. PromptAsset 복제

선택한 PromptAsset을 복제할 수 있어야 합니다.

동작:

* 원본 PromptAsset의 metadata를 복사
* current version 또는 사용자가 선택한 PromptVersion을 기반으로 새 PromptAsset 생성
* 새 PromptAsset의 title은 “{원본 제목} 복사본” 또는 “Copy of {원본 제목}”
* 새 PromptVersion version_number는 1
* original_input과 compiled_prompt는 원본 version에서 복사
* assumptions, questions, answers, acceptance_criteria, validation_commands, quality_score는 복사하되, quality_score는 정책에 따라 null로 초기화 가능
* parent_prompt_id 또는 lineage record로 원본 관계 기록
* tags는 복사할지 사용자 선택 가능
* project_id는 기본적으로 원본과 동일하게 하되, 다른 프로젝트로 복제할 수 있으면 좋음

MVP 정책:

* tags는 기본 복사
* quality_score는 복사하지 않고 null로 시작하는 것을 권장
* parent_prompt_id는 원본 PromptAsset id로 설정
* 복제 후 새 PromptAsset을 선택

2. PromptVersion에서 새 PromptAsset 파생

선택한 PromptVersion을 기반으로 새 PromptAsset을 만들 수 있어야 합니다.

UI 액션:

* “이 버전에서 새 프롬프트 만들기”
* “파생 프롬프트 생성”

동작:

* 선택된 PromptVersion의 original_input과 compiled_prompt를 기반으로 새 draft를 만들거나
* 즉시 새 PromptAsset + PromptVersion을 생성할 수 있음

권장 흐름:

* 즉시 저장하지 말고 PromptCompilerPanel draft로 보냅니다.
* originalInput은 원본 original_input 또는 사용자가 선택한 방식으로 채움
* compiledPrompt는 원본 compiled_prompt를 초안으로 채움
* scenario, targetAgent는 원본 PromptAsset metadata를 사용
* parent source info를 draft metadata로 보관
* 사용자가 수정 후 명시적으로 저장하면 새 PromptAsset 생성
* 저장 시 parent_prompt_id 또는 lineage record 생성

이유:

* 파생은 “새 작업”이므로 사용자가 수정할 시간을 줘야 합니다.
* 자동 저장은 불필요한 쓰레기 프롬프트를 양산합니다. 인간은 이미 충분히 많은 쓰레기 파일을 만들었습니다.

3. 파생 draft 상태

PromptCompilerPanel에 derived-from draft metadata를 추가합니다.

draft metadata 예:

* derivedFromPromptAssetId?: string | null
* derivedFromPromptVersionId?: string | null
* derivationType?: "duplicate" | "derived" | "templated_from" | "improved_from_review" | null

UI 표시:

* “원본: {prompt title} v{versionNumber}에서 파생”
* 원본 보기 버튼
* 파생 관계 해제 버튼

동작:

* 파생 관계 해제는 draft metadata만 제거
* originalInput과 compiledPrompt는 사용자가 명시적으로 지우지 않는 한 보존
* 파생 metadata 변경 시 stale analyze / compile / quality review 결과 초기화

4. Prompt Template 생성

선택한 PromptVersion을 Prompt Template으로 저장할 수 있어야 합니다.

UI 액션:

* “템플릿으로 저장”
* “Save as Prompt Template”

입력:

* name, 필수
* description, 선택
* variables, 선택
* tags, 선택
* scenario
* targetAgent
* template_body

template_body 기본값:

* 선택된 PromptVersion의 compiled_prompt를 기반으로 생성
* 사용자가 직접 편집 가능
* 반복해서 바뀌는 부분은 placeholder로 바꿀 수 있음

지원 placeholder 예:

* {{objective}}
* {{projectContext}}
* {{techStack}}
* {{taskDetails}}
* {{constraints}}
* {{acceptanceCriteria}}
* {{validationCommands}}
* {{additionalNotes}}

주의:

* 자동으로 placeholder를 과하게 만들지 마세요.
* MVP에서는 사용자가 직접 placeholder를 편집하게 해도 충분합니다.
* LLM을 사용해 template variables를 자동 추출하지 마세요.
* 자동 LLM 호출 금지

5. Prompt Template 목록 / 상세 / 편집 UI

Prompt Template을 관리할 수 있어야 합니다.

기능:

* 목록 표시
* 검색
* scenario 필터
* targetAgent 필터
* 상세 보기
* 생성
* 수정
* 복제
* 삭제
* source prompt로 이동, source가 있는 경우

표시 정보:

* name
* description
* scenario
* targetAgent
* variables
* source prompt title, 가능하면
* updated_at

주의:

* Prompt Template은 Harness Template과 다른 섹션에 표시하세요.
* 이름이 비슷해 사용자가 헷갈릴 수 있으므로 UI 라벨을 명확히 하세요.

  * Harness Template: 컴파일 규칙
  * Prompt Template: 재사용 프롬프트

6. Prompt Template 적용

PromptCompilerPanel에서 Prompt Template을 선택해 draft에 적용할 수 있어야 합니다.

동작:

* 템플릿 선택만으로 draft를 변경하지 않습니다.
* “템플릿 적용” 버튼을 명시적으로 눌렀을 때만 적용합니다.
* 적용 전 기존 originalInput 또는 compiledPrompt가 있으면 overwrite confirmation 표시
* append 옵션은 제공하지 않습니다.
* 적용 시 template_body를 compiledPrompt draft 또는 originalInput draft 중 어디에 넣을지 정책을 명확히 합니다.

권장 정책:

* Prompt Template은 compiledPrompt draft에 적용
* originalInput은 비워두거나 사용자가 별도 입력
* 템플릿 안에 {{taskDetails}} 같은 placeholder가 있으면 사용자가 채울 수 있게 표시

대안:

* template_body를 originalInput에 넣어 LLM compile의 입력으로 사용
* 이 경우 “템플릿을 원본 요청으로 사용”이라는 명확한 UI가 필요

MVP 권장:

* “compiledPrompt 초안으로 적용”
* 원본 originalInput은 자동 변경하지 않음
* 사용자가 명시적으로 originalInput도 덮어쓰겠다고 선택한 경우만 변경

7. Prompt Template 변수 입력

템플릿에 placeholder가 있으면 변수 입력 UI를 표시합니다.

동작:

* template_body에서 {{variableName}} 패턴 추출
* variableName 목록 표시
* 각 변수에 대한 textarea 또는 input 제공
* 사용자가 값을 입력하고 preview를 볼 수 있음
* “적용” 버튼을 누르면 placeholder가 입력값으로 치환된 결과를 draft에 반영

요구사항:

* placeholder 치환은 단순 문자열 치환
* unknown placeholder는 그대로 두거나 경고
* 입력값 whitespace 보존
* code block / Markdown / diff 훼손 금지
* eval / new Function 금지

8. Prompt lineage 보기

PromptAsset 상세 화면에서 파생 관계를 볼 수 있어야 합니다.

표시:

* 이 프롬프트가 어떤 PromptAsset / PromptVersion에서 파생되었는지
* 이 프롬프트에서 파생된 child prompts 목록
* relationship_type
* created_at
* source version 정보, 있으면

MVP UI:

* “원본 프롬프트” 카드
* “파생된 프롬프트” 목록

기능:

* 원본 프롬프트로 이동
* child prompt로 이동
* lineage 정보가 없으면 “파생 관계 없음” 표시

주의:

* 그래프 시각화는 필수 아닙니다.
* 트리/카드 목록이면 충분합니다.
* 복잡한 canvas나 graph library 추가하지 마세요.

9. 개선안에서 파생 관계 연결

Phase 14의 improvedPromptDraft를 새 PromptVersion으로 저장하거나 새 PromptAsset으로 만들 때 lineage를 기록할 수 있어야 합니다.

요구사항:

* improvedPromptDraft를 기존 PromptAsset의 새 version으로 저장하는 기존 흐름은 유지
* 만약 improvedPromptDraft를 새 PromptAsset으로 저장하는 옵션을 추가한다면 relationship_type은 improved_from_review
* prompt_quality_review_id를 저장하는 별도 필드는 선택
* 범위가 커지면 Phase 14의 기존 “새 버전 저장”만 유지하고, lineage 연결은 PromptAsset 파생에서만 구현

10. IPC API 요구사항

preload bridge에 다음 API를 추가하거나 기존 prompts API를 보완합니다.

Prompt derivation:

* window.prompter.prompts.duplicateAsset(input)
* window.prompter.prompts.createDerivedDraft(input), renderer-only draft helper면 IPC 불필요
* window.prompter.prompts.createAssetFromDerivedDraft(input)
* window.prompter.prompts.getLineage(promptAssetId)
* window.prompter.prompts.listChildren(promptAssetId)

Prompt templates:

* window.prompter.promptTemplates.create(input)
* window.prompter.promptTemplates.list(input?)
* window.prompter.promptTemplates.get(id)
* window.prompter.promptTemplates.update(id, input)
* window.prompter.promptTemplates.delete(id)
* window.prompter.promptTemplates.duplicate(id)
* window.prompter.promptTemplates.preview(input)
* window.prompter.promptTemplates.extractVariables(input)

선택:

* window.prompter.promptTemplates.createFromPromptVersion(input)

금지:

* promptRuns 관련 API 추가 금지
* executionResults 관련 API 추가 금지
* Codex 실행 API 추가 금지
* shortcuts/appEvents/globalShortcut API 추가 금지

11. Zod schema 요구사항

다음 schema를 정의합니다.

* DuplicatePromptAssetInputSchema
* CreateDerivedPromptAssetInputSchema
* PromptLineageSchema
* PromptLineageRelationshipTypeSchema
* CreatePromptTemplateInputSchema
* UpdatePromptTemplateInputSchema
* ListPromptTemplatesInputSchema
* DeletePromptTemplateInputSchema
* DuplicatePromptTemplateInputSchema
* CreatePromptTemplateFromVersionInputSchema
* PromptTemplatePreviewInputSchema
* ExtractPromptTemplateVariablesInputSchema

검증 규칙:

* promptAssetId는 빈 문자열 불가
* promptVersionId는 빈 문자열 불가
* name은 trim 후 빈 문자열 불가
* scenario는 허용된 enum
* targetAgent는 허용된 enum
* templateBody는 빈 문자열 불가
* variables는 string array 또는 JSON string을 안전하게 처리
* relationship_type은 허용 enum만 사용
* projectId는 string 또는 null
* tags 복사 여부는 boolean

추가하지 말아야 할 schema:

* PromptRunSchema
* AgentRunSchema
* ExecutionResultSchema
* ValidationResultSchema
* QuickCaptureSettingsSchema
* RegisterGlobalShortcutInputSchema

12. UI 구조 권장

Renderer:

* src/renderer/components/prompt/PromptDerivationActions.tsx
* src/renderer/components/prompt/PromptLineagePanel.tsx
* src/renderer/components/promptTemplates/PromptTemplateList.tsx
* src/renderer/components/promptTemplates/PromptTemplateDetail.tsx
* src/renderer/components/promptTemplates/PromptTemplateEditor.tsx
* src/renderer/components/promptTemplates/PromptTemplateSelector.tsx
* src/renderer/components/promptTemplates/PromptTemplatePreview.tsx
* src/renderer/hooks/usePromptTemplates.ts
* src/renderer/hooks/usePromptLineage.ts

Shared:

* src/shared/promptTemplates/promptTemplateTypes.ts
* src/shared/promptTemplates/promptTemplateSchemas.ts
* src/shared/promptTemplates/renderPromptTemplate.ts
* src/shared/promptTemplates/extractTemplateVariables.ts
* src/shared/promptLineage/promptLineageTypes.ts
* src/shared/promptLineage/promptLineageSchemas.ts

Main:

* src/main/repositories/promptTemplateRepository.ts
* src/main/services/promptTemplateService.ts
* src/main/ipc/promptTemplates.ts
* src/main/services/promptDerivationService.ts
* 기존 promptRepository 보완

Compiler 연결:

* 기존 PromptCompilerPanel draft state
* 기존 stale state 초기화 유틸
* 기존 createPromptAsset / createPromptVersion 흐름

13. stale state 규칙

다음 변경이 발생하면 기존 analyze / compile / quality review 결과는 stale 처리하거나 초기화해야 합니다.

초기화 트리거:

* promptTemplateId 변경
* prompt template 적용
* template variable 값 변경 후 적용
* derivedFromPromptAssetId 변경
* derivedFromPromptVersionId 변경
* compiledPrompt draft 변경
* originalInput 변경
* scenario 변경
* targetAgent 변경
* harnessTemplateId 변경
* projectContextProfileId 변경
* includeProjectContextProfile 변경

중요:

* stale state 초기화는 originalInput을 임의로 비우거나 바꾸면 안 됩니다.
* 템플릿 적용 전 confirmation이 필요한 경우 반드시 표시합니다.
* 템플릿 선택만으로 자동 적용하지 마세요.
* 템플릿 적용은 자동 LLM 호출을 실행하지 않습니다.
* 템플릿 적용은 자동 저장하지 않습니다.

14. 보안 요구사항

* Prompt Template body는 실행 가능한 코드가 아닙니다.
* eval, new Function, 동적 import 사용 금지
* placeholder 치환은 단순 문자열 치환만 수행합니다.
* renderer에서 DB, fs, path, process에 직접 접근하지 않습니다.
* renderer에서 ipcRenderer를 직접 사용하지 않습니다.
* prompt template 내용, originalInput, compiledPrompt를 불필요하게 console.log하지 마세요.
* 사용자가 템플릿에 secret을 넣을 수 있으므로 로그에 주의하세요.
* LLM 호출은 사용자가 명시적으로 analyze / compile / LLM review를 실행할 때만 발생해야 합니다.
* prompt execution 또는 외부 프로세스 실행 기능을 추가하지 않습니다.
* 실행 결과 저장 관련 테이블과 API를 추가하지 않습니다.

15. TDD 구현 순서

가능하면 다음 순서로 구현하세요.

1. prompt template schema 테스트 작성

* valid create input
* invalid name
* invalid scenario
* invalid targetAgent
* empty templateBody 거부
* variables JSON 처리
* tags JSON 처리

2. extractTemplateVariables 테스트 작성

* {{objective}} 추출
* 중복 변수 제거
* unknown 형식 무시
* code block 안 placeholder도 안전하게 추출
* whitespace 보존

3. renderPromptTemplate 테스트 작성

* placeholder 치환
* unknown placeholder 처리
* whitespace 보존
* code fence 보존
* diff block 보존
* original input cleanup 없음
* eval 실행 없음

4. prompt derivation service 테스트 작성, 가능하면

* duplicate asset
* duplicate creates new prompt asset
* duplicated version starts at version_number 1
* parent_prompt_id 설정
* tags copy option
* quality_score copy 정책 확인
* lineage 조회

5. prompt template repository/service 테스트, 가능하면

* create/list/get/update/delete
* duplicate
* createFromPromptVersion
* preview

6. renderer behavior 테스트, 가능하면

* template 선택만으로 draft 변경 없음
* apply 버튼 후 confirmation
* apply 후 compiledPrompt draft 변경
* apply 후 stale state 초기화
* derived draft가 parent metadata 표시
* lineage panel 표시

16. 파일별 예상 변경

예상 변경 파일:

* DB schema / migration 파일, prompt_templates 또는 prompt_asset_lineage 추가 시
* shared prompt template schema/type 파일 추가
* prompt template rendering utility 추가
* prompt template variable extraction utility 추가
* promptTemplateRepository 추가
* promptTemplateService 추가
* promptTemplates IPC handler 추가
* promptDerivationService 추가
* promptRepository 보완
* preload bridge 타입 추가
* PromptVersion detail actions에 duplicate / derive / save as template 추가
* PromptCompilerPanel에 promptTemplateId / derivedFrom metadata 추가
* PromptTemplateList / Detail / Editor / Selector 컴포넌트 추가
* PromptLineagePanel 추가
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

* renderer → DB 직접 접근
* renderer → Electron ipcRenderer 직접 접근
* renderer → fs/path/process 직접 접근
* prompt template → external agent execution
* prompt template → LLM auto call
* prompt derivation → prompt run history
* template rendering → executable code

18. 자동 테스트 목록

가능한 경우 다음 테스트를 추가하세요.

Schema:

* CreatePromptTemplateInputSchema accepts valid input
* rejects empty name
* rejects empty templateBody
* rejects invalid scenario
* rejects invalid targetAgent
* DuplicatePromptAssetInputSchema rejects empty promptAssetId
* CreatePromptTemplateFromVersionInputSchema rejects empty promptVersionId

Template utilities:

* extracts variables from template
* deduplicates variables
* renders placeholders with provided values
* preserves Markdown
* preserves code fences
* preserves diff blocks
* leaves unknown placeholders safe
* does not trim user-provided values
* does not execute template content

Derivation:

* duplicates prompt asset
* creates version_number 1 for duplicate
* sets parent_prompt_id or lineage record
* copies tags only when requested
* does not copy quality_score if policy says null
* creates derived asset from draft with parent metadata

Lineage:

* gets parent prompt
* lists child prompts
* handles no lineage
* handles deleted parent safely

UI behavior:

* selecting template does not modify draft
* applying template requires explicit action
* applying template with existing compiledPrompt asks confirmation
* applying template clears stale analyze/compile/review state
* derive action opens draft with source metadata
* saving derived draft records lineage

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

Phase 15에서 이 결정을 깨뜨리지 마세요.

21. 이번 단계에서 구현하지 말 것

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
* prompt template marketplace
* 원격 템플릿 다운로드
* 템플릿 안에서 코드 실행
* 템플릿 선택 시 자동 LLM 호출
* 템플릿 선택 시 자동 저장
* 템플릿 적용 시 append 옵션

완료 기준:

* PromptAsset을 복제할 수 있습니다.
* 복제된 PromptAsset은 원본과 parent 관계를 가집니다.
* 선택한 PromptVersion에서 새 derived draft를 만들 수 있습니다.
* derived draft는 원본 PromptAsset / PromptVersion 정보를 표시합니다.
* derived draft를 저장하면 새 PromptAsset과 lineage가 기록됩니다.
* 선택한 PromptVersion을 Prompt Template으로 저장할 수 있습니다.
* Prompt Template 목록, 상세, 생성, 수정, 복제, 삭제 UI가 구현되어 있습니다.
* Prompt Template의 placeholder 변수를 추출하고 입력값으로 preview할 수 있습니다.
* Prompt Template 선택만으로 draft가 변경되지 않습니다.
* Prompt Template 적용은 사용자의 명시적 액션과 confirmation을 통해서만 수행됩니다.
* Prompt Template 적용 후 stale analyze / compile / quality review state가 초기화됩니다.
* PromptAsset 상세에서 원본과 child prompts lineage를 볼 수 있습니다.
* template content는 코드로 실행되지 않습니다.
* 모든 IPC 입력값은 Zod로 검증됩니다.
* renderer는 DB, fs, path, process, ipcRenderer에 직접 접근하지 않습니다.
* Phase 11, 12, 13, 14 guardrail이 유지됩니다.
* TypeScript 타입 검사가 통과합니다.
* 앱이 개발 모드에서 정상 실행됩니다.
* 프롬프트 실행이나 실행 결과 저장 기능은 추가되지 않았습니다.

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
```

# Phase 16

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

```



# Phase 17



# Phase 18



# Phase 19



# Phase 20


