import type { AppDatabase } from "../db/repositories/common.js"
import type {
  BackupConflict,
  BackupConsequence,
  BackupEnvelope,
  BackupItemCounts,
  BackupType,
  BackupWarning,
} from "../ipc-types.js"
import { resolveBackupImport } from "./backup-import-resolution.js"
import type { ResolvedBackupImportName } from "./backup-import-types.js"
import type { BackupResolutionPlan } from "./backup-session-store.js"

type PreviewRows = {
  readonly projects: readonly { readonly id: string; readonly name: string }[]
  readonly promptTemplates: readonly { readonly id: string; readonly name: string }[]
  readonly harnessTemplates: readonly { readonly id: string; readonly name: string }[]
  readonly tags: readonly { readonly id: string; readonly name: string }[]
}

function itemCounts(envelope: BackupEnvelope): BackupItemCounts {
  const { data } = envelope
  return {
    projects: "projects" in data ? data.projects.length : 0,
    promptAssets: "promptAssets" in data ? data.promptAssets.length : 0,
    promptVersions: "promptVersions" in data ? data.promptVersions.length : 0,
    tags: "tags" in data ? data.tags.length : 0,
    promptTags: "promptTags" in data ? data.promptTags.length : 0,
    harnessTemplates: "harnessTemplates" in data ? data.harnessTemplates.length : 0,
    projectContextProfiles:
      "projectContextProfiles" in data ? data.projectContextProfiles.length : 0,
    promptTemplates: "promptTemplates" in data ? data.promptTemplates.length : 0,
    promptQualityReviews: "promptQualityReviews" in data ? data.promptQualityReviews.length : 0,
  }
}

function countsMatch(left: BackupItemCounts, right: BackupItemCounts): boolean {
  return (
    left.projects === right.projects &&
    left.promptAssets === right.promptAssets &&
    left.promptVersions === right.promptVersions &&
    left.tags === right.tags &&
    left.promptTags === right.promptTags &&
    left.harnessTemplates === right.harnessTemplates &&
    left.projectContextProfiles === right.projectContextProfiles &&
    left.promptTemplates === right.promptTemplates &&
    left.promptQualityReviews === right.promptQualityReviews
  )
}

function basePreviewDetails(envelope: BackupEnvelope): BackupResolutionPlan {
  const counts = itemCounts(envelope)
  const requiresDestinationProject = envelope.backupType === "prompt_assets"
  const warnings: BackupWarning[] = [
    {
      code: "backup_plaintext",
      message: "Backup files are plaintext and may contain sensitive user-authored content.",
    },
  ]
  if (!countsMatch(counts, envelope.metadata.itemCounts)) {
    warnings.push({
      code: "metadata_counts_recomputed",
      message: "Preview counts were recalculated from backup data.",
    })
  }

  return {
    itemCounts: counts,
    conflicts: [],
    warnings,
    consequences: [
      {
        code: "safe_duplicate",
        message: "Import adds copies and never overwrites existing rows.",
        count: Object.values(counts).reduce((total, count) => total + count, 0),
      },
      {
        code: "tag_name_reuse",
        message: "Existing tags with the same name will be reused.",
        count: counts.tags,
      },
      ...(requiresDestinationProject
        ? [
            {
              code: "destination_project_required",
              message: "Prompt asset packs cannot import until a destination project is selected.",
              count: counts.promptAssets,
            },
          ]
        : []),
    ],
    requiresDestinationProject,
  }
}

function assertNever(value: never): never {
  throw new TypeError(`Unsupported backup envelope: ${JSON.stringify(value)}`)
}

function sourceRows(envelope: BackupEnvelope): PreviewRows {
  switch (envelope.backupType) {
    case "full":
      return envelope.data
    case "project":
      return { ...envelope.data, harnessTemplates: [] }
    case "prompt_assets":
      return { projects: [], promptTemplates: [], harnessTemplates: [], tags: envelope.data.tags }
    case "prompt_templates":
      return {
        projects: [],
        promptTemplates: envelope.data.promptTemplates,
        harnessTemplates: [],
        tags: [],
      }
    case "harness_templates":
      return {
        projects: [],
        promptTemplates: [],
        harnessTemplates: envelope.data.harnessTemplates,
        tags: [],
      }
    default:
      return assertNever(envelope)
  }
}

function conflictForRenamedRow(input: {
  readonly code: string
  readonly entityType: string
  readonly sourceId: string
  readonly sourceName: string
  readonly resolvedName: string
}): BackupConflict | null {
  if (input.sourceName === input.resolvedName) {
    return null
  }

  return {
    code: input.code,
    entityType: input.entityType,
    sourceId: input.sourceId,
    message: `${input.sourceName} already exists and will import as ${input.resolvedName}.`,
    resolution: `Create copied ${input.entityType} named ${input.resolvedName}.`,
  }
}

function compactConflicts(conflicts: readonly (BackupConflict | null)[]): BackupConflict[] {
  return conflicts.filter((conflict): conflict is BackupConflict => conflict !== null)
}

function conflictsForResolvedNames(input: {
  readonly code: string
  readonly entityType: string
  readonly rows: readonly ResolvedBackupImportName[]
}): BackupConflict[] {
  return compactConflicts(
    input.rows.map((row) =>
      conflictForRenamedRow({
        code: input.code,
        entityType: input.entityType,
        sourceId: row.sourceId,
        sourceName: row.sourceName,
        resolvedName: row.resolvedName,
      }),
    ),
  )
}

function destinationProjectIdForPreview(backupType: BackupType): string | undefined {
  return backupType === "prompt_assets" ? "00000000-0000-4000-8000-000000000000" : undefined
}

function appendPreliminaryConsequences(input: {
  readonly details: BackupResolutionPlan
  readonly reusedTagCount: number
}): BackupConsequence[] {
  const consequences = [...input.details.consequences]

  if (input.reusedTagCount > 0) {
    consequences.push({
      code: "existing_tags_reused",
      message: "Existing tags with matching names will be reused instead of duplicated.",
      count: input.reusedTagCount,
    })
  }

  return consequences
}

export function createBackupPreviewDetails(
  envelope: BackupEnvelope,
  db: AppDatabase | undefined,
): BackupResolutionPlan {
  const details = basePreviewDetails(envelope)
  if (db === undefined) {
    return details
  }

  const resolution = resolveBackupImport({
    db,
    envelope,
    destinationProjectId: destinationProjectIdForPreview(envelope.backupType),
    initialWarnings: details.warnings,
  })
  const rows = sourceRows(envelope)
  const projectConflicts = conflictsForResolvedNames({
    code: "project_name_conflict",
    entityType: "project",
    rows: resolution.resolvedNames.projects,
  })
  const templateConflicts = conflictsForResolvedNames({
    code: "prompt_template_name_conflict",
    entityType: "prompt_template",
    rows: resolution.resolvedNames.promptTemplates,
  })
  const harnessConflicts = conflictsForResolvedNames({
    code: "harness_template_name_conflict",
    entityType: "harness_template",
    rows: resolution.resolvedNames.harnessTemplates,
  })

  return {
    ...details,
    conflicts: [...projectConflicts, ...templateConflicts, ...harnessConflicts],
    warnings: resolution.warnings,
    consequences: appendPreliminaryConsequences({
      details,
      reusedTagCount: rows.tags.length - resolution.tags.length,
    }),
  }
}
