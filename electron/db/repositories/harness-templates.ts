import { and, asc, desc, eq, inArray, like, type SQL } from "drizzle-orm"

import type {
  CreateHarnessTemplateInput,
  DeleteResult,
  HarnessTemplate,
  ListHarnessTemplatesInput,
  UpdateHarnessTemplateInput,
} from "../../ipc-types.js"
import {
  DEFAULT_HARNESS_TEMPLATES,
  type DefaultHarnessTemplate,
} from "../default-harness-templates.js"
import * as schema from "../schema.js"
import { type AppDatabase, createId, createTimestamp, optionalText, requireRow } from "./common.js"

type HarnessTemplateCreateInput = Omit<
  CreateHarnessTemplateInput,
  "requiredFields" | "clarificationPolicy"
> & {
  readonly requiredFields?: string | null
  readonly clarificationPolicy?: string | null
}

export type HarnessTemplateRepository = {
  readonly createHarnessTemplate: (input: HarnessTemplateCreateInput) => HarnessTemplate
  readonly listHarnessTemplates: (filter?: ListHarnessTemplatesInput) => readonly HarnessTemplate[]
  readonly getHarnessTemplate: (id: string) => HarnessTemplate | null
  readonly updateHarnessTemplate: (id: string, input: UpdateHarnessTemplateInput) => HarnessTemplate
  readonly deleteHarnessTemplate: (id: string) => DeleteResult
  readonly duplicateHarnessTemplate: (id: string) => HarnessTemplate
  readonly seedDefaultHarnessTemplates: () => readonly HarnessTemplate[]
}

export function createHarnessTemplateRepository(db: AppDatabase): HarnessTemplateRepository {
  function insertHarnessTemplate(input: HarnessTemplateCreateInput, id: string): HarnessTemplate {
    const now = createTimestamp()

    return requireRow(
      db
        .insert(schema.harnessTemplates)
        .values({
          id,
          name: input.name,
          scenario: input.scenario,
          targetAgent: input.targetAgent,
          templateBody: input.templateBody,
          requiredFields: optionalText(input.requiredFields),
          clarificationPolicy: optionalText(input.clarificationPolicy),
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get(),
      "harness template",
      input.name,
    )
  }

  function insertDefaultHarnessTemplate(input: DefaultHarnessTemplate): HarnessTemplate {
    return insertHarnessTemplate(input, input.id)
  }

  function listFilters(filter?: ListHarnessTemplatesInput): readonly SQL[] {
    const filters: SQL[] = []

    if (filter?.scenario !== undefined) {
      filters.push(eq(schema.harnessTemplates.scenario, filter.scenario))
    }
    if (filter?.targetAgent !== undefined) {
      filters.push(eq(schema.harnessTemplates.targetAgent, filter.targetAgent))
    }
    if (filter?.query !== undefined && filter.query.length > 0) {
      filters.push(like(schema.harnessTemplates.name, `%${filter.query}%`))
    }

    return filters
  }

  return {
    createHarnessTemplate(input) {
      return insertHarnessTemplate(input, createId())
    },
    listHarnessTemplates(filter) {
      const filters = listFilters(filter)
      const query = db
        .select()
        .from(schema.harnessTemplates)
        .orderBy(
          desc(schema.harnessTemplates.updatedAt),
          desc(schema.harnessTemplates.createdAt),
          asc(schema.harnessTemplates.name),
        )

      if (filters.length === 0) {
        return query.all()
      }

      return query.where(and(...filters)).all()
    },
    getHarnessTemplate(id) {
      return (
        db.select().from(schema.harnessTemplates).where(eq(schema.harnessTemplates.id, id)).get() ??
        null
      )
    },
    updateHarnessTemplate(id, input) {
      const values: {
        name?: string
        scenario?: HarnessTemplate["scenario"]
        targetAgent?: HarnessTemplate["targetAgent"]
        templateBody?: string
        requiredFields?: string | null
        clarificationPolicy?: string | null
        updatedAt: number
      } = { updatedAt: createTimestamp() }

      if (input.name !== undefined) {
        values.name = input.name
      }
      if (input.scenario !== undefined) {
        values.scenario = input.scenario
      }
      if (input.targetAgent !== undefined) {
        values.targetAgent = input.targetAgent
      }
      if (input.templateBody !== undefined) {
        values.templateBody = input.templateBody
      }
      if (input.requiredFields !== undefined) {
        values.requiredFields = optionalText(input.requiredFields)
      }
      if (input.clarificationPolicy !== undefined) {
        values.clarificationPolicy = optionalText(input.clarificationPolicy)
      }

      return requireRow(
        db
          .update(schema.harnessTemplates)
          .set(values)
          .where(eq(schema.harnessTemplates.id, id))
          .returning()
          .get(),
        "harness template",
        id,
      )
    },
    deleteHarnessTemplate(id) {
      db.delete(schema.harnessTemplates).where(eq(schema.harnessTemplates.id, id)).run()
      return { id }
    },
    duplicateHarnessTemplate(id) {
      const source = requireRow(
        db.select().from(schema.harnessTemplates).where(eq(schema.harnessTemplates.id, id)).get(),
        "harness template",
        id,
      )

      return insertHarnessTemplate(
        {
          name: `${source.name} Copy`,
          scenario: source.scenario,
          targetAgent: source.targetAgent,
          templateBody: source.templateBody,
          requiredFields: source.requiredFields,
          clarificationPolicy: source.clarificationPolicy,
        },
        createId(),
      )
    },
    seedDefaultHarnessTemplates() {
      for (const template of DEFAULT_HARNESS_TEMPLATES) {
        const existing = db
          .select({ id: schema.harnessTemplates.id })
          .from(schema.harnessTemplates)
          .where(eq(schema.harnessTemplates.id, template.id))
          .get()

        if (existing === undefined) {
          insertDefaultHarnessTemplate(template)
        }
      }

      return db
        .select()
        .from(schema.harnessTemplates)
        .where(
          inArray(
            schema.harnessTemplates.id,
            DEFAULT_HARNESS_TEMPLATES.map((template) => template.id),
          ),
        )
        .all()
    },
  }
}
