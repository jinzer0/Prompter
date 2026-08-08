import type { LoadStatus } from "../hooks/prompt-library-data"
import type { InsightsNavigationIntent } from "./insights-navigation"

export type InsightsNavigationSnapshot = {
  readonly assetIds: readonly string[]
  readonly assetStatus: LoadStatus
  readonly selectedAssetId: string | null
  readonly selectedProjectId: string | null
  readonly selectedVersionId: string | null
  readonly versionIds: readonly string[]
  readonly versionStatus: LoadStatus
}

export type InsightsFocusTarget =
  | "harness-templates"
  | "project-context"
  | "prompt-library"
  | "prompt-quality"
  | "prompt-templates"
  | "prompt-version"
  | "settings-maintenance"

export type InsightsNavigationStep =
  | { readonly kind: "select_project"; readonly projectId: string }
  | { readonly kind: "select_asset"; readonly promptAssetId: string }
  | { readonly kind: "select_version"; readonly promptVersionId: string }
  | { readonly kind: "apply_tag_filter"; readonly projectId: string; readonly tagId: string }
  | { readonly kind: "select_prompt_template"; readonly promptTemplateId: string }
  | { readonly kind: "select_harness_template"; readonly harnessTemplateId: string }
  | {
      readonly kind: "select_context_profile"
      readonly projectId: string
      readonly profileId: string
    }
  | { readonly kind: "focus"; readonly target: InsightsFocusTarget }
  | { readonly kind: "wait" }

function promptNavigationStep(
  intent: Extract<InsightsNavigationIntent, { readonly kind: "prompt" | "prompt_quality" }>,
  snapshot: InsightsNavigationSnapshot,
): InsightsNavigationStep {
  if (snapshot.selectedProjectId !== intent.projectId) {
    return { kind: "select_project", projectId: intent.projectId }
  }
  if (snapshot.assetStatus !== "ready") return { kind: "wait" }
  if (!snapshot.assetIds.includes(intent.promptAssetId)) return { kind: "wait" }
  if (snapshot.selectedAssetId !== intent.promptAssetId) {
    return { kind: "select_asset", promptAssetId: intent.promptAssetId }
  }
  if (intent.promptVersionId === null) return { kind: "focus", target: "prompt-version" }
  if (snapshot.versionStatus !== "ready") return { kind: "wait" }
  if (!snapshot.versionIds.includes(intent.promptVersionId)) return { kind: "wait" }
  if (snapshot.selectedVersionId !== intent.promptVersionId) {
    return { kind: "select_version", promptVersionId: intent.promptVersionId }
  }
  return {
    kind: "focus",
    target: intent.kind === "prompt_quality" ? "prompt-quality" : "prompt-version",
  }
}

function assertNever(intent: never): never {
  throw new TypeError(`Unexpected insights navigation intent: ${JSON.stringify(intent)}`)
}

export function resolveInsightsNavigationStep(
  intent: InsightsNavigationIntent,
  snapshot: InsightsNavigationSnapshot,
): InsightsNavigationStep {
  switch (intent.kind) {
    case "project":
      return snapshot.selectedProjectId === intent.projectId
        ? { kind: "focus", target: "prompt-library" }
        : { kind: "select_project", projectId: intent.projectId }
    case "prompt":
    case "prompt_quality":
      return promptNavigationStep(intent, snapshot)
    case "tag":
      return snapshot.selectedProjectId !== intent.projectId
        ? { kind: "select_project", projectId: intent.projectId }
        : { kind: "apply_tag_filter", projectId: intent.projectId, tagId: intent.tagId }
    case "prompt_templates":
      return intent.promptTemplateId === null
        ? { kind: "focus", target: "prompt-templates" }
        : { kind: "select_prompt_template", promptTemplateId: intent.promptTemplateId }
    case "harness_templates":
      return intent.harnessTemplateId === null
        ? { kind: "focus", target: "harness-templates" }
        : { kind: "select_harness_template", harnessTemplateId: intent.harnessTemplateId }
    case "project_context":
      if (snapshot.selectedProjectId !== intent.projectId) {
        return { kind: "select_project", projectId: intent.projectId }
      }
      return intent.profileId === null
        ? { kind: "focus", target: "project-context" }
        : {
            kind: "select_context_profile",
            projectId: intent.projectId,
            profileId: intent.profileId,
          }
    case "maintenance":
      return { kind: "focus", target: "settings-maintenance" }
    default:
      return assertNever(intent)
  }
}
