import type { PromptAsset, PromptVersion } from "../../../electron/ipc-types"
import { formatTimestamp } from "../lib/format-timestamp"
import type { PromptExportBase } from "../lib/prompt-export"
import type { PromptVersionMetadata } from "../lib/prompt-version-diff"
import { targetAgentLabel } from "../lib/prompter-options"
import { PromptExportActions } from "./prompt-export-actions"
import { SavedPromptQualityPanel } from "./quality/saved-prompt-quality-panel"
import { SavePromptTemplateFromVersion } from "./save-prompt-template-from-version"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"

type PromptVersionDetailProps = {
  readonly currentMessage: string | null
  readonly currentVersion: PromptVersion | null
  readonly exportBase: PromptExportBase | null
  readonly isSettingCurrent: boolean
  readonly metadata: PromptVersionMetadata | null
  readonly selectedAsset: PromptAsset
  readonly selectedVersion: PromptVersion
  readonly onMakeSelectedCurrent: () => Promise<void>
  readonly onDerivePrompt: () => void
  readonly onPromptTemplateSaved: () => void
}

function DetailRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className="min-w-0 select-text whitespace-pre-wrap text-[14px] text-foreground [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  )
}

function MetadataList({
  label,
  values,
}: {
  readonly label: string
  readonly values: readonly string[]
}) {
  if (values.length === 0) {
    return null
  }

  return (
    <section className="grid gap-2 py-4 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-4">
      <h4 className="text-[12px] text-muted">{label}</h4>
      <ul className="min-w-0 list-inside list-disc space-y-2 text-[14px] leading-6 text-foreground [overflow-wrap:anywhere]">
        {values.map((value) => (
          <li key={value} className="select-text whitespace-pre-wrap">
            {value}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function PromptVersionDetail({
  currentMessage,
  currentVersion,
  exportBase,
  isSettingCurrent,
  metadata,
  selectedAsset,
  selectedVersion,
  onMakeSelectedCurrent,
  onDerivePrompt,
  onPromptTemplateSaved,
}: PromptVersionDetailProps) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="accent">v{selectedVersion.versionNumber}</Badge>
        {currentVersion?.id === selectedVersion.id && <Badge variant="neutral">Current</Badge>}
        {currentVersion?.id !== selectedVersion.id && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={isSettingCurrent}
            onClick={onMakeSelectedCurrent}
          >
            현재 버전으로 지정
          </Button>
        )}
        <Button type="button" size="sm" variant="secondary" onClick={onDerivePrompt}>
          Derive Draft
        </Button>
      </div>
      {currentMessage !== null && <p className="text-[12px] text-muted-strong">{currentMessage}</p>}
      <details className="min-w-0 space-y-3 border-y border-border-subtle py-4">
        <summary className="cursor-pointer rounded-control text-[14px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          저장된 버전 본문 보기
        </summary>
        <h3 id="compiled-prompt-heading" className="text-[14px] font-medium text-foreground">
          저장된 본문
        </h3>
        <p className="min-w-0 select-text whitespace-pre-wrap rounded-control bg-panel-muted p-4 font-mono text-[14px] leading-6 text-foreground [overflow-wrap:anywhere]">
          {selectedVersion.compiledPrompt}
        </p>
      </details>
      <PromptExportActions
        canSaveToFile
        copyButtonLabel="Copy version export"
        exportBase={exportBase}
        formatLabel="Version export format"
        menuActionTarget={null}
        rawContent={selectedVersion.compiledPrompt}
        saveButtonLabel="Save version export"
        saveDisabledDescriptionId={null}
        title="Version export"
      />
      <dl className="divide-y divide-border-subtle border-y border-border-subtle">
        <DetailRow label="Title" value={selectedAsset.title} />
        <DetailRow label="Scenario" value={selectedAsset.scenario} />
        <DetailRow label="Target agent" value={targetAgentLabel(selectedAsset.targetAgent)} />
        <DetailRow label="Version" value={String(selectedVersion.versionNumber)} />
        <DetailRow label="Created" value={formatTimestamp(selectedVersion.createdAt)} />
        <DetailRow label="Updated" value={formatTimestamp(selectedAsset.updatedAt)} />
        {metadata?.qualityScore !== null && metadata?.qualityScore !== undefined && (
          <DetailRow label="Saved quality score" value={String(metadata.qualityScore)} />
        )}
      </dl>
      <SavedPromptQualityPanel
        key={selectedVersion.id}
        selectedAsset={selectedAsset}
        selectedVersion={selectedVersion}
      />
      <section className="min-w-0 space-y-3" aria-labelledby="original-input-heading">
        <h3 id="original-input-heading" className="text-[12px] text-muted">
          original_input
        </h3>
        <p className="min-h-24 min-w-0 select-text whitespace-pre-wrap rounded-control bg-panel-muted p-4 text-[14px] leading-6 text-foreground [overflow-wrap:anywhere]">
          {selectedVersion.originalInput}
        </p>
      </section>
      <SavePromptTemplateFromVersion
        selectedAsset={selectedAsset}
        selectedVersion={selectedVersion}
        onSaved={onPromptTemplateSaved}
      />
      {metadata !== null && (
        <div className="divide-y divide-border-subtle border-y border-border-subtle">
          <MetadataList label="assumptions" values={metadata.assumptions} />
          <MetadataList label="questions" values={metadata.questions} />
          <MetadataList label="answers" values={metadata.answers} />
          <MetadataList label="acceptance_criteria" values={metadata.acceptanceCriteria} />
          <MetadataList label="validation_commands" values={metadata.validationCommands} />
        </div>
      )}
    </>
  )
}
