import { useEffect, useState } from "react"

import type { PromptAsset, PromptLineage } from "../../../electron/ipc-types"
import { buildPromptLineageView, type LineageNavigationSummary } from "../lib/prompt-lineage-model"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { EmptyState } from "./ui/empty-state"

type PromptLineagePanelProps = {
  readonly sameProjectAssets: readonly PromptAsset[]
  readonly selectedAsset: PromptAsset
  readonly onNavigate: (promptAssetId: string) => void
}

type PromptLineageContentProps = PromptLineagePanelProps & {
  readonly error: string | null
  readonly lineage: PromptLineage | null
}

function derivationLabel(value: string): string {
  return value === "duplicate" ? "Duplicate" : "Derived"
}

function LineageSummaryButton({
  summary,
  onNavigate,
}: {
  readonly summary: LineageNavigationSummary
  readonly onNavigate: (promptAssetId: string) => void
}) {
  return (
    <Button
      className="w-full justify-start"
      size="sm"
      variant="secondary"
      disabled={!summary.canNavigate}
      onClick={() => onNavigate(summary.promptAssetId)}
    >
      {summary.title} · v{summary.versionNumber} · {derivationLabel(summary.derivationType)}
      {!summary.canNavigate ? " · navigation unavailable" : ""}
    </Button>
  )
}

export function PromptLineagePanel({
  sameProjectAssets,
  selectedAsset,
  onNavigate,
}: PromptLineagePanelProps) {
  const [lineage, setLineage] = useState<PromptLineage | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    async function loadLineage(): Promise<void> {
      setError(null)
      try {
        const result = await window.prompter.prompts.getLineage(selectedAsset.id)
        if (isActive) {
          setLineage(result)
        }
      } catch (error) {
        if (isActive) {
          setError(error instanceof Error ? error.message : "Lineage could not be loaded")
        }
      }
    }

    void loadLineage()

    return () => {
      isActive = false
    }
  }, [selectedAsset.id])

  return (
    <PromptLineageContent
      error={error}
      lineage={lineage}
      sameProjectAssets={sameProjectAssets}
      selectedAsset={selectedAsset}
      onNavigate={onNavigate}
    />
  )
}

export function PromptLineageContent({
  error,
  lineage,
  sameProjectAssets,
  selectedAsset,
  onNavigate,
}: PromptLineageContentProps) {
  const view =
    lineage === null ? null : buildPromptLineageView(selectedAsset, lineage, sameProjectAssets)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lineage</CardTitle>
        <CardDescription>Same-project duplicate and derived prompt relationships.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {lineage === null && error === null && (
          <p className="text-[12px] text-muted">Loading lineage...</p>
        )}
        {error !== null && <p className="text-[12px] text-muted-strong">{error}</p>}
        {view !== null && view.parent.kind === "none" && view.children.length === 0 && (
          <EmptyState
            label="Lineage state"
            title="No lineage yet"
            description="Duplicate or derive this prompt to build lineage."
          />
        )}
        {view !== null && view.parent.kind === "active" && (
          <section className="space-y-2" aria-labelledby="lineage-parent-heading">
            <h4 id="lineage-parent-heading" className="font-mono text-[11px] text-muted">
              active_source
            </h4>
            <LineageSummaryButton summary={view.parent.parent} onNavigate={onNavigate} />
          </section>
        )}
        {view !== null && view.parent.kind === "deleted" && (
          <EmptyState
            label="Lineage state"
            title="Source prompt is deleted or unavailable"
            description="Source details are no longer available, but this prompt retains its derivation history."
          />
        )}
        {view !== null && view.children.length > 0 && (
          <section className="space-y-2" aria-labelledby="lineage-children-heading">
            <h4 id="lineage-children-heading" className="font-mono text-[11px] text-muted">
              children
            </h4>
            <div className="grid gap-2">
              {view.children.map((child) => (
                <LineageSummaryButton
                  key={`${child.promptAssetId}:${child.promptVersionId}`}
                  summary={child}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  )
}
