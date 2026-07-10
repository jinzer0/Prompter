# Prompter QA Checklist

Use this checklist after Phase 10 changes and before release packaging.

## Automated Gates

- [ ] `npm run typecheck` exits 0.
- [ ] `npm run lint` exits 0.
- [ ] `npm test` exits 0.
- [ ] `npm run build` exits 0.
- [ ] `npm run package` creates `release/Prompter-darwin-${process.arch}/Prompter.app`.
- [ ] `npm run package` creates `release/Prompter-darwin-${process.arch}.zip`.
- [ ] Packaged `Prompter.app` opens without a missing-executable error.
- [ ] `npm run test:smoke` exits 0, or the exact blocker is recorded.

## Manual App Flow

- [ ] App starts in development mode.
- [ ] Project can be created.
- [ ] Existing project can be selected.
- [ ] Prompt can be created manually.
- [ ] Static template compile produces compiled prompt content.
- [ ] LLM analyze shows clarification state when configured with a test client or valid key.
- [ ] LLM compile produces required compiled prompt sections when configured.
- [ ] Compiled prompt can be saved as a PromptAsset and PromptVersion.
- [ ] Existing prompt can receive a new version.
- [ ] Current version can be changed.
- [ ] Version diff displays added, removed, and unchanged lines.
- [ ] Search returns matching prompts.
- [ ] Empty search shows a no-results state.
- [ ] Tag can be created.
- [ ] Tag can be attached and detached.
- [ ] Suggested tags from compiler flow can be saved.
- [ ] Export preview, copy, and file save work for supported formats.
- [ ] Settings defaults save and reload.
- [ ] OpenAI API key can be saved, masked, and deleted.
- [ ] App restart preserves projects, prompts, versions, tags, and settings.

## Keyboard And Menu

- [ ] CmdOrCtrl+N opens the new prompt flow when a project is selected.
- [ ] CmdOrCtrl+Shift+N opens the new project flow.
- [ ] CmdOrCtrl+F focuses the prompt search input when visible.
- [ ] CmdOrCtrl+S saves the current compiled prompt when available.
- [ ] CmdOrCtrl+Shift+C copies the current compiled prompt when available.
- [ ] CmdOrCtrl+, focuses the settings panel.
- [ ] Esc or close action does not corrupt unsaved form state.
- [ ] Development-only Reload and Toggle Developer Tools are absent from production menu templates.

## Security And Scope

- [ ] Renderer does not import Electron, Node filesystem/path/process APIs, SQLite, Drizzle, or safeStorage.
- [ ] Renderer does not access `ipcRenderer` directly.
- [ ] BrowserWindow keeps `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.
- [ ] Raw OpenAI API key is not visible in renderer state, logs, exports, settings rows, or screenshots.
- [ ] Exported content does not include API keys or secret file paths.
- [ ] Packaged app uses Electron `userData` for `prompter.sqlite`.
- [ ] Packaged app can find Drizzle migration files.
- [ ] No `prompt_runs`, `agent_runs`, `execution_results`, `validation_results`, or `run_logs` table/data exists.
- [ ] No prompt execution, external-agent launch, cloud sync, account, vector search, embedding, plugin, or team-collaboration feature was added.

## Attribution

Created with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent).
