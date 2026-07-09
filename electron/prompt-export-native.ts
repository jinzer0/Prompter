import type {
  CopyTextInput,
  CopyTextResult,
  ExportFormat,
  ExportPromptResult,
  FormatPromptForExportInput,
  SavePromptToFileInput,
  SavePromptToFileResult,
} from "./ipc-types.js"
import { formatPromptExport } from "./prompt-export-formatters.js"

type SaveDialogFilter = {
  readonly name: string
  readonly extensions: readonly string[]
}

type SaveDialogOptions = {
  readonly defaultPath: string
  readonly filters: readonly SaveDialogFilter[]
}

type SaveDialogResult = {
  readonly canceled: boolean
  readonly filePath?: string
}

export type PromptExportNativeDependencies = {
  readonly showSaveDialog: (options: SaveDialogOptions) => Promise<SaveDialogResult>
  readonly writeFile: (filePath: string, content: string) => Promise<void>
  readonly copyText: (text: string) => void
}

export type PromptExportNativeService = ReturnType<typeof createPromptExportNativeService>
type DirectSavePromptToFileInput = Extract<SavePromptToFileInput, { readonly content: string }>

function assertNever(value: never): never {
  throw new Error(`Unexpected export format: ${String(value)}`)
}

function defaultFilename(format: ExportFormat): string {
  switch (format) {
    case "markdown":
      return "prompt-export.md"
    case "codex":
      return "prompt-export.codex.md"
    case "claude_code":
      return "prompt-export.claude.md"
    case "cursor":
      return "prompt-export.cursor.md"
    case "generic_agent":
      return "prompt-export.agent.md"
    case "agents_md":
      return "AGENTS.snippet.md"
    case "skill_md":
      return "SKILL.md"
    default:
      return assertNever(format)
  }
}

function isDirectSavePromptToFileInput(
  input: SavePromptToFileInput,
): input is DirectSavePromptToFileInput {
  return "content" in input
}

function directExportResult(input: DirectSavePromptToFileInput): ExportPromptResult {
  return {
    format: input.format,
    filename: input.filename ?? defaultFilename(input.format),
    content: input.content,
    mimeType: "text/markdown",
  }
}

function exportResultForSave(input: SavePromptToFileInput): ExportPromptResult {
  if (isDirectSavePromptToFileInput(input)) {
    return directExportResult(input)
  }

  const formatted = formatPromptExport(input)

  return input.filename === undefined ? formatted : { ...formatted, filename: input.filename }
}

export function createPromptExportNativeService(dependencies: PromptExportNativeDependencies) {
  return {
    formatPromptForExport(input: FormatPromptForExportInput): ExportPromptResult {
      return formatPromptExport(input)
    },
    async savePromptToFile(input: SavePromptToFileInput): Promise<SavePromptToFileResult> {
      const result = exportResultForSave(input)
      const dialogResult = await dependencies.showSaveDialog({
        defaultPath: result.filename,
        filters: [{ name: "Markdown", extensions: ["md"] }],
      })

      if (dialogResult.canceled) {
        return { cancelled: true }
      }

      if (dialogResult.filePath === undefined || dialogResult.filePath.trim().length === 0) {
        throw new Error("Save dialog did not return a file path")
      }

      await dependencies.writeFile(dialogResult.filePath, result.content)

      return { cancelled: false, filePath: dialogResult.filePath }
    },
    async copyText(input: CopyTextInput): Promise<CopyTextResult> {
      dependencies.copyText(input.text)
      return { copied: true }
    },
  }
}
