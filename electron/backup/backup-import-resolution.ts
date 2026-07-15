import { randomUUID } from "node:crypto"
import { DEFAULT_HARNESS_TEMPLATE_IDS } from "../db/default-harness-templates.js"
import type { AppDatabase } from "../db/repositories/common.js"
import * as schema from "../db/schema.js"
import type {
  BackupEnvelope,
  BackupHarnessTemplate,
  BackupProject,
  BackupProjectContextProfile,
  BackupPromptAsset,
  BackupPromptQualityReview,
  BackupPromptTag,
  BackupPromptTemplate,
  BackupPromptVersion,
  BackupTag,
  BackupType,
  BackupWarning,
} from "../ipc-types.js"
import type {
  ResolvedBackupImport,
  ResolvedBackupImportName,
  ResolvedPromptAssetUpdate,
} from "./backup-import-types.js"

// allow: SIZE_OK - one exhaustive, pre-transaction relationship resolution table.
type BackupRows = {
  readonly projects: readonly BackupProject[]
  readonly promptAssets: readonly BackupPromptAsset[]
  readonly promptVersions: readonly BackupPromptVersion[]
  readonly tags: readonly BackupTag[]
  readonly promptTags: readonly BackupPromptTag[]
  readonly harnessTemplates: readonly BackupHarnessTemplate[]
  readonly projectContextProfiles: readonly BackupProjectContextProfile[]
  readonly promptTemplates: readonly BackupPromptTemplate[]
  readonly promptQualityReviews: readonly BackupPromptQualityReview[]
}

type ResolutionDependencies = {
  readonly db: AppDatabase
  readonly envelope: BackupEnvelope
  readonly destinationProjectId: string | undefined
  readonly initialWarnings: readonly BackupWarning[]
  readonly createId?: () => string
}

export class BackupImportResolutionError extends Error {
  readonly name = "BackupImportResolutionError"

  constructor(
    readonly code: "missing_current_version" | "unsupported_relationship" | "duplicate_source_id",
    readonly entity: string,
    readonly sourceId: string,
  ) {
    super(`Backup import ${code} for ${entity} ${sourceId}`)
  }
}

function assertNever(value: never): never {
  throw new TypeError(`Unsupported backup type: ${value}`)
}

function rowsForEnvelope(envelope: BackupEnvelope): BackupRows {
  switch (envelope.backupType) {
    case "full":
      return envelope.data
    case "project":
      return { ...envelope.data, harnessTemplates: [] }
    case "prompt_assets":
      return {
        ...envelope.data,
        projects: [],
        harnessTemplates: [],
        projectContextProfiles: [],
        promptTemplates: [],
      }
    case "prompt_templates":
      return {
        ...envelope.data,
        projects: [],
        promptAssets: [],
        promptVersions: [],
        tags: [],
        promptTags: [],
        harnessTemplates: [],
        projectContextProfiles: [],
        promptQualityReviews: [],
      }
    case "harness_templates":
      return {
        ...envelope.data,
        projects: [],
        promptAssets: [],
        promptVersions: [],
        tags: [],
        promptTags: [],
        projectContextProfiles: [],
        promptTemplates: [],
        promptQualityReviews: [],
      }
    default:
      return assertNever(envelope)
  }
}

function createIdMap<T extends { readonly id: string }>(
  rows: readonly T[],
  entity: string,
  createId: () => string,
): Map<string, string> {
  const ids = new Map<string, string>()
  for (const row of rows) {
    if (ids.has(row.id)) {
      throw new BackupImportResolutionError("duplicate_source_id", entity, row.id)
    }
    ids.set(row.id, createId())
  }
  return ids
}

function mappedId(map: ReadonlyMap<string, string>, entity: string, sourceId: string): string {
  const id = map.get(sourceId)
  if (id === undefined) {
    throw new BackupImportResolutionError("unsupported_relationship", entity, sourceId)
  }
  return id
}

function resolvedNames<T extends { readonly id: string; readonly name: string }>(
  rows: readonly T[],
  occupiedNames: ReadonlySet<string>,
): Map<string, string> {
  const occupied = new Set(occupiedNames)
  const names = new Map<string, string>()
  for (const row of rows) {
    let name = row.name
    let suffix = 1
    while (occupied.has(name)) {
      name = suffix === 1 ? `${row.name} Imported` : `${row.name} Imported ${suffix}`
      suffix += 1
    }
    occupied.add(name)
    names.set(row.id, name)
  }
  return names
}

