import {
  type MaintenancePromptAssetRow,
  type MaintenancePromptVersionRow,
  projectCurrentVersions,
} from "./current-version-projection.js"

export type { MaintenancePromptAssetRow, MaintenancePromptVersionRow }

export type MaintenanceTagRow = {
  readonly id: string
  readonly name: string
}

export type CanonicalTagRecommendation = {
  readonly tagId: string
  readonly tagName: string
  readonly reason: "normalized_name_match" | "stable_tag_id"
}

export type DuplicateTagGroup = {
  readonly normalizedName: string
  readonly tagIds: readonly string[]
  readonly canonicalRecommendation: CanonicalTagRecommendation
  readonly requiresCanonicalSelection: true
}

export const PROMPT_DUPLICATE_MATCH_REASONS = [
  "exact_title",
  "normalized_title",
  "exact_current_original_input",
  "exact_current_compiled_prompt",
  "normalized_title_scenario_target_agent",
] as const

export type PromptDuplicateMatchReason = (typeof PROMPT_DUPLICATE_MATCH_REASONS)[number]

export type DuplicatePromptCandidate = {
  readonly promptAssetIds: readonly [string, string]
  readonly matchedOn: readonly PromptDuplicateMatchReason[]
  readonly promptMetadata: readonly [PromptDuplicateMetadata, PromptDuplicateMetadata]
  readonly findingOnly: true
}

export type PromptDuplicateMetadata = {
  readonly promptAssetId: string
  readonly projectId?: string | null
  readonly scenario: string
  readonly targetAgent: string
}

export function normalizeMaintenanceName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ")
}

export function findDuplicateTagGroups(
  tags: readonly MaintenanceTagRow[],
): readonly DuplicateTagGroup[] {
  const tagsByName = new Map<string, readonly MaintenanceTagRow[]>()

  for (const tag of tags) {
    const normalizedName = normalizeMaintenanceName(tag.name)
    if (normalizedName.length === 0) {
      continue
    }
    tagsByName.set(normalizedName, [...(tagsByName.get(normalizedName) ?? []), tag])
  }

  return [...tagsByName].flatMap(([normalizedName, matchingTags]) => {
    if (matchingTags.length < 2) {
      return []
    }

    const recommendedTag = matchingTags.reduce((current, candidate) => {
      const currentMatchesNormalizedName = current.name.trim() === normalizedName
      const candidateMatchesNormalizedName = candidate.name.trim() === normalizedName
      if (candidateMatchesNormalizedName !== currentMatchesNormalizedName) {
        return candidateMatchesNormalizedName ? candidate : current
      }
      return candidate.id < current.id ? candidate : current
    })
    const reason =
      recommendedTag.name.trim() === normalizedName ? "normalized_name_match" : "stable_tag_id"

    return [
      {
        normalizedName,
        tagIds: matchingTags.map(({ id }) => id),
        canonicalRecommendation: {
          tagId: recommendedTag.id,
          tagName: recommendedTag.name.trim(),
          reason,
        },
        requiresCanonicalSelection: true,
      } as const,
    ]
  })
}

function matchesExactNonBlank(left: string, right: string): boolean {
  return left.trim().length > 0 && right.trim().length > 0 && left === right
}

function promptDuplicateMetadata(asset: MaintenancePromptAssetRow): PromptDuplicateMetadata {
  return {
    promptAssetId: asset.id,
    ...(asset.projectId === undefined ? {} : { projectId: asset.projectId }),
    scenario: asset.scenario,
    targetAgent: asset.targetAgent,
  }
}

export function findDuplicatePromptCandidates(
  assets: readonly MaintenancePromptAssetRow[],
  versions: readonly MaintenancePromptVersionRow[],
): readonly DuplicatePromptCandidate[] {
  const currentVersions = new Map(
    projectCurrentVersions(assets, versions).map(({ asset, version }) => [asset.id, version]),
  )

  return assets.flatMap((left, leftIndex) =>
    assets.slice(leftIndex + 1).flatMap((right) => {
      const leftTitle = left.title.trim()
      const rightTitle = right.title.trim()
      const leftNormalizedTitle = normalizeMaintenanceName(left.title)
      const rightNormalizedTitle = normalizeMaintenanceName(right.title)
      const matchedOn: PromptDuplicateMatchReason[] = []

      if (leftTitle.length > 0 && leftTitle === rightTitle) {
        matchedOn.push("exact_title")
      }
      if (leftNormalizedTitle.length > 0 && leftNormalizedTitle === rightNormalizedTitle) {
        matchedOn.push("normalized_title")
      }

      const leftVersion = currentVersions.get(left.id)
      const rightVersion = currentVersions.get(right.id)
      if (
        leftVersion !== undefined &&
        rightVersion !== undefined &&
        matchesExactNonBlank(leftVersion.originalInput, rightVersion.originalInput)
      ) {
        matchedOn.push("exact_current_original_input")
      }
      if (
        leftVersion !== undefined &&
        rightVersion !== undefined &&
        matchesExactNonBlank(leftVersion.compiledPrompt, rightVersion.compiledPrompt)
      ) {
        matchedOn.push("exact_current_compiled_prompt")
      }
      if (
        leftNormalizedTitle.length > 0 &&
        leftNormalizedTitle === rightNormalizedTitle &&
        left.scenario === right.scenario &&
        left.targetAgent === right.targetAgent
      ) {
        matchedOn.push("normalized_title_scenario_target_agent")
      }

      return matchedOn.length > 0
        ? [
            {
              promptAssetIds: [left.id, right.id] as const,
              matchedOn,
              promptMetadata: [promptDuplicateMetadata(left), promptDuplicateMetadata(right)],
              findingOnly: true,
            } as const,
          ]
        : []
    }),
  )
}
