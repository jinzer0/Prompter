import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { openPrompterDatabase, type PrompterDatabaseConfig } from "../electron/db/connection"

export type TestDatabase = ReturnType<typeof openPrompterDatabase>

type PlannedSearchFilter = {
  readonly projectId?: string
  readonly query: string
  readonly scenario?: string
  readonly tagIds?: readonly string[]
  readonly targetAgent?: string
}

type PlannedCreateTagInput = {
  readonly name: string
}

export const searchTestDirectories: string[] = []

function callPlannedService(
  database: TestDatabase,
  serviceName: string,
  ...args: readonly unknown[]
): unknown {
  const service = Reflect.get(database.services, serviceName)

  if (typeof service !== "function") {
    throw new TypeError(`Phase 7 service ${serviceName} is not registered`)
  }

  return Reflect.apply(service, database.services, args)
}

type SearchTestDatabaseConfig = Pick<
  PrompterDatabaseConfig,
  "openAIKeyStore" | "promptCompilerClientFactory"
>

export async function createSearchTestDatabase(
  config: SearchTestDatabaseConfig = {},
): Promise<TestDatabase> {
  const directory = await mkdtemp(join(tmpdir(), "prompter-search-db-"))
  searchTestDirectories.push(directory)

  return openPrompterDatabase({
    databasePath: join(directory, "prompter.sqlite"),
    migrationsFolder: join(process.cwd(), "drizzle"),
    ...config,
  })
}

export async function removeSearchTestDatabases(): Promise<void> {
  await Promise.all(
    searchTestDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  )
}

export function rebuildSearchIndex(database: TestDatabase): void {
  callPlannedService(database, "rebuildSearchIndex")
}

export function searchPrompts(database: TestDatabase, filter: PlannedSearchFilter): unknown {
  return callPlannedService(database, "searchPrompts", filter)
}

export function listTagsForPrompt(database: TestDatabase, promptAssetId: string): unknown {
  return callPlannedService(database, "listTagsForPrompt", promptAssetId)
}

export function listTagsWithCounts(database: TestDatabase): unknown {
  return callPlannedService(database, "listTagsWithCounts")
}

export function createAndAttachTagToPrompt(
  database: TestDatabase,
  promptAssetId: string,
  input: PlannedCreateTagInput,
): unknown {
  return callPlannedService(database, "createAndAttachTagToPrompt", promptAssetId, input)
}

export function createPhase7SearchFixture(database: TestDatabase) {
  const project = database.services.createProject({ name: "Phase 7 Search" })
  const otherProject = database.services.createProject({ name: "Other Prompts" })
  const frontendTag = database.services.createTag({ name: "frontend" })
  const urgentTag = database.services.createTag({ name: "urgent" })
  const koreanTag = database.services.createTag({ name: "한국어" })
  const currentPrompt = database.services.createPromptAsset({
    projectId: project.id,
    title: "Command Palette Builder",
    scenario: "feature",
    targetAgent: "codex",
  })
  const partialTagPrompt = database.services.createPromptAsset({
    projectId: project.id,
    title: "React Docs Summarizer",
    scenario: "docs",
    targetAgent: "codex",
  })
  const otherProjectPrompt = database.services.createPromptAsset({
    projectId: otherProject.id,
    title: "Backend Command Worker",
    scenario: "feature",
    targetAgent: "cursor",
  })
  const koreanPrompt = database.services.createPromptAsset({
    projectId: project.id,
    title: "결제 승인 안내",
    scenario: "research",
    targetAgent: "generic_agent",
  })
  const staleVersion = database.services.createNextPromptVersion({
    promptAssetId: currentPrompt.id,
    originalInput: "Draft an obsolete command prompt.",
    compiledPrompt: "Obsolete command palette copy that must not appear in preview.",
    makeCurrent: true,
  })
  const currentVersion = database.services.createNextPromptVersion({
    promptAssetId: currentPrompt.id,
    originalInput: "Build the current React command palette prompt.",
    compiledPrompt: "Ship the React command palette with keyboard navigation and tests.",
    makeCurrent: true,
  })
  const partialTagVersion = database.services.createNextPromptVersion({
    promptAssetId: partialTagPrompt.id,
    originalInput: "Summarize React documentation.",
    compiledPrompt: "Summarize React command palette documentation for onboarding.",
    makeCurrent: true,
  })
  database.services.createNextPromptVersion({
    promptAssetId: otherProjectPrompt.id,
    originalInput: "Build a worker prompt.",
    compiledPrompt: "Ship a backend command worker for background processing.",
    makeCurrent: true,
  })
  const koreanVersion = database.services.createNextPromptVersion({
    promptAssetId: koreanPrompt.id,
    originalInput: "결제 승인 흐름을 조사한다.",
    compiledPrompt: "결제 승인 플로우를 한국어로 설명하고 위험을 정리한다.",
    makeCurrent: true,
  })

  database.services.attachTagToPrompt(currentPrompt.id, frontendTag.id)
  database.services.attachTagToPrompt(currentPrompt.id, urgentTag.id)
  database.services.attachTagToPrompt(partialTagPrompt.id, frontendTag.id)
  database.services.attachTagToPrompt(otherProjectPrompt.id, urgentTag.id)
  database.services.attachTagToPrompt(koreanPrompt.id, koreanTag.id)

  return {
    currentPrompt,
    currentVersion: currentVersion.version,
    frontendTag,
    koreanPrompt,
    koreanTag,
    koreanVersion: koreanVersion.version,
    otherProjectPrompt,
    partialTagPrompt,
    partialTagVersion: partialTagVersion.version,
    project,
    staleVersion: staleVersion.version,
    urgentTag,
  }
}