function resolvedNameRows<T extends { readonly id: string; readonly name: string }>(
  rows: readonly T[],
  namesById: ReadonlyMap<string, string>,
): ResolvedBackupImportName[] {
  return rows.map((row) => ({
    sourceId: row.id,
    sourceName: row.name,
    resolvedName: mappedId(namesById, "resolved name", row.id),
  }))
}

function addWarning(
  warnings: BackupWarning[],
  entityType: string,
  sourceId: string,
  message: string,
): void {
  warnings.push({ code: "external_reference_removed", message, entityType, sourceId })
}

function resolvedAssetProjectId(input: {
  readonly backupType: BackupType
  readonly sourceProjectId: string | null
  readonly sourceAssetId: string
  readonly destinationProjectId: string | undefined
  readonly projectIds: ReadonlyMap<string, string>
  readonly warnings: BackupWarning[]
}): string | null {
  switch (input.backupType) {
    case "prompt_assets":
      if (input.destinationProjectId === undefined) {
        throw new BackupImportResolutionError(
          "unsupported_relationship",
          "destination project",
          input.sourceAssetId,
        )
      }
      return input.destinationProjectId
    case "full":
    case "project": {
      if (input.sourceProjectId === null) {
        return null
      }
      const projectId = input.projectIds.get(input.sourceProjectId)
      if (projectId !== undefined) {
        return projectId
      }
      addWarning(
        input.warnings,
        "prompt_asset",
        input.sourceAssetId,
        "External project reference removed",
      )
      return null
    }
    case "prompt_templates":
    case "harness_templates":
      throw new BackupImportResolutionError(
        "unsupported_relationship",
        "prompt asset",
        input.sourceAssetId,
      )
    default:
      return assertNever(input.backupType)
  }
}

function resolvedLineage(input: {
  readonly asset: BackupPromptAsset
  readonly assetIds: ReadonlyMap<string, string>
  readonly versionIds: ReadonlyMap<string, string>
  readonly sourceVersions: ReadonlyMap<string, BackupPromptVersion>
  readonly warnings: BackupWarning[]
}): Omit<ResolvedPromptAssetUpdate, "id" | "currentVersionId"> {
  const { asset } = input
  if (
    asset.parentPromptId !== null &&
    asset.parentPromptVersionId !== null &&
    asset.derivationType !== null
  ) {
    const parentVersion = input.sourceVersions.get(asset.parentPromptVersionId)
    const parentPromptId = input.assetIds.get(asset.parentPromptId)
    const parentPromptVersionId = input.versionIds.get(asset.parentPromptVersionId)
    if (
      parentVersion !== undefined &&
      parentVersion.promptAssetId === asset.parentPromptId &&
      parentPromptId !== undefined &&
      parentPromptVersionId !== undefined
    ) {
      return { parentPromptId, parentPromptVersionId, derivationType: asset.derivationType }
    }
  }
  if (
    asset.parentPromptId !== null ||
    asset.parentPromptVersionId !== null ||
    asset.derivationType !== null
  ) {
    addWarning(input.warnings, "prompt_asset", asset.id, "External lineage reference removed")
  }
  return { parentPromptId: null, parentPromptVersionId: null, derivationType: null }
}

function resolvedTemplateSources(input: {
  readonly template: BackupPromptTemplate
  readonly assetIds: ReadonlyMap<string, string>
  readonly versionIds: ReadonlyMap<string, string>
  readonly warnings: BackupWarning[]
}): Pick<BackupPromptTemplate, "sourcePromptAssetId" | "sourcePromptVersionId"> {
  const { template } = input
  if (template.sourcePromptAssetId !== null && template.sourcePromptVersionId !== null) {
    const sourcePromptAssetId = input.assetIds.get(template.sourcePromptAssetId)
    const sourcePromptVersionId = input.versionIds.get(template.sourcePromptVersionId)
    if (sourcePromptAssetId !== undefined && sourcePromptVersionId !== undefined) {
      return { sourcePromptAssetId, sourcePromptVersionId }
    }
  }
  if (template.sourcePromptAssetId !== null || template.sourcePromptVersionId !== null) {
    addWarning(
      input.warnings,
      "prompt_template",
      template.id,
      "External prompt template source removed",
    )
  }
  return { sourcePromptAssetId: null, sourcePromptVersionId: null }
}

