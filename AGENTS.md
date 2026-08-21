# Project Overview

Prompter is a macOS-focused Electron native app for saving, organizing, versioning,
searching, and compiling prompts for coding and agent workflows.

Main stack:

- Electron main/preload process for native shell, IPC, SQLite, clipboard, file dialogs, and
  secret storage.
- Vite + React + TypeScript renderer for the UI.
- SQLite through `better-sqlite3`.
- Drizzle ORM and checked-in migrations under `drizzle/`.
- Zod-based IPC contracts in `electron/ipc-contract.ts`.
- OpenAI-powered prompt compiler in `electron/prompt-compiler/`.
- Local services for project context, quality review, backup/import, manual maintenance, and
  read-only Insights.
- Biome for linting and formatting.
- Vitest and Playwright for contract, persistence, compiler, UI, and smoke tests.

# Repository Map

- `electron/main.ts`: Electron startup, user-data database opening, migration folder wiring,
  safeStorage-backed OpenAI key store setup, prompt compiler test-client injection, IPC
  registration, and BrowserWindow creation.
- `electron/preload.ts`: safe `contextBridge` exposure of `window.prompter` through the typed
  bridge.
- `electron/bridge.ts` and `electron/bridge-types.ts`: typed renderer-facing API that validates
  payloads and responses around `ipcRenderer.invoke`.
- `electron/ipc-contract.ts`: central source of truth for IPC channels, payload schemas, response
  schemas, scenarios, target agents, settings defaults, secret status, prompt compiler output
  requirements, project contexts, quality reviews, backups, maintenance, and Insights.
- `electron/ipc-handlers.ts`: main-process validation and service dispatch boundary. Payloads are
  parsed here before repositories or services are called.
- `electron/db/schema.ts`: Drizzle schema for projects, prompt assets, prompt versions, tags,
  prompt/tag links, harness templates, project context profiles and values, prompt templates,
  prompt quality reviews, and settings.
- `electron/db/repositories/*`: persistence behavior for projects, prompts, versions, tags,
  harness templates, project context profiles, prompt templates and lineage, quality reviews,
  settings, and search.
- `electron/db/services.ts`: app database service bundle, including repositories, search,
  backups, manual maintenance scanning, and Insights service wiring used by IPC.
- `electron/prompt-compiler/*`: static and LLM prompt compiler prompts, service, OpenAI client,
  test client, project context builder, and compiler context assembly.
- `electron/prompt-quality/*`: local prompt quality review, saved review access, and quality score
  application to prompt versions. LLM review currently returns unavailable or missing-key status.
- `electron/backup/*`: JSON backup export, validation preview, import conflict resolution,
  session storage, native save/open dialogs, and import writing.
- `electron/maintenance/*`: user-triggered scan reports, action planning, preview sessions,
  confirmation flow, and selected manual maintenance actions.
- `electron/insights/*`: read-only local dashboard queries for health, quality, activity, tags,
  templates, project context, and maintenance availability. Insights must not mutate data or start
  maintenance.
- `electron/secrets/*`: OpenAI key encryption, masked status, deletion, and main-process-only key
  retrieval.
- `renderer/src/*`: React UI, hooks, component wrappers, renderer-only prompt compiler helpers,
  workspace navigation, compiler binding/default handling, project context, templates, backup,
  maintenance, Insights, and styles.
- `tests/*`: Electron contract tests, persistence tests, migration/schema tests, compiler tests,
  UI tests, and Playwright smoke tests.
- `DESIGN.md`: visual design system and UI constraints for the compact dark native shell.

# Architecture Rules

1. The renderer must not import or access Node, Electron internals, SQLite, Drizzle, filesystem
   APIs, paths, or environment variables directly.
2. Renderer code must go through the typed `window.prompter` bridge exposed by preload.
3. IPC changes must start in `electron/ipc-contract.ts`, then be reflected through bridge types,
   bridge implementation, handlers, services/repositories, and tests.
4. Database schema changes must update Drizzle schema and migrations together.
5. Prompt compiler changes must preserve the required compiled prompt sections defined in
   `COMPILED_PROMPT_REQUIRED_SECTIONS`.
6. Do not add new scenarios or target agents without updating schemas, UI options, compiler
   prompts, tests, and any defaults that depend on them.
7. Do not add prompt execution/run-result storage unless the task explicitly asks for it.
8. Insights is read-only. It may navigate back into Library or Settings, but must not auto-run
   maintenance scans, actions, fixes, LLM calls, repo scans, or filesystem reads.
9. Manual Maintenance is allowed only through explicit user actions with scan, preview,
   confirmation, and session checks. Do not claim persisted maintenance reports or scheduled scans.

# Security and Secrets

