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

## MVP Features

- Project creation and project-scoped prompt libraries.
- Prompt asset creation with versioned prompt content.
- Current-version selection and version diff display.
- SQLite FTS search with project, tag, scenario, and target-agent filters.
- Tag creation, attachment, detachment, and suggested-tag save flow.
- Static and LLM-assisted prompt compilation.
- OpenAI key status, save, and delete settings flow.
- Markdown, Codex, Claude Code, Cursor, Generic Agent, AGENTS.md snippet, and SKILL.md draft exports.
- Clipboard copy and native file export.
- macOS app menu and keyboard shortcuts for existing app actions.

## Explicitly Excluded

- Prompt execution.
- Codex, Claude Code, Cursor, or external app launching.
- Codex OAuth.
- Prompt run/result/history storage.
- `prompt_runs`, `agent_runs`, `execution_results`, `validation_results`, or `run_logs` tables.
- Cloud sync, accounts, billing, remote server features, vector search, embeddings, plugins, and team collaboration.

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
