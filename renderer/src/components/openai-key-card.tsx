import type { FormEvent } from "react"

import type { OpenAIKeyStatus } from "../../../electron/ipc-types"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"

type OpenAIKeyCardProps = {
  readonly apiKey: string
  readonly isDeleting: boolean
  readonly isSaving: boolean
  readonly message: string | null
  readonly onAPIKeyChange: (apiKey: string) => void
  readonly onDelete: () => Promise<void>
  readonly onSave: () => Promise<void>
  readonly status: OpenAIKeyStatus | null
}

export function OpenAIKeyCard({
  apiKey,
  isDeleting,
  isSaving,
  message,
  onAPIKeyChange,
  onDelete,
  onSave,
  status,
}: OpenAIKeyCardProps) {
  async function submitKey(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    await onSave()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>OpenAI key</CardTitle>
        <CardDescription>Only encrypted secret status is exposed to the renderer.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <output className="block font-mono text-[12px] text-muted-strong" aria-live="polite">
          {openAIKeyStatusText(status)}
        </output>
        <form className="space-y-3" onSubmit={submitKey}>
          <Input
            aria-label="OpenAI API key"
            autoComplete="off"
            type="password"
            value={apiKey}
            onChange={(event) => onAPIKeyChange(event.currentTarget.value)}
          />
          {message !== null && <p className="text-[12px] text-muted-strong">{message}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save API key"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={isDeleting || status?.hasKey !== true}
              onClick={onDelete}
            >
              {isDeleting ? "Deleting..." : "Delete API key"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function openAIKeyStatusText(status: OpenAIKeyStatus | null): string {
  if (status === null) {
    return "Loading OpenAI key status"
  }

  return status.hasKey ? (status.maskedKey ?? "OpenAI key stored") : "OpenAI key not stored"
}
