import { and, desc, eq } from "drizzle-orm"

import type {
  ComparePromptVersionsResult,
  CreateNextPromptVersionInput,
  CreateNextPromptVersionResult,
  CreatePromptVersionInput,
  PromptAsset,
  PromptVersion,
} from "../../ipc-types.js"
import { PromptInitialVersionError } from "../errors.js"
import * as schema from "../schema.js"
import { type AppDatabase, createId, createTimestamp, optionalText, requireRow } from "./common.js"

export type PromptVersionRepository = {
  readonly createPromptVersion: (input: CreatePromptVersionInput) => PromptVersion
  readonly createInitialPromptVersion: (input: CreatePromptVersionInput) => PromptVersion
  readonly createNextPromptVersion: (
    input: CreateNextPromptVersionInput,
  ) => CreateNextPromptVersionResult
  readonly listPromptVersions: (promptAssetId: string) => readonly PromptVersion[]
  readonly getPromptVersion: (id: string) => PromptVersion | null
  readonly getCurrentPromptVersion: (promptAssetId: string) => PromptVersion | null
  readonly setCurrentPromptVersion: (promptAssetId: string, versionId: string) => PromptAsset
  readonly comparePromptVersions: (
    baseVersionId: string,
    compareVersionId: string,
  ) => ComparePromptVersionsResult
}

function promptVersionValues(input: CreatePromptVersionInput, versionNumber: number) {
  return {
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
  }
}

function nextVersionNumber(db: AppDatabase, promptAssetId: string): number {
  const latest = db
    .select({ versionNumber: schema.promptVersions.versionNumber })
    .from(schema.promptVersions)
    .where(eq(schema.promptVersions.promptAssetId, promptAssetId))
    .orderBy(desc(schema.promptVersions.versionNumber))
    .limit(1)
    .get()

  return (latest?.versionNumber ?? 0) + 1
}

function requirePromptAsset(db: AppDatabase, promptAssetId: string): PromptAsset {
  return requireRow(
    db.select().from(schema.promptAssets).where(eq(schema.promptAssets.id, promptAssetId)).get(),
    "prompt asset",
    promptAssetId,
  )
}

export function createPromptVersionRepository(db: AppDatabase): PromptVersionRepository {
  return {
    createPromptVersion(input) {
      return requireRow(
        db
          .insert(schema.promptVersions)
          .values(promptVersionValues(input, nextVersionNumber(db, input.promptAssetId)))
          .returning()
          .get(),
        "prompt version",
        input.promptAssetId,
      )
    },
    createInitialPromptVersion(input) {
      const existing = db
        .select({ id: schema.promptVersions.id })
        .from(schema.promptVersions)
        .where(eq(schema.promptVersions.promptAssetId, input.promptAssetId))
        .limit(1)
        .get()

      if (existing !== undefined) {
        throw new PromptInitialVersionError(input.promptAssetId)
      }

      return requireRow(
        db.insert(schema.promptVersions).values(promptVersionValues(input, 1)).returning().get(),
        "prompt version",
        input.promptAssetId,
      )
    },
    createNextPromptVersion(input) {
      return db.transaction((tx) => {
        requirePromptAsset(tx, input.promptAssetId)
        const version = requireRow(
          tx
            .insert(schema.promptVersions)
            .values(promptVersionValues(input, nextVersionNumber(tx, input.promptAssetId)))
            .returning()
            .get(),
          "prompt version",
          input.promptAssetId,
        )
        const asset =
          (input.makeCurrent ?? true)
            ? requireRow(
                tx
                  .update(schema.promptAssets)
                  .set({ currentVersionId: version.id, updatedAt: createTimestamp() })
                  .where(eq(schema.promptAssets.id, input.promptAssetId))
                  .returning()
                  .get(),
                "prompt asset",
                input.promptAssetId,
              )
            : requirePromptAsset(tx, input.promptAssetId)

        return { asset, version }
      })
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
    getCurrentPromptVersion(promptAssetId) {
      const asset = requirePromptAsset(db, promptAssetId)

      if (asset.currentVersionId !== null) {
        const current = db
          .select()
          .from(schema.promptVersions)
          .where(
            and(
              eq(schema.promptVersions.id, asset.currentVersionId),
              eq(schema.promptVersions.promptAssetId, promptAssetId),
            ),
          )
          .get()

        if (current !== undefined) {
          return current
        }
      }

      return (
        db
          .select()
          .from(schema.promptVersions)
          .where(eq(schema.promptVersions.promptAssetId, promptAssetId))
          .orderBy(desc(schema.promptVersions.versionNumber))
          .limit(1)
          .get() ?? null
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
    comparePromptVersions(baseVersionId, compareVersionId) {
      return {
        baseVersion: requireRow(
          db
            .select()
            .from(schema.promptVersions)
            .where(eq(schema.promptVersions.id, baseVersionId))
            .get(),
          "prompt version",
          baseVersionId,
        ),
        compareVersion: requireRow(
          db
            .select()
            .from(schema.promptVersions)
            .where(eq(schema.promptVersions.id, compareVersionId))
            .get(),
          "prompt version",
          compareVersionId,
        ),
      }
    },
  }
}