- Never expose raw OpenAI API keys to renderer code.
- Never add a plaintext `getOpenAIKey` bridge method.
- Secret storage belongs in the Electron main process.
- User-facing secret APIs may return only key status or masked values.
- Do not log secrets, write secrets to tests, or store secrets in settings.
- Do not commit `.env`, SQLite databases, local runtime state, logs, build output, or agent state
  directories such as `.codegraph/` or `.omo/`.

# Development Commands

- `npm run dev`: start Vite and Electron in development.
- `npm run build`: typecheck, rebuild native Electron module, bundle Electron, and build renderer.
- `npm run lint`: run Biome checks.
- `npm run typecheck`: run TypeScript checks for Electron, renderer, and tests.
- `npm test`: rebuild native SQLite module for Node and run Vitest.
- `npm run test:smoke`: rebuild native Electron module and run Playwright smoke tests.
- `npm run db:generate`: generate Drizzle migrations after schema changes.

Docs-only edits usually do not require the full test suite. Code changes should run the narrowest
relevant tests plus `npm run typecheck` and `npm run lint` when practical.

# Native Module Notes

- `better-sqlite3` is a native dependency.
- Electron and Node test environments require different rebuild paths.
- Use the existing `native:electron` and `native:node` scripts instead of inventing new rebuild
  commands.
- Do not commit generated build artifacts or local SQLite files.

# Code Style

Follow `biome.json`:

- 2-space indentation.
- 100-character line width.
- Double quotes.
- Semicolons as needed, not mandatory.
- Prefer `import type` for type-only imports.
- No explicit `any`.
- No non-null assertions.
- No parameter reassignment.
- Remove unused imports and variables.

# UI and Design Rules

Follow `DESIGN.md` and the existing renderer shell:

- Preserve the compact dark native command-center feel.
- Follow the existing three-panel layout: left sidebar, prompt library, and prompt compiler.
- Library remains the canonical three-panel workspace. Insights may intentionally keep the left
  sidebar visible while replacing the Library and Compiler columns with its dashboard workspace.
- Use existing design tokens and CSS variables from `renderer/src/styles.css`.
- Do not introduce new visual colors unless `DESIGN.md` is updated.
- Preserve visible focus states and keyboard accessibility.
- Prefer local component wrappers over raw one-off controls when matching existing UI patterns.
- Keep required desktop Library panels visible outside the Insights workspace swap; do not collapse
  required panels casually.

# Testing Guidance by Change Type

- IPC contract change: update contract schemas, bridge, handlers, services, and contract tests.
- Renderer feature: update hooks/components and UI tests where relevant.
- DB schema change: update schema, migration, repositories, and persistence tests.
- Prompt compiler change: update compiler prompts/service tests and ensure required output sections
  are preserved.
- Secret/settings change: update security contract tests.
- Search/versioning change: update search/version tests.
- Visual layout change: check against `DESIGN.md` and smoke tests.

# Working Style for Agents

- Inspect nearby files before editing.
- Keep changes small and scoped.
- Prefer existing patterns over new abstractions.
- Avoid dependency additions unless explicitly justified.
- Update tests with behavior changes.
- Do not "fix" unrelated code.
- Do not rewrite large files just for formatting.
- Preserve public contracts unless the task asks to change them.
- State assumptions clearly in the final response.

# Final Response Format

Future agents should end with:

- Summary of changes.
- Files changed.
- Validation run, or why validation was skipped.
- Risks or follow-up notes.

# Attribution

Created with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent).

# Hyper-Waterfall 운영 규칙

이 섹션은 Prompter에 적용된 하이퍼-워터폴 방법론의 운영 규칙이다. 절차 상세는
`mydocs/manual/`과 `mydocs/skills/`에 분리한다.

## Prompter 규칙 우선순위

- 이 섹션 위에 있는 Prompter의 프로젝트 개요, 아키텍처, 보안, 개발 명령, 코드 스타일,
  UI, 테스트, 작업 방식 규칙은 그대로 유지되며 이 방법론보다 우선한다.
- 하이퍼-워터폴 절차가 기존 Prompter 규칙과 충돌하면, 기존 Prompter 규칙을 따르고
  작업지시자에게 충돌을 보고한다.
- 프로젝트 고유 규칙의 원문은 이 파일의 기존 섹션에만 유지한다. 이 섹션은 이를
  완화하거나 재정의하지 않는다.

## 하이퍼-워터폴 핵심 규칙

이 프로젝트는 **하이퍼-워터폴** 방법론을 적용한다. 에이전트의 기본 동작(빠른 실행,
자율 수정)과 충돌하므로 반드시 숙지한다. 상세:
[`agent_code_hyperfall_rule_conflict.md`](mydocs/manual/agent_code_hyperfall_rule_conflict.md).

