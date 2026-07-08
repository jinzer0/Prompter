import { type FormEvent, useState } from "react"

import type {
  CreatePromptAssetInput,
  CreatePromptVersionInput,
  Project,
  PromptAsset,
} from "../../../electron/ipc-types"
import type { LoadStatus } from "../hooks/use-prompter-library"
import {
  type PromptScenario,
  parseScenario,
  parseTargetAgent,
  scenarioOptions,
  type TargetAgent,
  targetAgentOptions,
} from "../lib/prompter-options"
import { PromptAssetCard } from "./prompt-asset-card"
import { Panel } from "./shell/panel"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { EmptyState } from "./ui/empty-state"
import { Input } from "./ui/input"
import { Select } from "./ui/select"
import { Textarea } from "./ui/textarea"

type PromptDraft = {
  readonly title: string
  readonly scenario: PromptScenario
  readonly targetAgent: TargetAgent
  readonly originalInput: string
  readonly compiledPrompt: string
}

type PromptLibraryPanelProps = {
  readonly assets: readonly PromptAsset[]
  readonly createPrompt: (
    assetInput: CreatePromptAssetInput,
    versionInput: Omit<CreatePromptVersionInput, "promptAssetId">,
  ) => Promise<PromptAsset>
  readonly error: string | null
  readonly selectAsset: (id: string) => void
  readonly selectedAsset: PromptAsset | null
  readonly selectedProject: Project | null
  readonly status: LoadStatus
}

const emptyPromptDraft: PromptDraft = {
  title: "",
  scenario: "feature",
  targetAgent: "codex",
  originalInput: "",
  compiledPrompt: "",
}

export function PromptLibraryPanel({
  assets,
  createPrompt,
  error,
  selectAsset,
  selectedAsset,
  selectedProject,
  status,
}: PromptLibraryPanelProps) {
  const [draft, setDraft] = useState<PromptDraft>(emptyPromptDraft)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function submitPrompt(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (selectedProject === null) {
      setMessage("Select a project before saving prompt")
      return
    }

    const title = draft.title.trim()

    if (title.length === 0) {
      setMessage("Prompt title is required")
      return
    }

    const originalInput = draft.originalInput.trim()

    if (originalInput.length === 0) {
      setMessage("Original input is required")
      return
    }

    const compiledPrompt = draft.compiledPrompt.trim()

    if (compiledPrompt.length === 0) {
      setMessage("Compiled prompt is required")
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      await createPrompt(
        {
          projectId: selectedProject.id,
          title,
          scenario: draft.scenario,
          targetAgent: draft.targetAgent,
        },
        {
          originalInput,
          compiledPrompt,
        },
      )
      setDraft(emptyPromptDraft)
      setIsFormOpen(false)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Prompt could not be saved")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Panel data-testid="prompt-library" headingId="prompt-library-heading">
      <header className="flex items-start justify-between gap-4 border-b border-border-subtle pb-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Library</p>
          <h1
            id="prompt-library-heading"
            className="mt-2 text-[24px] font-medium tracking-[-0.012em]"
          >
            Prompt Library
          </h1>
          <p className="mt-1 text-[14px] text-muted">
            {selectedProject === null
              ? "Create or select a project to load DB-backed prompts."
              : `Prompts for ${selectedProject.name}`}
          </p>
        </div>
        <Button
          disabled={selectedProject === null}
          onClick={() => setIsFormOpen((isOpen) => !isOpen)}
        >
          New Prompt
        </Button>
      </header>

      {isFormOpen && selectedProject !== null && (
        <form
          className="mt-4 space-y-3 rounded-card border border-border bg-panel-elevated p-4"
          onSubmit={submitPrompt}
        >
          <Input
            aria-label="Prompt title"
            placeholder="Prompt title"
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.currentTarget.value })}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              aria-label="Scenario"
              value={draft.scenario}
              onChange={(event) =>
                setDraft({ ...draft, scenario: parseScenario(event.currentTarget.value) })
              }
            >
              {scenarioOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Target agent"
              value={draft.targetAgent}
              onChange={(event) =>
                setDraft({ ...draft, targetAgent: parseTargetAgent(event.currentTarget.value) })
              }
            >
              {targetAgentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <Textarea
            aria-label="Original input"
            placeholder="Original input"
            value={draft.originalInput}
            onChange={(event) => setDraft({ ...draft, originalInput: event.currentTarget.value })}
          />
          <Textarea
            aria-label="Compiled prompt"
            placeholder="Compiled prompt"
            value={draft.compiledPrompt}
            onChange={(event) => setDraft({ ...draft, compiledPrompt: event.currentTarget.value })}
          />
          {message !== null && <p className="text-[12px] text-muted-strong">{message}</p>}
          {isSaving && <p className="text-[12px] text-muted">Saving prompt...</p>}
          <Button type="submit" disabled={isSaving}>
            Save Prompt
          </Button>
        </form>
      )}

      <div className="mt-4 flex flex-1 flex-col gap-3">
        {selectedProject === null && (
          <Card>
            <CardHeader>
              <CardTitle>Select a project to view prompts</CardTitle>
              <CardDescription>Prompt assets are scoped to the active project.</CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                label="Prompt scope"
                title="No project selected"
                description="Create a project or select one from the sidebar."
              />
            </CardContent>
          </Card>
        )}

        {selectedProject !== null && status === "loading" && (
          <p className="text-[12px] text-muted">Loading prompts...</p>
        )}
        {selectedProject !== null && status === "error" && (
          <p className="text-[12px] text-muted-strong">{error}</p>
        )}
        {selectedProject !== null && status === "ready" && assets.length === 0 && (
          <EmptyState
            label="Library state"
            title="No prompts yet"
            description="Create a prompt to store its first asset version in SQLite."
          />
        )}

        {assets.map((asset) => (
          <PromptAssetCard
            key={asset.id}
            asset={asset}
            isSelected={asset.id === selectedAsset?.id}
            onSelect={() => selectAsset(asset.id)}
          />
        ))}
      </div>
    </Panel>
  )
}
