import type { FormEvent } from "react"
import { useEffect, useState } from "react"

import type { PromptAsset, Tag } from "../../../electron/ipc-types"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Input } from "./ui/input"

type PromptTagAttachmentFormProps = {
  readonly selectedAsset: PromptAsset | null
  readonly onTagsChanged: () => void
}

export function PromptTagAttachmentForm({
  selectedAsset,
  onTagsChanged,
}: PromptTagAttachmentFormProps) {
  const [tagName, setTagName] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [promptTags, setPromptTags] = useState<readonly Tag[]>([])

  useEffect(() => {
    if (selectedAsset === null) {
      setPromptTags([])
      return
    }

    const activeAsset = selectedAsset
    let isActive = true

    async function loadPromptTags(): Promise<void> {
      const tags = await window.prompter.tags.listForPrompt(activeAsset.id)

      if (isActive) {
        setPromptTags(tags)
      }
    }

    void loadPromptTags()

    return () => {
      isActive = false
    }
  }, [selectedAsset])

  async function attachTag(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (selectedAsset === null) {
      setMessage("Select a prompt before adding a tag")
      return
    }

    const name = tagName.trim()

    if (name.length === 0) {
      setMessage("Prompt tag name is required")
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      await window.prompter.tags.createAndAttachToPrompt({
        promptAssetId: selectedAsset.id,
        tagName: name,
      })
      const tags = await window.prompter.tags.listForPrompt(selectedAsset.id)
      setTagName("")
      setPromptTags(tags)
      setMessage("Tag added to prompt.")
      onTagsChanged()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Prompt tag could not be added")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form
      className="mt-4 space-y-3 rounded-card border border-border bg-panel-elevated p-4"
      onSubmit={attachTag}
    >
      <p className="font-mono text-[11px] text-muted">prompt tags</p>
      <div className="flex gap-2">
        <Input
          aria-label="Prompt tag name"
          disabled={selectedAsset === null || isSaving}
          placeholder="Prompt tag name"
          value={tagName}
          onChange={(event) => setTagName(event.currentTarget.value)}
        />
        <Button type="submit" variant="secondary" disabled={selectedAsset === null || isSaving}>
          Add tag to prompt
        </Button>
      </div>
      {promptTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {promptTags.map((tag) => (
            <Badge key={tag.id} variant="neutral">
              {tag.name}
            </Badge>
          ))}
        </div>
      )}
      {message !== null && <p className="text-[12px] text-muted-strong">{message}</p>}
    </form>
  )
}
