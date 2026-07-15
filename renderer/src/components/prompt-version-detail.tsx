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
  readonly onDuplicatePrompt: () => Promise<void>
  readonly onDerivePrompt: () => void
  readonly onPromptTemplateSaved: () => void
}

function DetailRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="space-y-1">
      <dt className="font-mono text-[11px] text-muted">{label}</dt>
      <dd className="text-[12px] text-muted-strong">{value}</dd>
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
    <section className="space-y-2">
      <h4 className="font-mono text-[11px] text-muted">{label}</h4>
      <ul className="space-y-1 text-[12px] leading-5 text-muted-strong">
        {values.map((value) => (
          <li key={value}>{value}</li>
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
  onDuplicatePrompt,
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
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => void onDuplicatePrompt()}
        >
          Duplicate Prompt
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onDerivePrompt}>
          Derive Draft
        </Button>
      </div>
      {currentMessage !== null && <p className="text-[12px] text-muted-strong">{currentMessage}</p>}
      <dl className="grid gap-3">
        <DetailRow label="title" value={selectedAsset.title} />
        <DetailRow label="scenario" value={selectedAsset.scenario} />
        <DetailRow label="target_agent" value={targetAgentLabel(selectedAsset.targetAgent)} />
        <DetailRow label="version_number" value={String(selectedVersion.versionNumber)} />
        <DetailRow label="created_at" value={formatTimestamp(selectedVersion.createdAt)} />
        <DetailRow label="updated_at" value={formatTimestamp(selectedAsset.updatedAt)} />
        {metadata?.qualityScore !== null && metadata?.qualityScore !== undefined && (
          <DetailRow label="saved_version_quality_score" value={String(metadata.qualityScore)} />
        )}
      </dl>
      <SavedPromptQualityPanel
        key={selectedVersion.id}
        selectedAsset={selectedAsset}
        selectedVersion={selectedVersion}
      />
      <section className="space-y-2" aria-labelledby="original-input-heading">
        <h3 id="original-input-heading" className="font-mono text-[11px] text-muted">
          original_input
        </h3>
        <p className="min-h-24 whitespace-pre-wrap rounded-card border border-border-subtle bg-panel-muted p-4 text-[12px] leading-5 text-muted-strong">
          {selectedVersion.originalInput}
        </p>
      </section>
      <section className="space-y-2" aria-labelledby="compiled-prompt-heading">
        <h3 id="compiled-prompt-heading" className="font-mono text-[11px] text-muted">
          compiled_prompt
        </h3>
        <p className="whitespace-pre-wrap rounded-card border border-border-subtle bg-panel-muted p-4 font-mono text-[12px] leading-5 text-muted-strong">
          {selectedVersion.compiledPrompt}
        </p>
      </section>
      <PromptExportActions
        copyButtonLabel="Copy version export"
        exportBase={exportBase}
        formatLabel="Version export format"
        rawContent={selectedVersion.compiledPrompt}
        saveButtonLabel="Save version export"
        title="Version export"
      />
      <SavePromptTemplateFromVersion
        selectedAsset={selectedAsset}
        selectedVersion={selectedVersion}
        onSaved={onPromptTemplateSaved}
      />
      {metadata !== null && (
        <div className="grid gap-3">
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
