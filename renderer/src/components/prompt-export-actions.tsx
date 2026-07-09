import { useId, useState } from "react"

import type { ExportFormat } from "../../../electron/ipc-types"
import {
  type PromptExportBase,
  type PromptExportChoice,
  parsePromptExportChoice,
  promptExportChoiceLabels,
  promptExportOptions,
} from "../lib/prompt-export"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Select } from "./ui/select"
import { Textarea } from "./ui/textarea"

type PromptExportActionsProps = {
  readonly copyButtonLabel: string
  readonly exportBase: PromptExportBase | null
  readonly formatLabel: string
  readonly rawContent: string
  readonly saveButtonLabel: string
  readonly title: string
}

function isExportFormat(format: PromptExportChoice): format is ExportFormat {
  return format !== "raw"
}

export function PromptExportActions({
  copyButtonLabel,
  exportBase,
  formatLabel,
  rawContent,
  saveButtonLabel,
  title,
}: PromptExportActionsProps) {
  const [selectedFormat, setSelectedFormat] = useState<PromptExportChoice>("raw")
  const [message, setMessage] = useState<string | null>(null)
  const [previewContent, setPreviewContent] = useState<string | null>(null)
  const [isWorking, setIsWorking] = useState(false)
  const formatSelectId = useId()
  const hasContent = rawContent.trim().length > 0
  const selectedLabel = promptExportChoiceLabels[selectedFormat]

  async function formattedContent(): Promise<string | null> {
    if (!hasContent) {
      setMessage("No content to export.")
      return null
    }

    if (!isExportFormat(selectedFormat)) {
      return rawContent
    }

    if (exportBase === null) {
      setMessage("No content to export.")
      return null
    }

    const result = await window.prompter.exports.formatPrompt({
      ...exportBase,
      compiledPrompt: rawContent,
      format: selectedFormat,
    })
    return result.content
  }

  async function previewExport(): Promise<void> {
    setIsWorking(true)
    setMessage(null)

    try {
      const content = await formattedContent()
      if (content !== null) {
        setPreviewContent(content)
        setMessage(`Previewed ${selectedLabel}.`)
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Export preview could not be prepared.")
    } finally {
      setIsWorking(false)
    }
  }

  async function copyExport(): Promise<void> {
    setIsWorking(true)
    setMessage(null)

    try {
      const content = await formattedContent()
      if (content !== null) {
        await window.prompter.clipboard.copyText({ text: content })
        setMessage(`Copied ${selectedLabel}.`)
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Export could not be copied.")
    } finally {
      setIsWorking(false)
    }
  }

  async function saveExport(): Promise<void> {
    setIsWorking(true)
    setMessage(null)

    try {
      if (!hasContent) {
        setMessage("No content to export.")
        return
      }

      const result = isExportFormat(selectedFormat)
        ? exportBase === null
          ? null
          : await window.prompter.exports.savePromptToFile({
              ...exportBase,
              compiledPrompt: rawContent,
              format: selectedFormat,
            })
        : await window.prompter.exports.savePromptToFile({
            content: rawContent,
            format: "markdown",
          })

      if (result === null) {
        setMessage("No content to export.")
        return
      }

      setMessage(result.cancelled ? "Save cancelled." : `Saved ${selectedLabel}.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Export could not be saved.")
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Choose a format, preview it, then copy or save through Prompter.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <label className="grid gap-2" htmlFor={formatSelectId}>
          <span className="font-mono text-[11px] text-muted">format</span>
          <Select
            aria-label={formatLabel}
            id={formatSelectId}
            value={selectedFormat}
            onChange={(event) =>
              setSelectedFormat(parsePromptExportChoice(event.currentTarget.value))
            }
          >
            {promptExportOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={!hasContent || isWorking}
            onClick={previewExport}
          >
            Preview export
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!hasContent || isWorking}
            onClick={copyExport}
          >
            {copyButtonLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!hasContent || isWorking}
            onClick={saveExport}
          >
            {saveButtonLabel}
          </Button>
        </div>
        {message !== null && <p className="text-[12px] text-muted-strong">{message}</p>}
        {previewContent !== null && (
          <Textarea
            readOnly
            aria-label={`${title} formatted export preview`}
            className="min-h-32"
            value={previewContent}
            variant="preview"
          />
        )}
      </CardContent>
    </Card>
  )
}
