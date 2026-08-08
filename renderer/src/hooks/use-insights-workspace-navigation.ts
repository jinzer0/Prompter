import { useCallback, useEffect, useRef, useState } from "react"

import type { CompilerStatePreservationRequest } from "../lib/compiler-project-binding"
import type { InsightsNavigationIntent } from "../lib/insights-navigation"
import { focusInsightsTarget } from "../lib/insights-selection-request"
import {
  type InsightsNavigationSnapshot,
  resolveInsightsNavigationStep,
} from "../lib/insights-workspace-navigation"

export type WorkspaceView = "library" | "insights"

export type InsightsSelectionRequest = {
  readonly id: string
  readonly requestId: number
}

type UseInsightsWorkspaceNavigationConfig = {
  readonly selectAsset: (id: string) => void
  readonly selectProject: (id: string) => void
  readonly selectVersion: (id: string) => void
  readonly snapshot: InsightsNavigationSnapshot
}

type PendingNavigation = {
  readonly intent: InsightsNavigationIntent
  readonly requestId: number
}

function targetProjectId(intent: InsightsNavigationIntent): string | null {
  switch (intent.kind) {
    case "project":
    case "prompt":
    case "prompt_quality":
    case "tag":
    case "project_context":
      return intent.projectId
    case "prompt_templates":
    case "harness_templates":
    case "maintenance":
      return null
    default:
      return intent satisfies never
  }
}

export function useInsightsWorkspaceNavigation({
  selectAsset,
  selectProject,
  selectVersion,
  snapshot,
}: UseInsightsWorkspaceNavigationConfig) {
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("library")
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null)
  const requestIdRef = useRef(0)
  const [statePreservationRequest, setStatePreservationRequest] =
    useState<CompilerStatePreservationRequest | null>(null)
  const [tagRequest, setTagRequest] = useState<InsightsSelectionRequest | null>(null)
  const [promptTemplateRequest, setPromptTemplateRequest] =
    useState<InsightsSelectionRequest | null>(null)
  const [harnessTemplateRequest, setHarnessTemplateRequest] =
    useState<InsightsSelectionRequest | null>(null)
  const [contextProfileRequest, setContextProfileRequest] =
    useState<InsightsSelectionRequest | null>(null)

  const navigate = useCallback(
    (intent: InsightsNavigationIntent): void => {
      requestIdRef.current += 1
      const requestId = requestIdRef.current
      const projectId = targetProjectId(intent)
      setWorkspaceView("library")
      setPendingNavigation({ intent, requestId })
      setStatePreservationRequest(
        projectId !== null &&
          snapshot.selectedProjectId !== null &&
          projectId !== snapshot.selectedProjectId
          ? {
              sourceProjectId: snapshot.selectedProjectId,
              targetProjectId: projectId,
              requestId,
            }
          : null,
      )
    },
    [snapshot.selectedProjectId],
  )

  useEffect(() => {
    if (pendingNavigation === null) return

    const step = resolveInsightsNavigationStep(pendingNavigation.intent, snapshot)
    const requestId = pendingNavigation.requestId

    switch (step.kind) {
      case "select_project":
        selectProject(step.projectId)
        return
      case "select_asset":
        selectAsset(step.promptAssetId)
        return
      case "select_version":
        selectVersion(step.promptVersionId)
        return
      case "wait":
        return
      case "apply_tag_filter":
        setTagRequest({ id: step.tagId, requestId })
        break
      case "select_prompt_template":
        setPromptTemplateRequest({ id: step.promptTemplateId, requestId })
        break
      case "select_harness_template":
        setHarnessTemplateRequest({ id: step.harnessTemplateId, requestId })
        break
      case "select_context_profile":
        setContextProfileRequest({ id: step.profileId, requestId })
        break
      case "focus":
        focusInsightsTarget(step.target)
        break
      default:
        step satisfies never
    }

    setPendingNavigation(null)
  }, [pendingNavigation, selectAsset, selectProject, selectVersion, snapshot])

  return {
    statePreservationRequest,
    contextProfileRequest,
    harnessTemplateRequest,
    navigate,
    openInsights: () => setWorkspaceView("insights"),
    openLibrary: () => setWorkspaceView("library"),
    promptTemplateRequest,
    tagRequest,
    workspaceView,
  }
}
