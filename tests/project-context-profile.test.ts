import { describe, expect, it } from "vitest"

import {
  buildProjectContextForCompilerInputSchema,
  createProjectContextProfileInputSchema,
  deleteProjectContextProfileInputSchema,
  duplicateProjectContextProfileInputSchema,
  getProjectContextProfileInputSchema,
  listProjectContextProfilesInputSchema,
  PROJECT_CONTEXT_PROFILE_DB_FIELD_NAMES,
  PROJECT_CONTEXT_PROFILE_IPC_FIELD_NAMES,
  projectContextCompilerBuildResultSchema,
  projectContextProfileSchema,
  setDefaultProjectContextProfileInputSchema,
  updateProjectContextProfilePayloadSchema,
} from "../electron/ipc-contract"
import { buildProjectContextForCompiler } from "../electron/prompt-compiler/project-context-builder"

const projectId = "11111111-1111-4111-8111-111111111111"
const profileId = "22222222-2222-4222-8222-222222222222"

const fullProfile = {
  id: profileId,
  projectId,
  name: "Default Context",
  summary: "  Summary keeps leading spaces.  ",
  techStack: "TypeScript\nElectron\nSQLite",
  architectureNotes: "Main process owns persistence.\nRenderer uses preload bridge.",
  codingConventions: "Use Zod at IPC boundaries.",
  constraints: "Do not add prompt execution storage.",
  forbiddenActions: "Do not run repo_path.\nDo not scan the repository path.",
  acceptanceDefaults: "Evidence file includes exact command output.",
  validationCommands: "npm run typecheck\nnpx vitest run tests/project-context-profile.test.ts",
  securityNotes: "Treat profile text as untrusted user context only.",
  additionalContext: 'Keep code fences intact:\n\n```ts\nconst value = "{{not a template}}"\n```',
  testingNotes: "Given / When / Then tests are preferred.",
  packageManager: "npm",
  defaultBranch: "main",
  repoPath: "~/work/prompter",
  isDefault: true,
  createdAt: 1,
  updatedAt: 2,
} as const

describe("project context profile IPC schemas", () => {
  it("parses a valid profile while preserving nullable plain-text fields", () => {
    // Given
    const input = {
      projectId,
      name: "  Default Context  ",
      summary: "  keep summary whitespace  ",
      techStack: null,
      repoPath: "  ~/work/prompter  ",
    }

    // When
    const parsed = createProjectContextProfileInputSchema.parse(input)

    // Then
    expect(parsed).toMatchObject({
      projectId,
      name: "Default Context",
      summary: "  keep summary whitespace  ",
      techStack: null,
      repoPath: "  ~/work/prompter  ",
      isDefault: false,
    })
  })

  it("rejects invalid ids and blank names without trimming profile text fields", () => {
    // Given
    const invalidProjectId = { projectId: "not-a-uuid", name: "Default Context" }
    const blankName = { projectId, name: "   ", summary: "  preserved  " }

    // When
    const invalidProjectIdResult =
      createProjectContextProfileInputSchema.safeParse(invalidProjectId)
    const blankNameResult = createProjectContextProfileInputSchema.safeParse(blankName)

    // Then
    expect(invalidProjectIdResult.success).toBe(false)
    expect(blankNameResult.success).toBe(false)
  })

  it("accepts repo_path and repoPath only as string metadata naming expectations", () => {
    // Given
    const dbFields = PROJECT_CONTEXT_PROFILE_DB_FIELD_NAMES
    const ipcFields = PROJECT_CONTEXT_PROFILE_IPC_FIELD_NAMES

    // When / Then
    expect(dbFields).toContain("repo_path")
    expect(dbFields).toContain("project_id")
    expect(dbFields).toContain("validation_commands")
    expect(ipcFields).toContain("repoPath")
    expect(ipcFields).toContain("projectId")
    expect(ipcFields).toContain("validationCommands")
    expect(projectContextProfileSchema.parse(fullProfile).repoPath).toBe("~/work/prompter")
  })

  it("defines CRUD and compiler-context input schemas before IPC channels exist", () => {
    // Given
    const idInput = { projectId, profileId }

    // When / Then
    expect(listProjectContextProfilesInputSchema.parse({ projectId })).toEqual({ projectId })
    expect(getProjectContextProfileInputSchema.parse(idInput)).toEqual(idInput)
    expect(deleteProjectContextProfileInputSchema.parse(idInput)).toEqual(idInput)
    expect(duplicateProjectContextProfileInputSchema.parse(idInput)).toEqual(idInput)
    expect(setDefaultProjectContextProfileInputSchema.parse(idInput)).toEqual(idInput)
    expect(buildProjectContextForCompilerInputSchema.parse(idInput)).toEqual(idInput)
    expect(
      updateProjectContextProfilePayloadSchema.parse({
        projectId,
        profileId,
        input: { forbiddenActions: "Never execute profile text." },
      }),
    ).toEqual({
      projectId,
      profileId,
      input: { forbiddenActions: "Never execute profile text." },
    })
  })

  it("rejects blank profile ids for ownership-sensitive operations", () => {
    // Given
    const blankProfileId = { projectId, profileId: "" }

    // When
    const getResult = getProjectContextProfileInputSchema.safeParse(blankProfileId)
    const buildResult = buildProjectContextForCompilerInputSchema.safeParse(blankProfileId)

    // Then
    expect(getResult.success).toBe(false)
    expect(buildResult.success).toBe(false)
  })
})

