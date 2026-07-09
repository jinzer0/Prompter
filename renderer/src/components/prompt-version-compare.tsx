import { useEffect, useMemo, useState } from "react"

import type { ComparePromptVersionsResult, PromptVersion } from "../../../electron/ipc-types"
import {
  buildPromptVersionLineDiff,
  type PromptVersionLineDiffKind,
} from "../lib/prompt-version-diff"
import { Select } from "./ui/select"
import { TabsContent } from "./ui/tabs"

type PromptVersionCompareProps = {
  readonly compareVersions: (
    baseVersionId: string,
    compareVersionId: string,
  ) => Promise<ComparePromptVersionsResult>
  readonly currentVersion: PromptVersion | null
  readonly isActive: boolean
  readonly selectedVersion: PromptVersion | null
  readonly versions: readonly PromptVersion[]
}

function versionLabel(version: PromptVersion): string {
  return `Version ${version.versionNumber}`
}

function nextCompareVersionId(versions: readonly PromptVersion[], baseVersionId: string): string {
  return versions.find((version) => version.id !== baseVersionId)?.id ?? baseVersionId
}

function diffClassName(kind: PromptVersionLineDiffKind): string {
  const classes: Record<PromptVersionLineDiffKind, string> = {
    added: "border-success/35 bg-panel-muted text-success",
    changed: "border-accent/35 bg-accent/12 text-foreground",
    removed: "border-border-subtle bg-panel-muted text-muted",
    unchanged: "border-border-subtle bg-panel-muted text-muted-strong",
  }

  return classes[kind]
}

export function PromptVersionCompare({
  compareVersions,
  currentVersion,
  isActive,
  selectedVersion,
  versions,
}: PromptVersionCompareProps) {
  const [baseVersionId, setBaseVersionId] = useState("")
  const [compareVersionId, setCompareVersionId] = useState("")
  const [compareResult, setCompareResult] = useState<ComparePromptVersionsResult | null>(null)
  const [compareError, setCompareError] = useState<string | null>(null)

  useEffect(() => {
    const firstVersionId = versions[0]?.id ?? ""
    const defaultBaseVersionId = currentVersion?.id ?? selectedVersion?.id ?? firstVersionId
    const defaultCompareVersionId = nextCompareVersionId(versions, defaultBaseVersionId)

    setBaseVersionId((current) =>
      versions.some((version) => version.id === current) ? current : defaultBaseVersionId,
    )
    setCompareVersionId((current) =>
      versions.some((version) => version.id === current) ? current : defaultCompareVersionId,
    )
  }, [currentVersion, selectedVersion, versions])

  useEffect(() => {
    if (!isActive || baseVersionId.length === 0 || compareVersionId.length === 0) {
      return
    }

    let shouldApplyResult = true
    setCompareError(null)

    async function loadCompare(): Promise<void> {
      try {
        const result = await compareVersions(baseVersionId, compareVersionId)

        if (shouldApplyResult) {
          setCompareResult(result)
        }
      } catch (error) {
        if (!(error instanceof Error)) {
          throw error
        }

        if (shouldApplyResult) {
          setCompareError(error.message)
        }
      }
    }

    void loadCompare()

    return () => {
      shouldApplyResult = false
    }
  }, [baseVersionId, compareVersionId, compareVersions, isActive])

  const diff = useMemo(() => {
    if (compareResult === null) {
      return []
    }

    return buildPromptVersionLineDiff({
      baseText: compareResult.baseVersion.compiledPrompt,
      compareText: compareResult.compareVersion.compiledPrompt,
    })
  }, [compareResult])

  return (
    <TabsContent value="compare" className="space-y-3" aria-label="Version compare">
      <div className="grid gap-3 md:grid-cols-2">
        <Select
          aria-label="Base version"
          value={baseVersionId}
          onChange={(event) => setBaseVersionId(event.currentTarget.value)}
        >
          {versions.map((version) => (
            <option key={version.id} value={version.id}>
              {versionLabel(version)}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Compare version"
          value={compareVersionId}
          onChange={(event) => setCompareVersionId(event.currentTarget.value)}
        >
          {versions.map((version) => (
            <option key={version.id} value={version.id}>
              {versionLabel(version)}
            </option>
          ))}
        </Select>
      </div>
      {compareError !== null && <p className="text-[12px] text-muted-strong">{compareError}</p>}
      <div className="space-y-2">
        {diff.map((line) => (
          <div key={`${line.baseLineNumber ?? "new"}-${line.compareLineNumber ?? "old"}`}>
            <div className={`rounded-card border p-3 text-[12px] ${diffClassName(line.kind)}`}>
              <p className="font-mono text-[11px] text-muted">{line.kind}</p>
              {line.baseText !== null && (
                <p className="mt-1 whitespace-pre-wrap">{line.baseText}</p>
              )}
              {line.compareText !== null && line.compareText !== line.baseText && (
                <p className="mt-1 whitespace-pre-wrap">{line.compareText}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </TabsContent>
  )
}
