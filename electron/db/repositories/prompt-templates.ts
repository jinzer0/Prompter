import { and, asc, count, desc, eq, like, or, type SQL } from "drizzle-orm"

import type {
  CreatePromptTemplateInput,
  DeletePromptTemplateResult,
  ListPromptTemplatesInput,
  PromptTemplate,
  PromptTemplateListResult,
  UpdatePromptTemplateInput,
} from "../../ipc-types.js"
import { PromptVersionOwnershipError } from "../errors.js"
import * as schema from "../schema.js"
import { type AppDatabase, createId, createTimestamp, optionalText, requireRow } from "./common.js"

type CreatePromptTemplateFromVersionPersistenceInput = {
  readonly sourcePromptAssetId: string
  readonly sourcePromptVersionId: string
  readonly name: string
  readonly description?: string | null | undefined
  readonly templateBody: string
}

export type PromptTemplateRepository = {
  readonly createPromptTemplate: (input: CreatePromptTemplateInput) => PromptTemplate
  readonly listPromptTemplates: (filter?: ListPromptTemplatesInput) => PromptTemplateListResult
  readonly getPromptTemplate: (id: string) => PromptTemplate
  readonly updatePromptTemplate: (id: string, input: UpdatePromptTemplateInput) => PromptTemplate
  readonly duplicatePromptTemplate: (id: string) => PromptTemplate
  readonly deletePromptTemplate: (id: string) => DeletePromptTemplateResult
  readonly createPromptTemplateFromVersion: (
    input: CreatePromptTemplateFromVersionPersistenceInput,
  ) => PromptTemplate
}

function templateFilters(filter?: ListPromptTemplatesInput): readonly SQL[] {
  const filters: SQL[] = []

  if (filter?.scenario !== undefined) {
    filters.push(eq(schema.promptTemplates.scenario, filter.scenario))
  }
  if (filter?.targetAgent !== undefined) {
    filters.push(eq(schema.promptTemplates.targetAgent, filter.targetAgent))
  }
  if (filter?.query !== undefined && filter.query.length > 0) {
    const pattern = `%${filter.query}%`
    const queryFilter = or(
      like(schema.promptTemplates.name, pattern),
      like(schema.promptTemplates.description, pattern),
      like(schema.promptTemplates.templateBody, pattern),
    )

    if (queryFilter !== undefined) {
      filters.push(queryFilter)
    }
  }

  return filters
}

export function createPromptTemplateRepository(db: AppDatabase): PromptTemplateRepository {
  function insertTemplate(input: {
    readonly name: string
    readonly description?: string | null | undefined
    readonly sourcePromptAssetId?: string | null | undefined
    readonly sourcePromptVersionId?: string | null | undefined
    readonly scenario: PromptTemplate["scenario"]
    readonly targetAgent: PromptTemplate["targetAgent"]
    readonly templateBody: string
  }): PromptTemplate {
    const now = createTimestamp()

    return requireRow(
      db
        .insert(schema.promptTemplates)
        .values({
          id: createId(),
          name: input.name,
          description: optionalText(input.description),
          sourcePromptAssetId: optionalText(input.sourcePromptAssetId),
          sourcePromptVersionId: optionalText(input.sourcePromptVersionId),
          scenario: input.scenario,
          targetAgent: input.targetAgent,
          templateBody: input.templateBody,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get(),
      "prompt template",
      input.name,
    )
  }

  return {
    createPromptTemplate(input) {
      return insertTemplate(input)
    },
    listPromptTemplates(filter) {
      const filters = templateFilters(filter)
      const limit = filter?.limit ?? 100

      if (filters.length === 0) {
        return {
          templates: db
            .select()
            .from(schema.promptTemplates)
            .orderBy(desc(schema.promptTemplates.updatedAt), asc(schema.promptTemplates.name))
            .limit(limit)
            .all(),
          total: db.select({ total: count() }).from(schema.promptTemplates).get()?.total ?? 0,
        }
      }

      const where = and(...filters)
      return {
        templates: db
          .select()
          .from(schema.promptTemplates)
          .where(where)
          .orderBy(desc(schema.promptTemplates.updatedAt), asc(schema.promptTemplates.name))
          .limit(limit)
          .all(),
        total:
          db.select({ total: count() }).from(schema.promptTemplates).where(where).get()?.total ?? 0,
      }
    },
    getPromptTemplate(id) {
      return requireRow(
        db.select().from(schema.promptTemplates).where(eq(schema.promptTemplates.id, id)).get(),
        "prompt template",
        id,
      )
    },
    updatePromptTemplate(id, input) {
      const values: {
        name?: string
        description?: string | null
        scenario?: PromptTemplate["scenario"]
        targetAgent?: PromptTemplate["targetAgent"]
        templateBody?: string
        updatedAt: number
      } = { updatedAt: createTimestamp() }

      if (input.name !== undefined) values.name = input.name
      if (input.description !== undefined) values.description = optionalText(input.description)
      if (input.scenario !== undefined) values.scenario = input.scenario
      if (input.targetAgent !== undefined) values.targetAgent = input.targetAgent
      if (input.templateBody !== undefined) values.templateBody = input.templateBody

      return requireRow(
        db
          .update(schema.promptTemplates)
          .set(values)
          .where(eq(schema.promptTemplates.id, id))
          .returning()
          .get(),
        "prompt template",
        id,
      )
    },
    duplicatePromptTemplate(id) {
      const source = this.getPromptTemplate(id)
      return insertTemplate({
        name: `Copy of ${source.name}`,
        description: source.description,
        sourcePromptAssetId: source.sourcePromptAssetId,
        sourcePromptVersionId: source.sourcePromptVersionId,
        scenario: source.scenario,
        targetAgent: source.targetAgent,
        templateBody: source.templateBody,
      })
    },
    deletePromptTemplate(id) {
      db.delete(schema.promptTemplates).where(eq(schema.promptTemplates.id, id)).run()
      return { id, deleted: true }
    },
    createPromptTemplateFromVersion(input) {
      const source = requireRow(
        db
          .select()
          .from(schema.promptAssets)
          .where(eq(schema.promptAssets.id, input.sourcePromptAssetId))
          .get(),
        "prompt asset",
        input.sourcePromptAssetId,
      )
      const version = requireRow(
        db
          .select()
          .from(schema.promptVersions)
          .where(eq(schema.promptVersions.id, input.sourcePromptVersionId))
          .get(),
        "prompt version",
        input.sourcePromptVersionId,
      )

      if (version.promptAssetId !== source.id) {
        throw new PromptVersionOwnershipError(source.id, version.id)
      }

      return insertTemplate({
        ...input,
        scenario: source.scenario,
        targetAgent: source.targetAgent,
      })
    },
  }
}
