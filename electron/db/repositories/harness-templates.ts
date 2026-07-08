import { desc, eq } from "drizzle-orm"

import type {
  CreateHarnessTemplateInput,
  DeleteResult,
  HarnessTemplate,
  UpdateHarnessTemplateInput,
} from "../../ipc-types.js"
import * as schema from "../schema.js"
import { type AppDatabase, createId, createTimestamp, optionalText, requireRow } from "./common.js"

export type HarnessTemplateRepository = {
  readonly createHarnessTemplate: (input: CreateHarnessTemplateInput) => HarnessTemplate
  readonly listHarnessTemplates: () => readonly HarnessTemplate[]
  readonly getHarnessTemplate: (id: string) => HarnessTemplate | null
  readonly updateHarnessTemplate: (id: string, input: UpdateHarnessTemplateInput) => HarnessTemplate
  readonly deleteHarnessTemplate: (id: string) => DeleteResult
}

export function createHarnessTemplateRepository(db: AppDatabase): HarnessTemplateRepository {
  return {
    createHarnessTemplate(input) {
      const now = createTimestamp()

      return requireRow(
        db
          .insert(schema.harnessTemplates)
          .values({
            id: createId(),
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
    },
    listHarnessTemplates() {
      return db
        .select()
        .from(schema.harnessTemplates)
        .orderBy(desc(schema.harnessTemplates.createdAt))
        .all()
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
  }
}
