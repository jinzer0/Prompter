import { access, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { ElectronApplication, Page } from "@playwright/test"
import { expect } from "@playwright/test"

import { PERSISTENCE_CHANNELS } from "../electron/ipc-contract"
import type { ProjectContextProfile, UpdateProjectContextProfileInput } from "../electron/ipc-types"
import { createNamedProject, launchPrompter, type RunningApp } from "./electron-playwright-helpers"

type Phase13Callback = (run: RunningApp) => Promise<void>

export type ProjectProfileIds = {
  readonly projectId: string
  readonly profileId: string
}

export type PromptCompilerIpcSnapshot = {
  readonly analyze: number
  readonly compile: number
  readonly lastAnalyzeInput: unknown
  readonly lastCompileInput: unknown
}

export async function withPhase13Prompter(
  tempPrefix: string,
  callback: Phase13Callback,
  extraEnv: Readonly<Record<string, string>> = {},
): Promise<void> {
  await access("dist-electron/main.cjs")
  const userDataDirectory = await mkdtemp(join(tmpdir(), `${tempPrefix}-`))
  let run: RunningApp | null = null

  try {
    run = await launchPrompter(userDataDirectory, extraEnv)
    await callback(run)
  } finally {
    await run?.app.close()
    await rm(userDataDirectory, { recursive: true, force: true })
  }
}

export async function withPhase13Project(
  projectName: string,
  callback: Phase13Callback,
  extraEnv: Readonly<Record<string, string>> = {},
): Promise<void> {
  await withPhase13Prompter(
    projectName,
    async (run) => {
      await createNamedProject(run.page, projectName)
      await callback(run)
    },
    extraEnv,
  )
}

export function originalRequest(page: Page) {
  return page.getByRole("textbox", { name: "Original request" })
}

export function generatedPreview(page: Page) {
  return page.getByRole("textbox", { name: "Generated prompt preview" })
}

export function profileSelector(page: Page) {
  return page.getByRole("combobox", { name: "Project context profile" })
}

export function includeProfileToggle(page: Page) {
  return page.getByRole("checkbox", { name: "Include project context profile" })
}

export async function installPromptCompilerIpcRecorder(app: ElectronApplication): Promise<void> {
  await app.evaluate(
    ({ ipcMain }, channels) => {
      type Recorder = {
        analyze: number
        compile: number
        lastAnalyzeInput: unknown
        lastCompileInput: unknown
      }

      const handlers = Reflect.get(ipcMain, "_invokeHandlers")
      if (!(handlers instanceof Map)) {
        throw new Error("Electron IPC invoke handler map is required for recording")
      }

      const recorder: Recorder = {
        analyze: 0,
        compile: 0,
        lastAnalyzeInput: null,
        lastCompileInput: null,
      }
      Reflect.set(globalThis, "__prompterPromptCompilerIpcRecorder", recorder)

      function wrapHandler(channel: string, kind: "analyze" | "compile"): void {
        const handler = handlers.get(channel)
        if (typeof handler !== "function") {
          throw new Error(`Prompt compiler IPC handler for ${channel} was not registered`)
        }

        ipcMain.removeHandler(channel)
        ipcMain.handle(channel, (event, payload: unknown) => {
          if (kind === "analyze") {
            recorder.analyze += 1
            recorder.lastAnalyzeInput = payload
          }

          if (kind === "compile") {
            recorder.compile += 1
            recorder.lastCompileInput = payload
          }

          return Reflect.apply(handler, undefined, [event, payload])
        })
      }

      wrapHandler(channels.analyze, "analyze")
      wrapHandler(channels.compile, "compile")
    },
    {
      analyze: PERSISTENCE_CHANNELS.promptCompilerAnalyze,
      compile: PERSISTENCE_CHANNELS.promptCompilerCompile,
    },
  )
}

export async function promptCompilerIpcSnapshot(
  app: ElectronApplication,
): Promise<PromptCompilerIpcSnapshot> {
  return app.evaluate(() => {
    const value = Reflect.get(globalThis, "__prompterPromptCompilerIpcRecorder")
    if (typeof value !== "object" || value === null) {
      throw new Error("Prompt compiler IPC recorder was not installed")
    }

    const analyze = Reflect.get(value, "analyze")
    const compile = Reflect.get(value, "compile")
    if (typeof analyze !== "number" || typeof compile !== "number") {
      throw new Error("Prompt compiler IPC recorder has an invalid shape")
    }

    return {
      analyze,
      compile,
      lastAnalyzeInput: Reflect.get(value, "lastAnalyzeInput"),
      lastCompileInput: Reflect.get(value, "lastCompileInput"),
    }
  })
}

export async function expectNoPromptCompilerIpcCalls(app: ElectronApplication): Promise<void> {
  await expect
    .poll(async () => {
      const snapshot = await promptCompilerIpcSnapshot(app)
      return { analyze: snapshot.analyze, compile: snapshot.compile }
    })
    .toEqual({ analyze: 0, compile: 0 })
}

export async function profileCountByProjectName(page: Page, projectName: string): Promise<number> {
  return page.evaluate(async (name) => {
    const projects = await window.prompter.projects.list()
    const project = projects.find((item) => item.name === name) ?? null

    return project === null
      ? 0
      : window.prompter.projectContextProfiles.list(project.id).then((profiles) => profiles.length)
  }, projectName)
}

export async function defaultProfileForProject(
  page: Page,
  projectName: string,
): Promise<ProjectProfileIds> {
  return page.evaluate(async (name) => {
    const projects = await window.prompter.projects.list()
    const project = projects.find((item) => item.name === name)
    if (project === undefined) {
      throw new Error(`Project ${name} was not created`)
    }

    const profiles = await window.prompter.projectContextProfiles.list(project.id)
    const defaultProfile = profiles.find((profile) => profile.isDefault)
    if (defaultProfile === undefined) {
      throw new Error(`Default profile for ${name} was not created`)
    }

    return { projectId: project.id, profileId: defaultProfile.id }
  }, projectName)
}

export async function updateDefaultProfile(
  page: Page,
  projectName: string,
  input: UpdateProjectContextProfileInput,
): Promise<ProjectProfileIds> {
  const ids = await defaultProfileForProject(page, projectName)
  await page.evaluate(
    async ({ projectId, profileId, update }) => {
      await window.prompter.projectContextProfiles.update(projectId, profileId, update)
    },
    { ...ids, update: input },
  )

  return ids
}

export async function profileByName(
  page: Page,
  projectName: string,
  profileName: string,
): Promise<ProjectContextProfile | null> {
  return page.evaluate(
    async ({ projectName: name, profileName: targetName }) => {
      const projects = await window.prompter.projects.list()
      const project = projects.find((item) => item.name === name) ?? null
      const profiles =
        project === null ? [] : await window.prompter.projectContextProfiles.list(project.id)

      return profiles.find((profile) => profile.name === targetName) ?? null
    },
    { projectName, profileName },
  )
}