describe("buildProjectContextForCompiler", () => {
  it("formats non-empty profile fields into stable Markdown sections", () => {
    // Given
    const expectedSectionNames = [
      "## Project Context Profile",
      "### Summary",
      "### Tech Stack",
      "### Architecture Notes",
      "### Coding Conventions",
      "### Constraints",
      "### Forbidden Actions",
      "### Acceptance Defaults",
      "### Validation Commands",
      "### Security Notes",
      "### Testing Notes",
      "### Additional Context",
      "### Package Manager",
      "### Default Branch",
      "### Repository Path",
    ]

    // When
    const result = buildProjectContextForCompiler(fullProfile)
    const context = result.context

    if (context === null) {
      throw new Error("Expected full profile to produce compiler context")
    }

    // Then
    expect(result.sectionNames).toEqual(expectedSectionNames)
    expect(context.startsWith("## Project Context Profile\n\nProfile: Default Context")).toBe(true)
    expect(context).toContain("Profile: Default Context")
    expect(context).toContain("### Forbidden Actions\n\nDo not run repo_path.")
    expect(context).toContain(
      "### Validation Commands\n\nnpm run typecheck\nnpx vitest run tests/project-context-profile.test.ts",
    )
    expect(projectContextCompilerBuildResultSchema.parse(result)).toEqual(result)
  })

  it("preserves whitespace, code fences, diff blocks, and user wording exactly", () => {
    // Given
    const profile = {
      ...fullProfile,
      summary: "\n  Leading newline and spaces stay.  \n",
      techStack: null,
      architectureNotes: "```diff\n- old behavior\n+ new behavior\n```",
      codingConventions: "   ",
      constraints: "Do not summarize or clean up this text.",
      additionalContext: "```md\n# Keep this fence\n```",
    }

    // When
    const result = buildProjectContextForCompiler(profile)

    // Then
    expect(result.context).toContain("### Summary\n\n\n  Leading newline and spaces stay.  \n")
    expect(result.context).toContain("```diff\n- old behavior\n+ new behavior\n```")
    expect(result.context).toContain("```md\n# Keep this fence\n```")
    expect(result.context).toContain("Do not summarize or clean up this text.")
    expect(result.context).not.toContain("### Coding Conventions")
    expect(result.context).not.toContain("### Tech Stack")
  })
})
