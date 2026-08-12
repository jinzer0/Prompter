import type { SensitiveFinding } from "../../../electron/ipc-types"
import type { InsightsNavigationIntent } from "./insights-navigation"
import { focusInsightsTarget } from "./insights-selection-request"

type PromptAssetLocation = {
  readonly id: string
  readonly projectId: string | null
}

type PromptVersionLocation = {
  readonly id: string
  readonly promptAssetId: string
}

type PromptQualityReviewLocation = {
  readonly promptVersionId: string | null
}

type ProjectContextOwner = {
  readonly projectId: string
}

export type PrivacyNavigationReader = {
  readonly getPromptAsset: (id: string) => Promise<PromptAssetLocation | null>
  readonly getProjectContextOwner: (id: string) => Promise<ProjectContextOwner | null>
  readonly getPromptQualityReview: (id: string) => Promise<PromptQualityReviewLocation | null>
  readonly getPromptVersion: (id: string) => Promise<PromptVersionLocation | null>
}

export type PrivacyFindingDestination =
  | { readonly kind: "insights"; readonly intent: InsightsNavigationIntent }
  | { readonly kind: "settings"; readonly target: "settings" }

type PrivacyNavigationActions = {
  readonly navigate: (intent: InsightsNavigationIntent) => void
  readonly openLibrary: () => void
  readonly projectIds: readonly string[]
}

const settingsDestination = {
  kind: "settings",
  target: "settings",
} as const satisfies PrivacyFindingDestination

async function promptDestination(
  promptVersionId: string,
  reader: PrivacyNavigationReader,
  kind: "prompt" | "prompt_quality",
): Promise<PrivacyFindingDestination> {
  const version = await reader.getPromptVersion(promptVersionId)
  if (version === null) return settingsDestination
  const asset = await reader.getPromptAsset(version.promptAssetId)
  if (asset === null || asset.projectId === null) return settingsDestination
  return {
    kind: "insights",
    intent: {
      kind,
      projectId: asset.projectId,
      promptAssetId: asset.id,
      promptVersionId: version.id,
    },
  }
}

export async function resolvePrivacyFindingNavigation(
  location: SensitiveFinding["location"],
  reader: PrivacyNavigationReader,
): Promise<PrivacyFindingDestination> {
  const entityId = location.entityId
  if (entityId === undefined) return settingsDestination

  switch (location.entityType) {
    case "project":
      return { kind: "insights", intent: { kind: "project", projectId: entityId } }
    case "prompt_asset": {
      const asset = await reader.getPromptAsset(entityId)
      return asset === null || asset.projectId === null
        ? settingsDestination
        : {
            kind: "insights",
            intent: {
              kind: "prompt",
              projectId: asset.projectId,
              promptAssetId: asset.id,
              promptVersionId: null,
            },
          }
    }
    case "prompt_version":
      return promptDestination(entityId, reader, "prompt")
    case "prompt_quality_review": {
      const review = await reader.getPromptQualityReview(entityId)
      if (review === null || review.promptVersionId === null) return settingsDestination
      return promptDestination(review.promptVersionId, reader, "prompt_quality")
    }
    case "prompt_template":
      return {
        kind: "insights",
        intent: { kind: "prompt_templates", promptTemplateId: entityId },
      }
    case "harness_template":
      return {
        kind: "insights",
        intent: { kind: "harness_templates", harnessTemplateId: entityId },
      }
    case "project_context": {
      const owner = await reader.getProjectContextOwner(entityId)
      return owner === null
        ? settingsDestination
        : {
            kind: "insights",
            intent: { kind: "project_context", projectId: owner.projectId, profileId: entityId },
          }
    }
    case "tag":
      return settingsDestination
    default:
      return settingsDestination
  }
}

export async function navigateToPrivacyFinding(
  location: SensitiveFinding["location"],
  actions: PrivacyNavigationActions,
): Promise<void> {
  const destination = await resolvePrivacyFindingNavigation(location, {
    getPromptAsset: window.prompter.prompts.getAsset,
    getProjectContextOwner: async (profileId) => {
      const profiles = await Promise.all(
        actions.projectIds.map((projectId) =>
          window.prompter.projectContextProfiles.get(projectId, profileId),
        ),
      )
      const profile = profiles.find((candidate) => candidate !== null)
      return profile === undefined ? null : { projectId: profile.projectId }
    },
    getPromptQualityReview: (reviewId) => window.prompter.promptQuality.getReview({ reviewId }),
    getPromptVersion: window.prompter.prompts.getVersion,
  })

  switch (destination.kind) {
    case "insights":
      actions.navigate(destination.intent)
      return
    case "settings":
      actions.openLibrary()
      focusInsightsTarget(destination.target)
      return
    default:
      destination satisfies never
  }
}