export function resolveBackupImport(dependencies: ResolutionDependencies): ResolvedBackupImport {
  const rows = rowsForEnvelope(dependencies.envelope)
  const createId = dependencies.createId ?? randomUUID
  const warnings = [...dependencies.initialWarnings]
  const defaultHarnessTemplateIds = new Set<string>(Object.values(DEFAULT_HARNESS_TEMPLATE_IDS))
  const importedHarnessTemplates = rows.harnessTemplates.filter((template) => {
    if (!defaultHarnessTemplateIds.has(template.id)) {
      return true
    }
    warnings.push({
      code: "default_harness_template_reused",
      message: "Existing default harness template reused",
      entityType: "harness_template",
      sourceId: template.id,
    })
    return false
  })
  const existingTags = new Map(
    dependencies.db
      .select({ id: schema.tags.id, name: schema.tags.name })
      .from(schema.tags)
      .all()
      .map((tag) => [tag.name, tag.id]),
  )
  const projectNames = new Set(
    dependencies.db
      .select({ name: schema.projects.name })
      .from(schema.projects)
      .all()
      .map((row) => row.name),
  )
  const templateNames = new Set(
    dependencies.db
      .select({ name: schema.promptTemplates.name })
      .from(schema.promptTemplates)
      .all()
      .map((row) => row.name),
  )
  const harnessNames = new Set(
    dependencies.db
      .select({ name: schema.harnessTemplates.name })
      .from(schema.harnessTemplates)
      .all()
      .map((row) => row.name),
  )
  const projectIds = createIdMap(rows.projects, "project", createId)
  const assetIds = createIdMap(rows.promptAssets, "prompt asset", createId)
  const versionIds = createIdMap(rows.promptVersions, "prompt version", createId)
  const profileIds = createIdMap(rows.projectContextProfiles, "project context profile", createId)
  const templateIds = createIdMap(rows.promptTemplates, "prompt template", createId)
  const harnessIds = createIdMap(importedHarnessTemplates, "harness template", createId)
  const reviewIds = createIdMap(rows.promptQualityReviews, "prompt quality review", createId)
  const projectNamesById = resolvedNames(rows.projects, projectNames)
  const templateNamesById = resolvedNames(rows.promptTemplates, templateNames)
  const harnessNamesById = resolvedNames(importedHarnessTemplates, harnessNames)
  const createdTags: BackupTag[] = []
  const tagIds = new Map<string, string>()
  const createdTagIdsByName = new Map<string, string>()

  for (const tag of rows.tags) {
    if (tagIds.has(tag.id)) {
      throw new BackupImportResolutionError("duplicate_source_id", "tag", tag.id)
    }
    const existingTagId = existingTags.get(tag.name)
    const createdTagId = createdTagIdsByName.get(tag.name)
    const id = existingTagId ?? createdTagId ?? createId()
    if (existingTagId === undefined && createdTagId === undefined) {
      createdTagIdsByName.set(tag.name, id)
      createdTags.push({ ...tag, id })
    }
    tagIds.set(tag.id, id)
  }

  const sourceVersions = new Map(rows.promptVersions.map((version) => [version.id, version]))
  const projects = rows.projects.map((project) => ({
    ...project,
    id: mappedId(projectIds, "project", project.id),
    name: mappedId(projectNamesById, "project name", project.id),
  }))
  const promptAssets = rows.promptAssets.map((asset) => ({
    ...asset,
    id: mappedId(assetIds, "prompt asset", asset.id),
    projectId: resolvedAssetProjectId({
      backupType: dependencies.envelope.backupType,
      sourceProjectId: asset.projectId,
      sourceAssetId: asset.id,
      destinationProjectId: dependencies.destinationProjectId,
      projectIds,
      warnings,
    }),
    currentVersionId: null,
    parentPromptId: null,
    parentPromptVersionId: null,
    derivationType: null,
  }))
  const promptVersions = rows.promptVersions.flatMap((version) => {
    const promptAssetId = assetIds.get(version.promptAssetId)
    if (promptAssetId === undefined) {
      addWarning(
        warnings,
        "prompt_version",
        version.id,
        "Version for an external prompt asset removed",
      )
      return []
    }
    return [{ ...version, id: mappedId(versionIds, "prompt version", version.id), promptAssetId }]
  })
  const promptAssetUpdates = rows.promptAssets.map((asset) => {
    const sourceCurrentVersionId = asset.currentVersionId
    const sourceVersion =
      sourceCurrentVersionId === null ? undefined : sourceVersions.get(sourceCurrentVersionId)
    if (sourceCurrentVersionId === null || sourceVersion?.promptAssetId !== asset.id) {
      throw new BackupImportResolutionError("missing_current_version", "prompt asset", asset.id)
    }
    return {
      id: mappedId(assetIds, "prompt asset", asset.id),
      currentVersionId: mappedId(versionIds, "prompt version", sourceCurrentVersionId),
      ...resolvedLineage({ asset, assetIds, versionIds, sourceVersions, warnings }),
    }
  })
  const promptTags = rows.promptTags.flatMap((link) => {
    const promptAssetId = assetIds.get(link.promptAssetId)
    const tagId = tagIds.get(link.tagId)
    if (promptAssetId === undefined || tagId === undefined) {
      addWarning(
        warnings,
        "prompt_tag",
        link.promptAssetId,
        "External prompt tag reference removed",
      )
      return []
    }
    return [{ promptAssetId, tagId }]
  })
  const projectContextProfiles = rows.projectContextProfiles.flatMap((profile) => {
    const projectId = projectIds.get(profile.projectId)
    if (projectId === undefined) {
      addWarning(
        warnings,
        "project_context_profile",
        profile.id,
        "External project profile removed",
      )
      return []
    }
    return [
      { ...profile, id: mappedId(profileIds, "project context profile", profile.id), projectId },
    ]
  })
  const promptTemplates = rows.promptTemplates.map((template) => ({
    ...template,
    id: mappedId(templateIds, "prompt template", template.id),
    name: mappedId(templateNamesById, "prompt template name", template.id),
    ...resolvedTemplateSources({ template, assetIds, versionIds, warnings }),
  }))
  const harnessTemplates = importedHarnessTemplates.map((template) => ({
    ...template,
    id: mappedId(harnessIds, "harness template", template.id),
    name: mappedId(harnessNamesById, "harness template name", template.id),
  }))
  const promptQualityReviews = rows.promptQualityReviews.flatMap((review) => {
    const promptVersionId = versionIds.get(review.promptVersionId)
    if (promptVersionId === undefined) {
      addWarning(
        warnings,
        "prompt_quality_review",
        review.id,
        "External prompt quality review removed",
      )
      return []
    }
    return [
      { ...review, id: mappedId(reviewIds, "prompt quality review", review.id), promptVersionId },
    ]
  })
  const versionsBySourceId = new Map(rows.promptVersions.map((version) => [version.id, version]))
  const searchRows = rows.promptAssets.map((asset) => {
    const currentVersionId = asset.currentVersionId
    if (currentVersionId === null) {
      throw new BackupImportResolutionError("missing_current_version", "prompt asset", asset.id)
    }
    const version = versionsBySourceId.get(currentVersionId)
    if (version === undefined || version.promptAssetId !== asset.id) {
      throw new BackupImportResolutionError("missing_current_version", "prompt asset", asset.id)
    }
    return {
      promptAssetId: mappedId(assetIds, "prompt asset", asset.id),
      title: asset.title,
      originalInput: version.originalInput,
      compiledPrompt: version.compiledPrompt,
    }
  })

  return {
    backupType: dependencies.envelope.backupType,
    tags: createdTags,
    projects,
    promptAssets,
    promptVersions,
    promptAssetUpdates,
    promptTags,
    projectContextProfiles,
    promptTemplates,
    harnessTemplates,
    promptQualityReviews,
    searchRows,
    importedCounts: {
      projects: projects.length,
      promptAssets: promptAssets.length,
      promptVersions: promptVersions.length,
      tags: rows.tags.length,
      promptTags: promptTags.length,
      harnessTemplates: harnessTemplates.length,
      projectContextProfiles: projectContextProfiles.length,
      promptTemplates: promptTemplates.length,
      promptQualityReviews: promptQualityReviews.length,
    },
    createdProjectIds: projects.map((project) => project.id),
    createdPromptAssetIds: promptAssets.map((asset) => asset.id),
    createdPromptTemplateIds: promptTemplates.map((template) => template.id),
    createdHarnessTemplateIds: harnessTemplates.map((template) => template.id),
    resolvedNames: {
      projects: resolvedNameRows(rows.projects, projectNamesById),
      promptTemplates: resolvedNameRows(rows.promptTemplates, templateNamesById),
      harnessTemplates: resolvedNameRows(importedHarnessTemplates, harnessNamesById),
    },
    warnings,
  }
}
