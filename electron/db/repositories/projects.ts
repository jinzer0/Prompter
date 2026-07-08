import { desc, eq } from "drizzle-orm"

import type {
  CreateProjectInput,
  DeleteResult,
  Project,
  UpdateProjectInput,
} from "../../ipc-types.js"
import * as schema from "../schema.js"
import { type AppDatabase, createId, createTimestamp, optionalText, requireRow } from "./common.js"

export type ProjectRepository = {
  readonly createProject: (input: CreateProjectInput) => Project
  readonly listProjects: () => readonly Project[]
  readonly getProject: (id: string) => Project | null
  readonly updateProject: (id: string, input: UpdateProjectInput) => Project
  readonly deleteProject: (id: string) => DeleteResult
}

export function createProjectRepository(db: AppDatabase): ProjectRepository {
  return {
    createProject(input) {
      const now = createTimestamp()

      return requireRow(
        db
          .insert(schema.projects)
          .values({
            id: createId(),
            name: input.name,
            description: optionalText(input.description),
            techStack: optionalText(input.techStack),
            defaultAgent: input.defaultAgent ?? null,
            createdAt: now,
            updatedAt: now,
          })
          .returning()
          .get(),
        "project",
        input.name,
      )
    },
    listProjects() {
      return db.select().from(schema.projects).orderBy(desc(schema.projects.createdAt)).all()
    },
    getProject(id) {
      return db.select().from(schema.projects).where(eq(schema.projects.id, id)).get() ?? null
    },
    updateProject(id, input) {
      const values: {
        name?: string
        description?: string | null
        techStack?: string | null
        defaultAgent?: Project["defaultAgent"]
        updatedAt: number
      } = { updatedAt: createTimestamp() }

      if (input.name !== undefined) {
        values.name = input.name
      }
      if (input.description !== undefined) {
        values.description = optionalText(input.description)
      }
      if (input.techStack !== undefined) {
        values.techStack = optionalText(input.techStack)
      }
      if (input.defaultAgent !== undefined) {
        values.defaultAgent = input.defaultAgent ?? null
      }

      return requireRow(
        db.update(schema.projects).set(values).where(eq(schema.projects.id, id)).returning().get(),
        "project",
        id,
      )
    },
    deleteProject(id) {
      db.delete(schema.projects).where(eq(schema.projects.id, id)).run()
      return { id }
    },
  }
}
