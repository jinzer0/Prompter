import { and, desc, eq, isNull, type SQL } from "drizzle-orm"

import type {
  CreatePromptAssetInput,
  DeleteResult,
  PromptAsset,
  PromptAssetFilter,
  PromptDerivationType,
  PromptLineage,
  PromptLineageSummary,
  UpdatePromptAssetInput,
} from "../../ipc-types.js"
import { PromptLineageCycleError } from "../errors.js"
import * as schema from "../schema.js"
import { type AppDatabase, createId, createTimestamp, optionalText, requireRow } from "./common.js"
import { createPromptVersionRepository, type PromptVersionRepository } from "./prompt-versions.js"

export type CreatePromptAssetWithLineageInput = CreatePromptAssetInput & {
  readonly parentPromptId?: string | null
  readonly parentPromptVersionId?: string | null
  readonly derivationType?: PromptDerivationType | null
}

export type PromptRepository = PromptVersionRepository & {
  readonly createPromptAsset: (input: CreatePromptAssetInput) => PromptAsset
  readonly listPromptAssets: (filter?: PromptAssetFilter) => readonly PromptAsset[]
  readonly getPromptAsset: (id: string) => PromptAsset | null
  readonly updatePromptAsset: (id: string, input: UpdatePromptAssetInput) => PromptAsset
  readonly deletePromptAsset: (id: string) => DeleteResult
  readonly getLineage: (promptAssetId: string) => PromptLineage
}

export type PromptPersistenceRepository = PromptRepository & {
  readonly createPromptAssetWithLineage: (input: CreatePromptAssetWithLineageInput) => PromptAsset
  readonly assertLineageIsAcyclic: (sourcePromptAssetId: string) => void
}

function assetFilters(filter: PromptAssetFilter | undefined): SQL | undefined {
  const conditions: SQL[] = []

  if (filter?.projectId !== undefined) {
    conditions.push(
      filter.projectId === null
        ? isNull(schema.promptAssets.projectId)
        : eq(schema.promptAssets.projectId, filter.projectId),
    )
  }
  if (filter?.scenario !== undefined) {
    conditions.push(eq(schema.promptAssets.scenario, filter.scenario))
  }
  if (filter?.targetAgent !== undefined) {
    conditions.push(eq(schema.promptAssets.targetAgent, filter.targetAgent))
  }

  return and(...conditions)
}

