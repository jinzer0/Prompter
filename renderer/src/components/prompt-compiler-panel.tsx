import { type FormEvent, useState } from "react"
import type {
  CreatePromptAssetInput,
  CreatePromptVersionInput,
  Project,
  PromptAsset,
  PromptVersion,
} from "../../../electron/ipc-types"
import type { LoadStatus } from "../hooks/use-prompter-library"
import { formatTimestamp } from "../lib/format-timestamp"
import { compileStaticPrompt } from "../lib/prompt-compiler/static-prompt-compiler"
import type { CompiledPromptResult, PromptCompilerInput } from "../lib/prompt-compiler/types"
import { scenarioLabel, targetAgentLabel } from "../lib/prompter-options"
import { CompiledPromptPreview } from "./compiled-prompt-preview"
import { PromptCompilerForm } from "./prompt-compiler-form"
import { Panel } from "./shell/panel"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { EmptyState } from "./ui/empty-state"

type PromptCompilerPanelProps = {
  readonly createPrompt: (
    assetInput: CreatePromptAssetInput,
    versionInput: Omit<CreatePromptVersionInput, "promptAssetId">,
  ) => Promise<PromptAsset>
  readonly currentVersion: PromptVersion | null
  readonly error: string | null
  readonly selectedAsset: PromptAsset | null
  readonly selectedProject: Project | null
  readonly status: LoadStatus
}

const emptyCompilerInput: PromptCompilerInput = {
  title: "",
  originalInput: "",
  scenario: "feature",
  targetAgent: "codex",
  projectContext: "",
  techStack: "",
  constraints: "",
  acceptanceCriteria: "",
  validationCommands: "",
  additionalNotes: "",
}

function DetailRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="space-y-1">
      <dt className="font-mono text-[11px] text-muted">{label}</dt>
      <dd className="text-[12px] text-muted-strong">{value}</dd>
    </div>
  )
}

