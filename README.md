# Prompter

Prompter is a local-first macOS Electron app for saving, organizing, versioning,
searching, compiling, and exporting prompts for coding-agent workflows.

## Stack

- Electron main/preload for native shell, IPC, SQLite, file export, clipboard, and secret storage.
- Vite, React, and TypeScript renderer.
- SQLite through `better-sqlite3` and Drizzle ORM migrations in `drizzle/`.
- Zod IPC contracts in `electron/ipc-contract.ts`.
- Vitest for unit, contract, persistence, and compiler tests.
- Playwright for Electron smoke and UI scenarios.
- Biome for linting and formatting.

## Development

Install dependencies:

```bash
npm install
```

Run the app in development:

```bash
npm run dev
```

Run static checks and tests:

```bash
npm run typecheck
npm run lint
npm test
```

Build production assets:

```bash
npm run build
```

Run Electron smoke tests:

```bash
npm run test:smoke
```

Create an unsigned local macOS app bundle and zip archive:

```bash
npm run package
```

`npm run make` currently aliases `npm run package`.

## Local Data And Secrets

Prompter stores production app data under Electron `userData` in `prompter.sqlite`.
Drizzle migrations are loaded from the packaged `drizzle/` folder. Tests must use temp
SQLite databases and must not touch the userData database.

OpenAI API keys are handled only in the Electron main process through safeStorage-backed
secret storage. The renderer can request only key status and masked values. Raw keys must
not be exposed through the preload bridge, logs, exports, settings rows, or tests.

## App Lock Security Boundary

Phase 20 adds an optional local app lock for protecting the visible Prompter session. Users
enable it from Settings by setting a passphrase, then can lock the app manually from Settings,
`File > Lock Prompter`, or the app-focused `CmdOrCtrl+Shift+L` menu accelerator. This is not an OS global
shortcut.

When app lock is enabled, Prompter can lock on start and can auto-lock after the configured
inactivity timeout. Keydown and pointer activity reset the inactivity timer; focus or visibility
restoration checks the existing deadline and locks immediately if it has elapsed. Locking hides
sensitive workspace UI and blocks locked-state access to sensitive IPC paths such as prompt library
data, Prompt Compiler analyze/compile, exports, backups, clipboard reads, project context,
templates, quality review, privacy, and maintenance actions. Unlocking does not auto-save drafts or
start analyze, compile, review, export, backup, or maintenance work.

Prompter stores passphrase verification data as a salted hash with KDF metadata in the main
process data path. The passphrase itself is not stored in plaintext, returned to the renderer, or
written to logs. There is no passphrase recovery, reset flow, or destructive app-data reset in
Phase 20. If the passphrase is lost, the app lock cannot be unlocked through Prompter.

The app lock protects the Prompter UI and in-app session access only. It does not encrypt
`prompter.sqlite` or other SQLite files, and it does not protect against a compromised OS account,
direct filesystem access, malware, screen capture, screen recording, or an attacker with disk
access. Full database encryption is not part of Phase 20.

## MVP Features

- Project creation and project-scoped prompt libraries.
- Prompt asset creation with versioned prompt content.
- Current-version selection and version diff display.
- SQLite FTS search with project, tag, scenario, and target-agent filters.
- Tag creation, attachment, detachment, and suggested-tag save flow.
- Project context profiles with defaults, compiler preview, and saved context fields.
- Harness templates for scenario/agent-specific compiler requirements.
- Static and LLM-assisted prompt compilation with harness and project context input.
- Prompt templates, template derivation from saved versions, and source lineage display.
- Local prompt quality review for drafts and saved versions, including score application.
- OpenAI key status, save, and delete settings flow.
- Markdown, Codex, Claude Code, Cursor, Generic Agent, AGENTS.md snippet, and SKILL.md draft
  exports.
- Clipboard copy, clipboard import into Prompt Compiler, and native file export.
- Full library, project, prompt asset, prompt template, and harness template backup export.
- Backup validation, conflict preview, session-based import, and post-import library refresh.
- Manual Maintenance scans, action previews, confirmation sessions, and selected cleanup actions.
- macOS app menu and keyboard shortcuts, including quick capture from clipboard.
- Optional app lock with manual lock, app-focused `CmdOrCtrl+Shift+L`, lock-on-start,
  activity-based auto-lock, passphrase hashing, locked UI hiding, and sensitive IPC guards.
- Local read-only Library Insights with project and date filters, dashboard cards,
  library health, quality, activity, tag, template, context, and maintenance snapshots.
- Insights navigation opens library items without changing Prompt Compiler state unless
  the user explicitly navigates to compiler context.
- Compiler output is editable while bound to the selected project. When Insights navigation
  preserves output across a project change, analyze, compile, template, and save actions pause
  until Rebind; Copy stays available for the preserved output.

## Explicitly Excluded

- Prompt execution.
- Insights LLM calls, automatic maintenance scans, scheduled cleanup, automatic fixes,
  external repository scans, and repo-path filesystem reads.
- Insights never starts Maintenance. Manual Phase 17 Maintenance remains available from Settings,
  with user-triggered scans, previews, confirmation, and selected actions.
- Codex, Claude Code, Cursor, or external app launching.
- Codex OAuth.
- Prompt run/result/history storage.
- `prompt_runs`, `agent_runs`, `execution_results`, `validation_results`, or `run_logs` tables.
- Cloud sync, accounts, billing, remote server features, vector search, embeddings, plugins, and
  team collaboration.
- App-lock passphrase recovery, reset, destructive app-data reset, database encryption, OS account
  protection, malware protection, or screen-capture protection.

## Packaging Status

`scripts/package-macos.mjs` creates an unsigned local macOS app bundle at
`release/Prompter-darwin-${process.arch}/Prompter.app` and a zip archive at
`release/Prompter-darwin-${process.arch}.zip` after `npm run build`. The package
includes `dist/`, `dist-electron/`, `drizzle/`, `package.json`, and `node_modules/`
so `better-sqlite3` and migrations are available at runtime.

Apple Developer ID signing and notarization are not automated. Add those steps only when
a valid certificate and notarization credentials are available.

## Attribution

Created with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent).