export function createPromptRepository(db: AppDatabase): PromptPersistenceRepository {
  const promptVersions = createPromptVersionRepository(db)

  function insertPromptAsset(input: CreatePromptAssetWithLineageInput): PromptAsset {
    const now = createTimestamp()

    return requireRow(
      db
        .insert(schema.promptAssets)
        .values({
          id: createId(),
          projectId: optionalText(input.projectId),
          title: input.title,
          scenario: input.scenario,
          targetAgent: input.targetAgent,
          currentVersionId: null,
          parentPromptId: optionalText(input.parentPromptId),
          parentPromptVersionId: optionalText(input.parentPromptVersionId),
          derivationType: input.derivationType ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get(),
      "prompt asset",
      input.title,
    )
  }

  function sameProject(first: PromptAsset, second: PromptAsset): boolean {
    return first.projectId === second.projectId
  }

  function parentSummary(asset: PromptAsset): PromptLineageSummary | null {
    if (
      asset.parentPromptId === null ||
      asset.parentPromptVersionId === null ||
      asset.derivationType === null
    ) {
      return null
    }

    const parent = db
      .select({
        asset: schema.promptAssets,
        version: schema.promptVersions,
      })
      .from(schema.promptAssets)
      .innerJoin(
        schema.promptVersions,
        and(
          eq(schema.promptVersions.id, asset.parentPromptVersionId),
          eq(schema.promptVersions.promptAssetId, schema.promptAssets.id),
        ),
      )
      .where(eq(schema.promptAssets.id, asset.parentPromptId))
      .get()

    if (parent === undefined || !sameProject(asset, parent.asset)) {
      return null
    }

    return {
      promptAssetId: parent.asset.id,
      promptVersionId: parent.version.id,
      title: parent.asset.title,
      versionNumber: parent.version.versionNumber,
      derivationType: asset.derivationType,
    }
  }

  return {
    ...promptVersions,
    createPromptAsset(input) {
      return insertPromptAsset(input)
    },
    createPromptAssetWithLineage(input) {
      return insertPromptAsset(input)
    },
    listPromptAssets(filter) {
      const where = assetFilters(filter)

      if (where !== undefined) {
        return db
          .select()
          .from(schema.promptAssets)
          .where(where)
          .orderBy(desc(schema.promptAssets.createdAt))
          .all()
      }

      return db
        .select()
        .from(schema.promptAssets)
        .orderBy(desc(schema.promptAssets.createdAt))
        .all()
    },
    getPromptAsset(id) {
      return (
        db.select().from(schema.promptAssets).where(eq(schema.promptAssets.id, id)).get() ?? null
      )
    },
    updatePromptAsset(id, input) {
      const values: {
        projectId?: string | null
        title?: string
        scenario?: PromptAsset["scenario"]
        targetAgent?: PromptAsset["targetAgent"]
        currentVersionId?: string | null
        updatedAt: number
      } = { updatedAt: createTimestamp() }

      if (input.projectId !== undefined) {
        values.projectId = optionalText(input.projectId)
      }
      if (input.title !== undefined) {
        values.title = input.title
      }
      if (input.scenario !== undefined) {
        values.scenario = input.scenario
      }
      if (input.targetAgent !== undefined) {
        values.targetAgent = input.targetAgent
      }
      if (input.currentVersionId !== undefined) {
        values.currentVersionId = optionalText(input.currentVersionId)
      }
      return requireRow(
        db
          .update(schema.promptAssets)
          .set(values)
          .where(eq(schema.promptAssets.id, id))
          .returning()
          .get(),
        "prompt asset",
        id,
      )
    },
    deletePromptAsset(id) {
      db.delete(schema.promptAssets).where(eq(schema.promptAssets.id, id)).run()
      return { id }
    },
    assertLineageIsAcyclic(sourcePromptAssetId) {
      const seenPromptAssetIds = new Set<string>()
      let currentPromptAssetId: string | null = sourcePromptAssetId

      while (currentPromptAssetId !== null) {
        if (seenPromptAssetIds.has(currentPromptAssetId)) {
          throw new PromptLineageCycleError(currentPromptAssetId)
        }

        seenPromptAssetIds.add(currentPromptAssetId)
        const current = db
          .select({ parentPromptId: schema.promptAssets.parentPromptId })
          .from(schema.promptAssets)
          .where(eq(schema.promptAssets.id, currentPromptAssetId))
          .get()
        currentPromptAssetId = current?.parentPromptId ?? null
      }
    },
    getLineage(promptAssetId) {
      const asset = requireRow(
        db
          .select()
          .from(schema.promptAssets)
          .where(eq(schema.promptAssets.id, promptAssetId))
          .get(),
        "prompt asset",
        promptAssetId,
      )
      const children = db
        .select({ asset: schema.promptAssets, version: schema.promptVersions })
        .from(schema.promptAssets)
        .innerJoin(
          schema.promptVersions,
          and(
            eq(schema.promptVersions.id, schema.promptAssets.currentVersionId),
            eq(schema.promptVersions.promptAssetId, schema.promptAssets.id),
          ),
        )
        .where(eq(schema.promptAssets.parentPromptId, asset.id))
        .orderBy(desc(schema.promptAssets.updatedAt), desc(schema.promptAssets.createdAt))
        .all()

      return {
        parent: parentSummary(asset),
        children: children.flatMap((child) => {
          const derivationType = child.asset.derivationType

          if (!sameProject(asset, child.asset) || derivationType === null) {
            return []
          }

          return [
            {
              promptAssetId: child.asset.id,
              promptVersionId: child.version.id,
              title: child.asset.title,
              versionNumber: child.version.versionNumber,
              derivationType,
            },
          ]
        }),
      }
    },
  }
}
