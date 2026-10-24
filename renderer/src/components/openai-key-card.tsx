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
    <Card role="group" aria-labelledby="settings-openai-heading">
      <CardHeader className="px-5 pt-5">
        <CardTitle id="settings-openai-heading">OpenAI key</CardTitle>
        <CardDescription>
          API 키는 암호화하여 보관하며, 저장된 키의 원문은 다시 표시하지 않습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <form className="space-y-4" onSubmit={submitKey}>
          <div className="flex flex-wrap items-center justify-between gap-6 border-t border-border-subtle py-4">
            <div className="min-w-0 flex-1 basis-60">
              <label
                htmlFor="settings-openai-key"
                className="text-[14px] font-medium text-foreground"
              >
                OpenAI API key
              </label>
              <output
                className="mt-1 block break-all font-mono text-[12px] text-muted-strong"
                aria-live="polite"
              >
                {openAIKeyStatusText(status)}
              </output>
            </div>
            <Input
              id="settings-openai-key"
              className="w-full min-w-0 sm:w-[260px]"
              aria-label="OpenAI API key"
              autoComplete="off"
              type="password"
              value={apiKey}
              onChange={(event) => onAPIKeyChange(event.currentTarget.value)}
            />
          </div>
          {message !== null && (
            <p className="text-[12px] text-muted-strong" role="status">
              {message}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
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
