# Prompter

A local-first macOS app for turning rough ideas into reusable prompts for coding agents.

[Releases](https://github.com/jinzer0/Prompter/releases)

## Features

- **Prompt Compiler** - Turn an unfinished request into a structured prompt with optional OpenAI assistance.
- **Prompt Library** - Save, search, tag, organize, and version prompts by project.
- **Agent-ready exports** - Export prompts for Codex, Claude Code, Cursor, generic agents, `AGENTS.md`, and `SKILL.md`.
- **Templates and context** - Reuse prompt templates, harness requirements, and project context profiles.
- **Quality review** - Review prompt clarity and save improved versions.
- **Quick capture** - Bring clipboard text directly into the compiler.
- **Backup and maintenance** - Export, import, inspect, and clean up the local library.
- **Privacy controls** - Detect potentially sensitive content, encrypt backups, and lock the app with a passphrase.
- **Local-first storage** - Prompts stay on your Mac. No account or cloud service is required.

## Installation

### macOS (Apple Silicon)

1. Download `Prompter-0.1.0-mac-arm64.dmg` from
   [Releases](https://github.com/jinzer0/Prompter/releases).
2. Open the DMG and drag `Prompter.app` to `Applications`.
3. Launch Prompter from `Applications`.

Release builds are currently unsigned. If macOS blocks the first launch, right-click the app and
choose **Open**, or allow it from **System Settings > Privacy & Security**.

### From Source

Requires Node.js, npm, and the Xcode Command Line Tools.

```bash
git clone https://github.com/jinzer0/Prompter.git
cd Prompter
npm install
npm run dev
```

To create a local macOS app bundle, ZIP, and DMG:

```bash
npm run package
```

The packaged app is written to `release/`.

## Basic Use

1. Create a project or select an existing one.
2. Write or paste a request into Prompt Compiler.
3. Compile, review, and edit the result.
4. Save it to the library or export it for your coding agent.

OpenAI features are optional. Add an API key in Settings to enable LLM-assisted compilation.

## Built With

Electron · React · TypeScript · SQLite

## Attribution

Created with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent).
