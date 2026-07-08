import { and, desc, eq } from "drizzle-orm"

import type { CreateTagInput, DeleteResult, Tag, TagLink, UpdateTagInput } from "../../ipc-types.js"
import * as schema from "../schema.js"
import { type AppDatabase, createId, createTimestamp, requireRow } from "./common.js"

export type TagRepository = {
  readonly createTag: (input: CreateTagInput) => Tag
  readonly listTags: () => readonly Tag[]
  readonly updateTag: (id: string, input: UpdateTagInput) => Tag
  readonly deleteTag: (id: string) => DeleteResult
  readonly attachTagToPrompt: (promptAssetId: string, tagId: string) => TagLink
  readonly detachTagFromPrompt: (promptAssetId: string, tagId: string) => TagLink
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
  }
}