export function PromptCompilerPanel({
  createPrompt,
  currentVersion,
  error,
  selectedAsset,
  selectedProject,
  status,
}: PromptCompilerPanelProps) {
  const [draft, setDraft] = useState<PromptCompilerInput>(emptyCompilerInput)
  const [compiled, setCompiled] = useState<CompiledPromptResult | null>(null)
  const [editablePrompt, setEditablePrompt] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  function compilePrompt(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    if (draft.originalInput.trim().length === 0) {
      setMessage("Original request is required")
      return
    }

    const result = compileStaticPrompt(draft)
    setCompiled(result)
    setEditablePrompt(result.compiledPrompt)
    setMessage("Compiled prompt is ready to review.")
  }

  async function savePrompt(): Promise<void> {
    if (selectedProject === null) {
      setMessage("Select a project before saving compiled prompt")
      return
    }

    if (compiled === null || editablePrompt.trim().length === 0) {
      setMessage("Compile a prompt before saving")
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      await createPrompt(
        {
          projectId: selectedProject.id,
          title: compiled.title,
          scenario: compiled.scenario,
          targetAgent: compiled.targetAgent,
        },
        {
          originalInput: compiled.originalInput,
          compiledPrompt: editablePrompt.trim(),
          assumptions: JSON.stringify(compiled.assumptions),
          questions: JSON.stringify([]),
          answers: JSON.stringify([]),
          acceptanceCriteria: compiled.acceptanceCriteria.join("\n"),
          validationCommands: compiled.validationCommands.join("\n"),
          qualityScore: compiled.qualityScore,
        },
      )
      setMessage("Compiled prompt saved.")
    } catch (saveError) {
      setMessage(
        saveError instanceof Error ? saveError.message : "Compiled prompt could not be saved",
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function copyPrompt(): Promise<void> {
    if (editablePrompt.trim().length === 0 || navigator.clipboard === undefined) {
      setMessage("Compiled prompt is not available to copy")
      return
    }

    try {
      await navigator.clipboard.writeText(editablePrompt)
      setMessage("Compiled prompt copied.")
    } catch (copyError) {
      setMessage(
        copyError instanceof Error ? copyError.message : "Compiled prompt could not be copied",
      )
    }
  }

  return (
    <Panel data-testid="prompt-compiler" headingId="prompt-compiler-heading">
      <header className="border-b border-border-subtle pb-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Detail</p>
        <h2
          id="prompt-compiler-heading"
          className="mt-2 text-[24px] font-medium tracking-[-0.012em]"
        >
          Prompt Compiler
        </h2>
        <p className="mt-1 text-[14px] text-muted">Static templates generate local prompts.</p>
      </header>

      <form
        className="mt-4 space-y-4 rounded-card border border-border bg-panel-elevated p-4"
        onSubmit={compilePrompt}
      >
        <PromptCompilerForm draft={draft} onChange={setDraft} />
        {message !== null && <p className="text-[12px] text-muted-strong">{message}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit">프롬프트 컴파일</Button>
          <Button
            type="button"
            variant="secondary"
            disabled={selectedProject === null || compiled === null || isSaving}
            onClick={savePrompt}
          >
            {isSaving ? "Saving..." : "Save compiled prompt"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={editablePrompt.trim().length === 0}
            onClick={copyPrompt}
          >
            Copy
          </Button>
        </div>
      </form>

      <div className="mt-4 flex flex-1 flex-col gap-4">
        <CompiledPromptPreview value={editablePrompt} onChange={setEditablePrompt} />

        {selectedProject === null && (
          <EmptyState
            label="Detail state"
            title="Select a project first"
            description="Compile previews are local, but saving requires a selected project."
          />
        )}

        {selectedProject !== null && selectedAsset === null && (
          <EmptyState
            label="Detail state"
            title="Select a prompt to view details"
            description="New prompts will show their current version here."
          />
        )}

        {selectedAsset !== null && status === "loading" && (
          <p className="text-[12px] text-muted">Loading prompt detail...</p>
        )}
        {selectedAsset !== null && status === "error" && (
          <p className="text-[12px] text-muted-strong">{error}</p>
        )}

        {selectedAsset !== null && status === "ready" && currentVersion === null && (
          <Card>
            <CardHeader>
              <CardTitle>{selectedAsset.title}</CardTitle>
              <CardDescription>No current version is set for this prompt asset.</CardDescription>
            </CardHeader>
          </Card>
        )}

        {selectedAsset !== null && status === "ready" && currentVersion !== null && (
          <Card className="flex flex-1 flex-col">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{selectedAsset.title}</CardTitle>
                <Badge variant="accent">Version {currentVersion.versionNumber}</Badge>
              </div>
              <CardDescription>{scenarioLabel(selectedAsset.scenario)}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <dl className="grid gap-3">
                <DetailRow label="title" value={selectedAsset.title} />
                <DetailRow label="scenario" value={selectedAsset.scenario} />
                <DetailRow
                  label="target_agent"
                  value={targetAgentLabel(selectedAsset.targetAgent)}
                />
                <DetailRow label="version_number" value={String(currentVersion.versionNumber)} />
                <DetailRow label="created_at" value={formatTimestamp(currentVersion.createdAt)} />
                <DetailRow label="updated_at" value={formatTimestamp(selectedAsset.updatedAt)} />
              </dl>

              <section className="space-y-2" aria-labelledby="original-input-heading">
                <h3 id="original-input-heading" className="font-mono text-[11px] text-muted">
                  original_input
                </h3>
                <p className="min-h-24 whitespace-pre-wrap rounded-card border border-border-subtle bg-panel-muted p-4 text-[12px] leading-5 text-muted-strong">
                  {currentVersion.originalInput}
                </p>
              </section>

              <section
                className="flex flex-col space-y-2"
                aria-labelledby="compiled-prompt-heading"
              >
                <h3 id="compiled-prompt-heading" className="font-mono text-[11px] text-muted">
                  compiled_prompt
                </h3>
                <p className="flex-1 whitespace-pre-wrap rounded-card border border-border-subtle bg-panel-muted p-4 font-mono text-[12px] leading-5 text-muted-strong">
                  {currentVersion.compiledPrompt}
                </p>
              </section>
            </CardContent>
          </Card>
        )}
      </div>
    </Panel>
  )
}
