import { describe, expect, it } from "vitest"

import { createElectronBridge } from "../electron/bridge"
import { PERSISTENCE_CHANNELS } from "../electron/ipc-contract"
import { harnessTemplateResponse, validHarnessTemplateId } from "./electron-contract-fixtures"
import {
  projectContextCompilerBuildFixture,
  projectContextProfileFixture,
  validProjectContextProfileId,
  validProjectId,
} from "./electron-contract-helpers"

describe("Electron shell contract", () => {
  it("routes harness template list filters and duplicate through typed bridge channels", async () => {
    const calls: { readonly channel: string; readonly payload: unknown }[] = []
    const bridge = createElectronBridge(async (channel, payload) => {
      calls.push({ channel, payload })

      if (channel === PERSISTENCE_CHANNELS.listHarnessTemplates) {
        return [harnessTemplateResponse]
      }
      if (channel === PERSISTENCE_CHANNELS.duplicateHarnessTemplate) {
        return { ...harnessTemplateResponse, name: "Feature Harness Copy" }
      }

      throw new Error(`Unexpected channel ${channel}`)
    })

    await expect(bridge.harnessTemplates.list()).resolves.toEqual([harnessTemplateResponse])
    await expect(bridge.harnessTemplates.list({ scenario: "feature" })).resolves.toEqual([
      harnessTemplateResponse,
    ])
    await expect(bridge.harnessTemplates.list({ targetAgent: "generic_agent" })).resolves.toEqual([
      harnessTemplateResponse,
    ])
    await expect(bridge.harnessTemplates.list({ query: "  Feature  " })).resolves.toEqual([
      harnessTemplateResponse,
    ])
    await expect(bridge.harnessTemplates.list({ query: "   " })).resolves.toEqual([
      harnessTemplateResponse,
    ])
    await expect(bridge.harnessTemplates.duplicate(validHarnessTemplateId)).resolves.toEqual({
      ...harnessTemplateResponse,
      name: "Feature Harness Copy",
    })

    expect(calls).toEqual([
      { channel: PERSISTENCE_CHANNELS.listHarnessTemplates, payload: undefined },
      { channel: PERSISTENCE_CHANNELS.listHarnessTemplates, payload: { scenario: "feature" } },
      {
        channel: PERSISTENCE_CHANNELS.listHarnessTemplates,
        payload: { targetAgent: "generic_agent" },
      },
      { channel: PERSISTENCE_CHANNELS.listHarnessTemplates, payload: { query: "Feature" } },
      { channel: PERSISTENCE_CHANNELS.listHarnessTemplates, payload: { query: "" } },
      {
        channel: PERSISTENCE_CHANNELS.duplicateHarnessTemplate,
        payload: { id: validHarnessTemplateId },
      },
    ])
  })

  it("routes project context profile methods through typed bridge channels", async () => {
    const calls: { readonly channel: string; readonly payload: unknown }[] = []
    const bridge = createElectronBridge(async (channel, payload) => {
      calls.push({ channel, payload })

      if (channel === PERSISTENCE_CHANNELS.listProjectContextProfiles) {
        return [projectContextProfileFixture]
      }
      if (channel === PERSISTENCE_CHANNELS.getProjectContextProfile) {
        return projectContextProfileFixture
      }
      if (channel === PERSISTENCE_CHANNELS.getDefaultProjectContextProfile) {
        return projectContextProfileFixture
      }
      if (channel === PERSISTENCE_CHANNELS.deleteProjectContextProfile) {
        return { id: validProjectContextProfileId }
      }
      if (channel === PERSISTENCE_CHANNELS.buildProjectContextForCompiler) {
        return projectContextCompilerBuildFixture
      }
      if (
        channel === PERSISTENCE_CHANNELS.createProjectContextProfile ||
        channel === PERSISTENCE_CHANNELS.updateProjectContextProfile ||
        channel === PERSISTENCE_CHANNELS.duplicateProjectContextProfile ||
        channel === PERSISTENCE_CHANNELS.setDefaultProjectContextProfile
      ) {
        return projectContextProfileFixture
      }

      throw new Error(`Unexpected channel ${channel}`)
    })

    await expect(
      bridge.projectContextProfiles.create({
        projectId: validProjectId,
        name: "Default Context",
        summary: "A safe project summary.",
      }),
    ).resolves.toEqual(projectContextProfileFixture)
    await expect(bridge.projectContextProfiles.list(validProjectId)).resolves.toEqual([
      projectContextProfileFixture,
    ])
    await expect(
      bridge.projectContextProfiles.get(validProjectId, validProjectContextProfileId),
    ).resolves.toEqual(projectContextProfileFixture)
    await expect(bridge.projectContextProfiles.getDefault(validProjectId)).resolves.toEqual(
      projectContextProfileFixture,
    )
    await expect(
      bridge.projectContextProfiles.update(validProjectId, validProjectContextProfileId, {
        name: "Updated Context",
      }),
    ).resolves.toEqual(projectContextProfileFixture)
    await expect(
      bridge.projectContextProfiles.delete(validProjectId, validProjectContextProfileId),
    ).resolves.toEqual({ id: validProjectContextProfileId })
    await expect(
      bridge.projectContextProfiles.duplicate(validProjectId, validProjectContextProfileId),
    ).resolves.toEqual(projectContextProfileFixture)
    await expect(
      bridge.projectContextProfiles.setDefault(validProjectId, validProjectContextProfileId),
    ).resolves.toEqual(projectContextProfileFixture)
    await expect(
      bridge.projectContextProfiles.buildCompilerContext(
        validProjectId,
        validProjectContextProfileId,
      ),
    ).resolves.toEqual(projectContextCompilerBuildFixture)

    expect(calls).toEqual([
      {
        channel: PERSISTENCE_CHANNELS.createProjectContextProfile,
        payload: {
          projectId: validProjectId,
          name: "Default Context",
          summary: "A safe project summary.",
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
          isDefault: false,
        },
      },
      {
        channel: PERSISTENCE_CHANNELS.listProjectContextProfiles,
        payload: { projectId: validProjectId },
      },
      {
        channel: PERSISTENCE_CHANNELS.getProjectContextProfile,
        payload: { projectId: validProjectId, profileId: validProjectContextProfileId },
      },
      {
        channel: PERSISTENCE_CHANNELS.getDefaultProjectContextProfile,
        payload: { projectId: validProjectId },
      },
      {
        channel: PERSISTENCE_CHANNELS.updateProjectContextProfile,
        payload: {
          projectId: validProjectId,
          profileId: validProjectContextProfileId,
          input: { name: "Updated Context" },
        },
      },
      {
        channel: PERSISTENCE_CHANNELS.deleteProjectContextProfile,
        payload: { projectId: validProjectId, profileId: validProjectContextProfileId },
      },
      {
        channel: PERSISTENCE_CHANNELS.duplicateProjectContextProfile,
        payload: { projectId: validProjectId, profileId: validProjectContextProfileId },
      },
      {
        channel: PERSISTENCE_CHANNELS.setDefaultProjectContextProfile,
        payload: { projectId: validProjectId, profileId: validProjectContextProfileId },
      },
      {
        channel: PERSISTENCE_CHANNELS.buildProjectContextForCompiler,
        payload: { projectId: validProjectId, profileId: validProjectContextProfileId },
      },
    ])
  })
})
