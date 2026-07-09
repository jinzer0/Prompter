import { useState } from "react"

import type {
  ComparePromptVersionsResult,
  PromptAsset,
  PromptVersion,
} from "../../../electron/ipc-types"
import { formatTimestamp } from "../lib/format-timestamp"
import { parsePromptVersionMetadata } from "../lib/prompt-version-diff"
import { scenarioLabel, targetAgentLabel } from "../lib/prompter-options"
import { PromptVersionCompare } from "./prompt-version-compare"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"

type PromptVersionManagementProps = {
  readonly compareVersions: (
    baseVersionId: string,
    compareVersionId: string,
  ) => Promise<ComparePromptVersionsResult>
  readonly currentVersion: PromptVersion | null
  readonly selectedAsset: PromptAsset
  readonly selectedVersion: PromptVersion | null
  readonly selectVersion: (id: string) => void
  readonly setCurrentVersion: (promptAssetId: string, versionId: string) => Promise<void>
  readonly versions: readonly PromptVersion[]
}

type DetailTab = "version" | "compare"

function versionLabel(version: PromptVersion): string {
  return `Version ${version.versionNumber}`
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

export function PromptVersionManagement({
  compareVersions,
  currentVersion,
  selectedAsset,
  selectedVersion,
  selectVersion,
  setCurrentVersion,
  versions,
}: PromptVersionManagementProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("version")
  const [isSettingCurrent, setIsSettingCurrent] = useState(false)
  const [currentMessage, setCurrentMessage] = useState<string | null>(null)
  const selectedMetadata =
    selectedVersion === null ? null : parsePromptVersionMetadata(selectedVersion)

  async function makeSelectedCurrent(): Promise<void> {
    if (selectedVersion === null) {
      return
    }

    setIsSettingCurrent(true)
    setCurrentMessage(null)

    try {
      await setCurrentVersion(selectedAsset.id, selectedVersion.id)
      setCurrentMessage(`${versionLabel(selectedVersion)} is current.`)
    } catch (error) {
      setCurrentMessage(
        error instanceof Error ? error.message : "Current version could not be updated",
      )
    } finally {
      setIsSettingCurrent(false)
    }
  }

  return (
    <Card className="flex flex-1 flex-col">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{selectedAsset.title}</CardTitle>
          {currentVersion !== null && (
            <Badge variant="accent">v{currentVersion.versionNumber}</Badge>
          )}
        </div>
        <CardDescription>
          {scenarioLabel(selectedAsset.scenario)} · {targetAgentLabel(selectedAsset.targetAgent)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <section className="space-y-3" aria-labelledby="version-history-heading">
          <h3 id="version-history-heading" className="text-[14px] font-semibold text-foreground">
            Version history
          </h3>
          <ul className="flex flex-wrap gap-2">
            {versions.map((version) => (
              <li key={version.id}>
                <Button
                  type="button"
                  variant={selectedVersion?.id === version.id ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => selectVersion(version.id)}
                >
                  {versionLabel(version)}
                  {currentVersion?.id === version.id ? " current" : ""}
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <Tabs defaultValue="version">
          <TabsList aria-label="Prompt version sections">
            <TabsTrigger
              active={activeTab === "version"}
              value="version"
              onClick={() => setActiveTab("version")}
            >
              Selected version
            </TabsTrigger>
            <TabsTrigger
              active={activeTab === "compare"}
              value="compare"
              onClick={() => setActiveTab("compare")}
            >
              Version compare
            </TabsTrigger>
          </TabsList>

          {activeTab === "version" && (
            <TabsContent value="version" className="space-y-4">
              {selectedVersion === null ? (
                <p className="text-[12px] text-muted">No version is available for this prompt.</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="accent">v{selectedVersion.versionNumber}</Badge>
                    {currentVersion?.id === selectedVersion.id && (
                      <Badge variant="neutral">Current</Badge>
                    )}
                    {currentVersion?.id !== selectedVersion.id && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={isSettingCurrent}
                        onClick={makeSelectedCurrent}
                      >
                        현재 버전으로 지정
                      </Button>
                    )}
                  </div>
                  {currentMessage !== null && (
                    <p className="text-[12px] text-muted-strong">{currentMessage}</p>
                  )}
                  <dl className="grid gap-3">
                    <DetailRow label="title" value={selectedAsset.title} />
                    <DetailRow label="scenario" value={selectedAsset.scenario} />
                    <DetailRow
                      label="target_agent"
                      value={targetAgentLabel(selectedAsset.targetAgent)}
                    />
                    <DetailRow
                      label="version_number"
                      value={String(selectedVersion.versionNumber)}
                    />
                    <DetailRow
                      label="created_at"
                      value={formatTimestamp(selectedVersion.createdAt)}
                    />
                    <DetailRow
                      label="updated_at"
                      value={formatTimestamp(selectedAsset.updatedAt)}
                    />
                    {selectedMetadata?.qualityScore !== null &&
                      selectedMetadata?.qualityScore !== undefined && (
                        <DetailRow
                          label="quality_score"
                          value={String(selectedMetadata.qualityScore)}
                        />
                      )}
                  </dl>
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
                  {selectedMetadata !== null && (
                    <div className="grid gap-3">
                      <MetadataList label="assumptions" values={selectedMetadata.assumptions} />
                      <MetadataList label="questions" values={selectedMetadata.questions} />
                      <MetadataList label="answers" values={selectedMetadata.answers} />
                      <MetadataList
                        label="acceptance_criteria"
                        values={selectedMetadata.acceptanceCriteria}
                      />
                      <MetadataList
                        label="validation_commands"
                        values={selectedMetadata.validationCommands}
                      />
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          )}

          {activeTab === "compare" && (
            <PromptVersionCompare
              compareVersions={compareVersions}
              currentVersion={currentVersion}
              isActive={activeTab === "compare"}
              selectedVersion={selectedVersion}
              versions={versions}
            />
          )}
        </Tabs>
      </CardContent>
    </Card>
  )
}