- 소스 수정 전 반드시 작업지시자 승인 요청
- 작업은 GitHub Issue 기준으로 추적
- 새 기능, 버그 수정, 구조 변경은 `이슈 -> 브랜치 -> 오늘할일 -> 계획서 -> 구현 -> 검증 -> 최종 보고서 -> PR` 순서 절대 생략 금지
- 각 단계 완료 후 승인 없이 다음 단계 진행 금지
- 범위가 불명확하거나 기존 작업과 충돌할 가능성이 있으면 먼저 확인
- 사용자나 다른 작업자가 만든 변경은 되돌리지 않음
- 이슈 close는 작업지시자 승인 후 또는 PR merge 확인 후에만 수행
- 문서 수정은 기존 내용을 먼저 읽고 필요한 부분만 수정하며, 불가피할 때만 내용을 추가
- 제품/사용자/기여자/외부 통합/API/아키텍처/로드맵 문서를 생성, 이동, 수정할 때는 수행계획서에 문서 위치 판단을 기록하고 승인받음
- `mydocs/manual`은 대상 프로젝트 제품 문서 위치가 아니며, 공식 문서 루트(`docs/`, `specs/`, `site/`, `website/`, `adr/` 등)는 대상 프로젝트가 별도 task에서 명시적으로 선택
- 작업 완료 후 다음 작업에 필요하지 않은 로컬/원격 부산물은 정리
- PR merge와 이슈 close 후에는 `master`로 돌아오고, 더 이상 필요 없는 `local/task{번호}` 브랜치와 임시 worktree를 정리

**승인 간주 조건**: 작업지시자가 같은 스레드에서 "계속 진행", "다음 단계 진행"처럼
명시 지시한 경우에만 해당 단계 승인으로 간주한다.

## 명명 규칙

- 마일스톤: `M{버전}` (예: M100=v1.0.0, M05x=v0.5.x). 문서 파일명은 `m{숫자}` 소문자 (예: `m100`)
- 브랜치: `local/task{이슈번호}` (작업), `publish/task{이슈번호}` (`master` 대상 PR 게시용)
- 커밋 메시지:
  - 기본형: `Task #{번호}: 내용`
  - 단계: `Task #{번호} Stage {N}: 내용`
  - 하위 단계: `Task #{번호} [Stage {N.M}]: 내용`
  - 보고서 묶음: `Task #{번호} Stage {N} + 최종 보고서: 내용`
- 문서 파일명: `task_{milestone}_{이슈번호}{_impl|_stage{N}|_report}?.md`. 신규 문서는 마일스톤 포함 형식 강제. 상세: [`document_structure_guide.md`](mydocs/manual/document_structure_guide.md)
- 모든 문서는 이 저장소에 선택된 Hyper-Waterfall locale로 작성한다.

## 필수 참조 문서

- [`README.md`](README.md) - 프로젝트 개요, 초기 설정, 빌드
- [`DESIGN.md`](DESIGN.md) - Prompter 시각 디자인 시스템과 UI 제약
- [`docs/plan/plan.md`](docs/plan/plan.md) - 읽기 전용 프로젝트 계획; 수정하지 않음
- [`mydocs/manual/document_structure_guide.md`](mydocs/manual/document_structure_guide.md) - `mydocs/` 폴더 역할, 문서 파일명, 외부 PR 폴더 정책, Skills 위치 정책
- [`mydocs/manual/task_workflow_guide.md`](mydocs/manual/task_workflow_guide.md) - 타스크 진행 15단계, 커밋 메시지 규칙, 작업 시간 규칙
- [`mydocs/manual/git_workflow_guide.md`](mydocs/manual/git_workflow_guide.md) - 브랜치 정책, Git 다이어그램, 메인테이너/컨트리뷰터 워크플로우
- [`mydocs/manual/pr_process_guide.md`](mydocs/manual/pr_process_guide.md) - 외부 기여 PR 검토
- [`mydocs/manual/agent_code_hyperfall_rule_conflict.md`](mydocs/manual/agent_code_hyperfall_rule_conflict.md) - 하이퍼-워터폴과 에이전트 기본 동작 충돌 규칙

## Agent Skills

하이퍼-워터폴 절차의 정형 시점은 SKILL로 분리한다. 진실 원천은 `mydocs/skills/`이며,
Codex(`.agents/skills`)와 Claude Code(`.claude/skills`)는 심볼릭 링크로 동일 본문을
인식한다. 상세: [`document_structure_guide.md`](mydocs/manual/document_structure_guide.md)의
"Agent Skills 위치 정책".

## 작업 규칙

- 작업 시간의 시작과 종료는 작업지시자가 결정한다. 에이전트가 임의로 작업 종료를 제안하거나 시간을 한정하지 않는다.
