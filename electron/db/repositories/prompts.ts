import { and, desc, eq, isNull, type SQL } from "drizzle-orm"

import type {
  CreatePromptAssetInput,
  CreatePromptVersionInput,
  DeleteResult,
  PromptAsset,
  PromptAssetFilter,
  PromptVersion,
  UpdatePromptAssetInput,
} from "../../ipc-types.js"
import * as schema from "../schema.js"
import { type AppDatabase, createId, createTimestamp, optionalText, requireRow } from "./common.js"

export type PromptRepository = {
  readonly createPromptAsset: (input: CreatePromptAssetInput) => PromptAsset
  readonly listPromptAssets: (filter?: PromptAssetFilter) => readonly PromptAsset[]
  readonly getPromptAsset: (id: string) => PromptAsset | null
  readonly updatePromptAsset: (id: string, input: UpdatePromptAssetInput) => PromptAsset
  readonly deletePromptAsset: (id: string) => DeleteResult
  readonly createPromptVersion: (input: CreatePromptVersionInput) => PromptVersion
  readonly listPromptVersions: (promptAssetId: string) => readonly PromptVersion[]
  readonly getPromptVersion: (id: string) => PromptVersion | null
  readonly setCurrentPromptVersion: (promptAssetId: string, versionId: string) => PromptAsset
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
  return {
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
    createPromptVersion(input) {
      const latest = db
        .select({ versionNumber: schema.promptVersions.versionNumber })
        .from(schema.promptVersions)
        .where(eq(schema.promptVersions.promptAssetId, input.promptAssetId))
        .orderBy(desc(schema.promptVersions.versionNumber))
        .limit(1)
        .get()
      const versionNumber = (latest?.versionNumber ?? 0) + 1

      return requireRow(
        db
          .insert(schema.promptVersions)
          .values({
            id: createId(),
            promptAssetId: input.promptAssetId,
            versionNumber,
            originalInput: input.originalInput,
            compiledPrompt: input.compiledPrompt,
            assumptions: optionalText(input.assumptions),
            questions: optionalText(input.questions),
            answers: optionalText(input.answers),
            acceptanceCriteria: optionalText(input.acceptanceCriteria),
            validationCommands: optionalText(input.validationCommands),
            qualityScore: input.qualityScore ?? null,
            createdAt: createTimestamp(),
          })
          .returning()
          .get(),
        "prompt version",
        input.promptAssetId,
      )
    },
    listPromptVersions(promptAssetId) {
      return db
        .select()
        .from(schema.promptVersions)
        .where(eq(schema.promptVersions.promptAssetId, promptAssetId))
        .orderBy(desc(schema.promptVersions.versionNumber))
        .all()
    },
    getPromptVersion(id) {
      return (
        db.select().from(schema.promptVersions).where(eq(schema.promptVersions.id, id)).get() ??
        null
      )
    },
    setCurrentPromptVersion(promptAssetId, versionId) {
      requireRow(
        db
          .select()
          .from(schema.promptVersions)
          .where(
            and(
              eq(schema.promptVersions.id, versionId),
              eq(schema.promptVersions.promptAssetId, promptAssetId),
            ),
          )
          .get(),
        "prompt version",
        versionId,
      )

      return requireRow(
        db
          .update(schema.promptAssets)
          .set({ currentVersionId: versionId, updatedAt: createTimestamp() })
          .where(eq(schema.promptAssets.id, promptAssetId))
          .returning()
          .get(),
        "prompt asset",
        promptAssetId,
      )
    },
  }
}
