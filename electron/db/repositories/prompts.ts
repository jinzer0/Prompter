import { and, desc, eq, isNull, type SQL } from "drizzle-orm"

import type {
  CreatePromptAssetInput,
  DeleteResult,
  PromptAsset,
  PromptAssetFilter,
  UpdatePromptAssetInput,
} from "../../ipc-types.js"
import * as schema from "../schema.js"
import { type AppDatabase, createId, createTimestamp, optionalText, requireRow } from "./common.js"
import { createPromptVersionRepository, type PromptVersionRepository } from "./prompt-versions.js"

export type PromptRepository = PromptVersionRepository & {
  readonly createPromptAsset: (input: CreatePromptAssetInput) => PromptAsset
  readonly listPromptAssets: (filter?: PromptAssetFilter) => readonly PromptAsset[]
  readonly getPromptAsset: (id: string) => PromptAsset | null
  readonly updatePromptAsset: (id: string, input: UpdatePromptAssetInput) => PromptAsset
  readonly deletePromptAsset: (id: string) => DeleteResult
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

export function createPromptRepository(db: AppDatabase): PromptRepository {
  const promptVersions = createPromptVersionRepository(db)

  return {
    ...promptVersions,
    createPromptAsset(input) {
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
            createdAt: now,
            updatedAt: now,
          })
          .returning()
          .get(),
        "prompt asset",
        input.title,
      )
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
        parentPromptId?: string | null
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
      if (input.parentPromptId !== undefined) {
        values.parentPromptId = optionalText(input.parentPromptId)
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
  }
}
