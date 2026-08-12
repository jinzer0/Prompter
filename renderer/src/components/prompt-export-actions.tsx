import { useId, useState } from "react"

import type { ExportFormat } from "../../../electron/ipc-types"
import { usePromptExportDestinations } from "../hooks/use-prompt-export-destinations"
import {
  type PromptExportBase,
  type PromptExportChoice,
  parsePromptExportChoice,
  promptExportChoiceLabels,
  promptExportOptions,
} from "../lib/prompt-export"
import { PrivacyWarningDialog } from "./privacy/privacy-warning-dialog"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Select } from "./ui/select"
import { Textarea } from "./ui/textarea"

type PromptExportActionsProps = {
  readonly canSaveToFile: boolean
  readonly copyButtonLabel: string
  readonly exportBase: PromptExportBase | null
  readonly formatLabel: string
  readonly rawContent: string
  readonly saveButtonLabel: string
  readonly saveDisabledDescriptionId: string | null
  readonly title: string
}

function isExportFormat(format: PromptExportChoice): format is ExportFormat {
  return format !== "raw"
}

export function PromptExportActions({
  canSaveToFile,
  copyButtonLabel,
  exportBase,
  formatLabel,
  rawContent,
  saveButtonLabel,
  saveDisabledDescriptionId,
  title,
}: PromptExportActionsProps) {
  const [selectedFormat, setSelectedFormat] = useState<PromptExportChoice>("raw")
  const [message, setMessage] = useState<string | null>(null)
  const [previewContent, setPreviewContent] = useState<string | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const formatSelectId = useId()
  const hasContent = rawContent.trim().length > 0
  const selectedLabel = promptExportChoiceLabels[selectedFormat]
  const destinations = usePromptExportDestinations({
    canSaveToFile,
    setMessage,
    snapshot: {
      exportBase,
      format: selectedFormat,
      label: selectedLabel,
      rawContent,
    },
  })

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
    setIsPreviewing(true)
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
      setIsPreviewing(false)
    }
  }

  const destinationIsBusy =
    isPreviewing || destinations.isWorking || destinations.isConfirmationPending

  return (
    <>
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
              disabled={!hasContent || destinationIsBusy}
              onClick={previewExport}
            >
              Preview export
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!hasContent || destinationIsBusy}
              onClick={destinations.copyExport}
            >
              {copyButtonLabel}
            </Button>
            <Button
              aria-describedby={
                canSaveToFile ? undefined : (saveDisabledDescriptionId ?? undefined)
              }
              data-menu-action-target="save-compiled-export"
              type="button"
              variant="ghost"
              disabled={!canSaveToFile || !hasContent || destinationIsBusy}
              onClick={destinations.saveExport}
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
      <PrivacyWarningDialog
        confirmLabel={destinations.confirmationLabel}
        state={destinations.privacyWarningState}
        onCancel={destinations.cancelPrivacyWarning}
        onConfirm={destinations.confirmPrivacyWarning}
      />
    </>
  )
}
