import { and, asc, desc, eq } from "drizzle-orm"

import type {
  BuildProjectContextForCompilerInput,
  DeleteProjectContextProfileInput,
  DeleteResult,
  DuplicateProjectContextProfileInput,
  GetProjectContextProfileInput,
  ListProjectContextProfilesInput,
  ProjectContextCompilerBuildResult,
  ProjectContextProfile,
  SetDefaultProjectContextProfileInput,
  UpdateProjectContextProfileInput,
} from "../../ipc-contract.js"
import { buildProjectContextForCompiler } from "../../prompt-compiler/project-context-builder.js"
import * as schema from "../schema.js"
import { type AppDatabase, createId, createTimestamp, requireRow } from "./common.js"
import {
  buildDuplicateInput,
  buildInsertValues,
  buildUpdateValues,
  type ProjectContextProfileCreateInput,
} from "./project-context-profile-values.js"

const missingProfileWarning =
  "Selected project context profile is unavailable; profile context was excluded."

export type ProjectContextProfileRepository = {
  readonly createProjectContextProfile: (
    input: ProjectContextProfileCreateInput,
  ) => ProjectContextProfile
  readonly listProjectContextProfiles: (
    input: ListProjectContextProfilesInput,
  ) => readonly ProjectContextProfile[]
  readonly getProjectContextProfile: (
    input: GetProjectContextProfileInput,
  ) => ProjectContextProfile | null
  readonly getDefaultProjectContextProfile: (projectId: string) => ProjectContextProfile | null
  readonly updateProjectContextProfile: (
    identity: GetProjectContextProfileInput,
    input: UpdateProjectContextProfileInput,
  ) => ProjectContextProfile
  readonly deleteProjectContextProfile: (input: DeleteProjectContextProfileInput) => DeleteResult
  readonly duplicateProjectContextProfile: (
    input: DuplicateProjectContextProfileInput,
  ) => ProjectContextProfile
  readonly setDefaultProjectContextProfile: (
    input: SetDefaultProjectContextProfileInput,
  ) => ProjectContextProfile
  readonly buildCompilerContext: (
    input: BuildProjectContextForCompilerInput,
  ) => ProjectContextCompilerBuildResult
}

function profileOwnershipFilter(input: GetProjectContextProfileInput) {
  return and(
    eq(schema.projectContextProfiles.id, input.profileId),
    eq(schema.projectContextProfiles.projectId, input.projectId),
  )
}

function unavailableCompilerContext(): ProjectContextCompilerBuildResult {
  return {
    profileId: null,
    profileName: null,
    context: null,
    sectionNames: [],
    warnings: [missingProfileWarning],
  }
}

export function createProjectContextProfileRepository(
  db: AppDatabase,
): ProjectContextProfileRepository {
  function insertProjectContextProfile(
    input: ProjectContextProfileCreateInput,
  ): ProjectContextProfile {
    const now = createTimestamp()

    return requireRow(
      db
        .insert(schema.projectContextProfiles)
        .values(buildInsertValues(input, createId(), now))
        .returning()
        .get(),
      "project context profile",
      input.name,
    )
  }

  function getOwnedProjectContextProfile(
    input: GetProjectContextProfileInput,
  ): ProjectContextProfile | null {
    return (
      db.select().from(schema.projectContextProfiles).where(profileOwnershipFilter(input)).get() ??
      null
    )
  }

  return {
    createProjectContextProfile(input) {
      if (input.isDefault !== true) {
        return insertProjectContextProfile(input)
      }

      return db.transaction(() => {
        db.update(schema.projectContextProfiles)
          .set({ isDefault: false, updatedAt: createTimestamp() })
          .where(eq(schema.projectContextProfiles.projectId, input.projectId))
          .run()

        return insertProjectContextProfile(input)
      })
    },
    listProjectContextProfiles(input) {
      return db
        .select()
        .from(schema.projectContextProfiles)
        .where(eq(schema.projectContextProfiles.projectId, input.projectId))
        .orderBy(
          desc(schema.projectContextProfiles.isDefault),
          desc(schema.projectContextProfiles.updatedAt),
          desc(schema.projectContextProfiles.createdAt),
          asc(schema.projectContextProfiles.name),
        )
        .all()
    },
    getProjectContextProfile(input) {
      return getOwnedProjectContextProfile(input)
    },
    getDefaultProjectContextProfile(projectId) {
      return (
        db
          .select()
          .from(schema.projectContextProfiles)
          .where(
            and(
              eq(schema.projectContextProfiles.projectId, projectId),
              eq(schema.projectContextProfiles.isDefault, true),
            ),
          )
          .get() ?? null
      )
    },
    updateProjectContextProfile(identity, input) {
      const existing = requireRow(
        getOwnedProjectContextProfile(identity) ?? undefined,
        "project context profile",
        identity.profileId,
      )

      if (input.isDefault === true) {
        return db.transaction(() => {
          db.update(schema.projectContextProfiles)
            .set({ isDefault: false, updatedAt: createTimestamp() })
            .where(eq(schema.projectContextProfiles.projectId, identity.projectId))
            .run()

          const values = buildUpdateValues(input, createTimestamp())
          return requireRow(
            db
              .update(schema.projectContextProfiles)
              .set(values)
              .where(profileOwnershipFilter(identity))
              .returning()
              .get(),
            "project context profile",
            existing.id,
          )
        })
      }

      return requireRow(
        db
          .update(schema.projectContextProfiles)
          .set(buildUpdateValues(input, createTimestamp()))
          .where(profileOwnershipFilter(identity))
          .returning()
          .get(),
        "project context profile",
        existing.id,
      )
    },
    deleteProjectContextProfile(input) {
      const existing = requireRow(
        getOwnedProjectContextProfile(input) ?? undefined,
        "project context profile",
        input.profileId,
      )

      db.delete(schema.projectContextProfiles).where(profileOwnershipFilter(input)).run()
      return { id: existing.id }
    },
    duplicateProjectContextProfile(input) {
      const source = requireRow(
        getOwnedProjectContextProfile(input) ?? undefined,
        "project context profile",
        input.profileId,
      )

      return insertProjectContextProfile(buildDuplicateInput(source))
    },
    setDefaultProjectContextProfile(input) {
      const existing = requireRow(
        getOwnedProjectContextProfile(input) ?? undefined,
        "project context profile",
        input.profileId,
      )

      return db.transaction(() => {
        db.update(schema.projectContextProfiles)
          .set({ isDefault: false, updatedAt: createTimestamp() })
          .where(eq(schema.projectContextProfiles.projectId, input.projectId))
          .run()

        return requireRow(
          db
            .update(schema.projectContextProfiles)
            .set({ isDefault: true, updatedAt: createTimestamp() })
            .where(profileOwnershipFilter(input))
            .returning()
            .get(),
          "project context profile",
          existing.id,
        )
      })
    },
    buildCompilerContext(input) {
      const profile = getOwnedProjectContextProfile(input)

      return profile === null
        ? unavailableCompilerContext()
        : buildProjectContextForCompiler(profile)
    },
  }
}
