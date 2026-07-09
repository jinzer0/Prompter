import { and, count, desc, eq } from "drizzle-orm"

import type {
  CreateTagInput,
  DeleteResult,
  Tag,
  TagCount,
  TagLink,
  UpdateTagInput,
} from "../../ipc-types.js"
import * as schema from "../schema.js"
import { type AppDatabase, createId, createTimestamp, requireRow } from "./common.js"

export type TagRepository = {
  readonly createTag: (input: CreateTagInput) => Tag
  readonly listTags: () => readonly Tag[]
  readonly updateTag: (id: string, input: UpdateTagInput) => Tag
  readonly deleteTag: (id: string) => DeleteResult
  readonly attachTagToPrompt: (promptAssetId: string, tagId: string) => TagLink
  readonly detachTagFromPrompt: (promptAssetId: string, tagId: string) => TagLink
  readonly listTagsForPrompt: (promptAssetId: string) => readonly Tag[]
  readonly listTagsWithCounts: () => readonly TagCount[]
  readonly createAndAttachTagToPrompt: (
    promptAssetId: string,
    input: CreateTagInput,
  ) => TagLink
}

function findTagByName(db: AppDatabase, name: string): Tag | undefined {
  return db.select().from(schema.tags).where(eq(schema.tags.name, name)).get()
}

export function createTagRepository(db: AppDatabase): TagRepository {
  return {
    createTag(input) {
      return requireRow(
        db
          .insert(schema.tags)
          .values({ id: createId(), name: input.name, createdAt: createTimestamp() })
          .returning()
          .get(),
        "tag",
        input.name,
      )
    },
    listTags() {
      return db.select().from(schema.tags).orderBy(desc(schema.tags.createdAt)).all()
    },
    updateTag(id, input) {
      return requireRow(
        db
          .update(schema.tags)
          .set({ name: input.name })
          .where(eq(schema.tags.id, id))
          .returning()
          .get(),
        "tag",
        id,
      )
    },
    deleteTag(id) {
      db.delete(schema.tags).where(eq(schema.tags.id, id)).run()
      return { id }
    },
    attachTagToPrompt(promptAssetId, tagId) {
      const link = { promptAssetId, tagId }
      db.insert(schema.promptTags).values(link).onConflictDoNothing().run()
      return link
    },
    detachTagFromPrompt(promptAssetId, tagId) {
      const link = { promptAssetId, tagId }
      db.delete(schema.promptTags)
        .where(
          and(
            eq(schema.promptTags.promptAssetId, promptAssetId),
            eq(schema.promptTags.tagId, tagId),
          ),
        )
        .run()
      return link
    },
    listTagsForPrompt(promptAssetId) {
      return db
        .select({ id: schema.tags.id, name: schema.tags.name, createdAt: schema.tags.createdAt })
        .from(schema.tags)
        .innerJoin(schema.promptTags, eq(schema.promptTags.tagId, schema.tags.id))
        .where(eq(schema.promptTags.promptAssetId, promptAssetId))
        .orderBy(desc(schema.tags.createdAt))
        .all()
    },
    listTagsWithCounts() {
      return db
        .select({
          id: schema.tags.id,
          name: schema.tags.name,
          createdAt: schema.tags.createdAt,
          promptCount: count(schema.promptTags.promptAssetId),
        })
        .from(schema.tags)
        .leftJoin(schema.promptTags, eq(schema.promptTags.tagId, schema.tags.id))
        .groupBy(schema.tags.id, schema.tags.name, schema.tags.createdAt)
        .orderBy(desc(schema.tags.createdAt))
        .all()
    },
    createAndAttachTagToPrompt(promptAssetId, input) {
      const existing = findTagByName(db, input.name)
      const tag =
        existing ??
        requireRow(
          db
            .insert(schema.tags)
            .values({ id: createId(), name: input.name, createdAt: createTimestamp() })
            .returning()
            .get(),
          "tag",
          input.name,
        )
      const link = { promptAssetId, tagId: tag.id }

      db.insert(schema.promptTags).values(link).onConflictDoNothing().run()
      return link
    },
  }
}
