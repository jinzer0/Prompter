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
