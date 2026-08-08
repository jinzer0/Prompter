import { describe, expect, it } from "vitest"

import type { ProjectContextProfile } from "../electron/ipc-types"
import {
  createProjectContextProfilesLoader,
  type ProjectContextProfilesLoadEvent,
} from "../renderer/src/hooks/use-project-context-profiles"
import { createDeferred } from "./phase18-insights-renderer-fixtures"

const projectAId = "10000000-0000-4000-8000-000000000001"
const projectBId = "10000000-0000-4000-8000-000000000002"

const profileA = {
  id: "20000000-0000-4000-8000-000000000001",
  projectId: projectAId,
  name: "Project A profile",
  isDefault: true,
  summary: null,
  techStack: null,
  architectureNotes: null,
  codingConventions: null,
  constraints: null,
  forbiddenActions: null,
  acceptanceDefaults: null,
  validationCommands: null,
  securityNotes: null,
  additionalContext: null,
  testingNotes: null,
  packageManager: null,
  defaultBranch: null,
  repoPath: null,
  createdAt: 1,
  updatedAt: 1,
} satisfies ProjectContextProfile

const profileB = {
  ...profileA,
  id: "20000000-0000-4000-8000-000000000002",
  projectId: projectBId,
  name: "Project B profile",
  updatedAt: 2,
} satisfies ProjectContextProfile

type ObservableState = {
  profiles: readonly ProjectContextProfile[]
  status: "idle" | "loading" | "ready" | "error"
  error: string | null
}

function assertNever(event: never): never {
  throw new TypeError(`Unexpected project context profiles event: ${JSON.stringify(event)}`)
}

function applyLoadEvent(state: ObservableState, event: ProjectContextProfilesLoadEvent): void {
  switch (event.kind) {
    case "load_started":
      state.status = "loading"
      state.error = null
      return
    case "load_succeeded":
      state.profiles = event.profiles
      state.status = "ready"
      return
    case "load_failed":
      state.error = event.message
      state.status = "error"
      return
    default:
      assertNever(event)
  }
}

function createHarness() {
  const requestA = createDeferred<readonly ProjectContextProfile[]>()
  const requestB = createDeferred<readonly ProjectContextProfile[]>()
  const state: ObservableState = { profiles: [], status: "idle", error: "old error" }
  const list = (projectId: string) =>
    projectId === projectAId ? requestA.promise : requestB.promise

  const loader = createProjectContextProfilesLoader(list, (event) => applyLoadEvent(state, event))

  return { loader, requestA, requestB, state }
}

describe("project context profiles latest request", () => {
  it("keeps project B authoritative when project A succeeds last", async () => {
    // Given: project A is pending when the newer project B request starts.
    const harness = createHarness()
    const pendingA = harness.loader.load(projectAId)
    const pendingB = harness.loader.load(projectBId)

    // When: B succeeds first and A resolves after the applied state is captured.
    harness.requestB.resolve([profileB])
    await pendingB
    const appliedState = { ...harness.state, profiles: [...harness.state.profiles] }
    harness.requestA.resolve([profileA])
    await pendingA

    // Then: stale A data cannot replace B profiles or status.
    expect(harness.state).toEqual(appliedState)
    expect(harness.state).toEqual({ profiles: [profileB], status: "ready", error: null })
  })

  it("keeps project B authoritative when project A fails last", async () => {
    // Given: project A is pending when the newer project B request starts.
    const harness = createHarness()
    const pendingA = harness.loader.load(projectAId)
    const pendingB = harness.loader.load(projectBId)

    // When: B succeeds before stale A rejects with a handled Error.
    harness.requestB.resolve([profileB])
    await pendingB
    const appliedState = { ...harness.state, profiles: [...harness.state.profiles] }
    harness.requestA.reject(new Error("Project A failed"))
    await pendingA

    // Then: stale A error cannot replace B profiles, status, or error state.
    expect(harness.state).toEqual(appliedState)
    expect(harness.state).toEqual({ profiles: [profileB], status: "ready", error: null })
  })

  it("ignores a pending response after disposal", async () => {
    // Given: project A is pending when its owner is disposed or cleared.
    const harness = createHarness()
    const pendingA = harness.loader.load(projectAId)

    // When: the loader is disposed before A resolves.
    harness.loader.dispose()
    const disposedState = { ...harness.state, profiles: [...harness.state.profiles] }
    harness.requestA.resolve([profileA])
    await pendingA

    // Then: the disposed response has no observable state effects.
    expect(harness.state).toEqual(disposedState)
  })
})
