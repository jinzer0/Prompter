import type { QualityPromptInsight, VersionedPromptInsight } from "../../../../electron/ipc-types"
import type { InsightsNavigationIntent } from "../../lib/insights-navigation"

export type InsightsNavigate = (intent: InsightsNavigationIntent) => void

export function projectNavigation(projectId: string): InsightsNavigationIntent {
  return { kind: "project", projectId }
}

export function promptQualityNavigation(
  prompt: QualityPromptInsight,
): InsightsNavigationIntent | null {
  if (prompt.projectId === null) return null

  return {
    kind: "prompt_quality",
    projectId: prompt.projectId,
    promptAssetId: prompt.promptAssetId,
    promptVersionId: prompt.currentVersionId,
  }
}

export function versionPromptNavigation(
  prompt: VersionedPromptInsight,
): InsightsNavigationIntent | null {
  if (prompt.projectId === null) return null

  return {
    kind: "prompt",
    projectId: prompt.projectId,
    promptAssetId: prompt.promptAssetId,
    promptVersionId: prompt.currentVersionId,
  }
}

export function tagNavigation(projectId: string, tagId: string): InsightsNavigationIntent {
  return { kind: "tag", projectId, tagId }
}

export function promptTemplateNavigation(
  promptTemplateId: string | null,
): InsightsNavigationIntent {
  return { kind: "prompt_templates", promptTemplateId }
}

export function harnessTemplatesNavigation(): InsightsNavigationIntent {
  return { kind: "harness_templates", harnessTemplateId: null }
}

export function projectContextNavigation(projectId: string): InsightsNavigationIntent {
  return { kind: "project_context", projectId, profileId: null }
}

export function maintenanceNavigation(): InsightsNavigationIntent {
  return { kind: "maintenance" }
}
