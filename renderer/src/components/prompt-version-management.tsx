import { useState } from "react"

import type {
  ComparePromptVersionsResult,
  PromptAsset,
  PromptVersion,
} from "../../../electron/ipc-types"
import { exportBaseFromVersion } from "../lib/prompt-export"
import { parsePromptVersionMetadata } from "../lib/prompt-version-diff"
import { scenarioLabel, targetAgentLabel } from "../lib/prompter-options"
import { PromptLineagePanel } from "./prompt-lineage-panel"
import { PromptVersionCompare } from "./prompt-version-compare"
import { PromptVersionDetail } from "./prompt-version-detail"
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
  readonly projectName: string | null
  readonly selectedAsset: PromptAsset
  readonly sameProjectAssets: readonly PromptAsset[]
  readonly selectedVersion: PromptVersion | null
  readonly selectVersion: (id: string) => void
  readonly setCurrentVersion: (promptAssetId: string, versionId: string) => Promise<void>
  readonly versions: readonly PromptVersion[]
  readonly onDerivePrompt: (asset: PromptAsset, version: PromptVersion) => void
  readonly onDuplicatePrompt: (asset: PromptAsset, version: PromptVersion) => Promise<void>
  readonly onNavigatePrompt: (promptAssetId: string) => void
  readonly onPromptTemplateSaved: () => void
}

type DetailTab = "version" | "compare"

function versionLabel(version: PromptVersion): string {
  return `Version ${version.versionNumber}`
}

export function PromptVersionManagement({
  compareVersions,
  currentVersion,
  projectName,
  selectedAsset,
  sameProjectAssets,
  selectedVersion,
  selectVersion,
  setCurrentVersion,
  versions,
  onDerivePrompt,
  onDuplicatePrompt,
  onNavigatePrompt,
  onPromptTemplateSaved,
}: PromptVersionManagementProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("version")
  const [isSettingCurrent, setIsSettingCurrent] = useState(false)
  const [currentMessage, setCurrentMessage] = useState<string | null>(null)
  const selectedMetadata =
    selectedVersion === null ? null : parsePromptVersionMetadata(selectedVersion)
  const selectedExportBase =
    selectedVersion === null || selectedMetadata === null
      ? null
      : exportBaseFromVersion({
          metadata: selectedMetadata,
          projectName,
          selectedAsset,
          selectedVersion,
        })

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
                <PromptVersionDetail
                  currentMessage={currentMessage}
                  currentVersion={currentVersion}
                  exportBase={selectedExportBase}
                  isSettingCurrent={isSettingCurrent}
                  metadata={selectedMetadata}
                  selectedAsset={selectedAsset}
                  selectedVersion={selectedVersion}
                  onMakeSelectedCurrent={makeSelectedCurrent}
                  onDuplicatePrompt={() => onDuplicatePrompt(selectedAsset, selectedVersion)}
                  onDerivePrompt={() => onDerivePrompt(selectedAsset, selectedVersion)}
                  onPromptTemplateSaved={onPromptTemplateSaved}
                />
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
        <PromptLineagePanel
          sameProjectAssets={sameProjectAssets}
          selectedAsset={selectedAsset}
          onNavigate={onNavigatePrompt}
        />
      </CardContent>
    </Card>
  )
}
