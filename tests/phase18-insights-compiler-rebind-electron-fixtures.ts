import type { ElectronApplication, Locator, Page, TestInfo } from "@playwright/test"

export const compilerProjectAName = "Phase 18 Compiler Alpha"
export const compilerProjectBName = "Phase 18 Compiler Beta"
export const compilerProfileAName = "Phase 18 compiler profile A"
export const compilerProfileBName = "Phase 18 compiler profile B"
export const compilerHarnessName = "Phase 18 compiler rebind harness"
export const compilerTemplateName = "Phase 18 compiler rebind template"
export const compilerSourcePromptTitle = "Phase 18 A source prompt"
export const compilerExistingBPromptTitle = "Phase 18 B existing prompt"
export const compilerSavedBPromptTitle = "Phase 18 B rebound prompt"
export const compilerOriginalRequest =
  "Preserve this exact authored request across explicit rebind."
export const compilerManualContext = "Manual context remains authored, local, and exact."
export const compilerTemplateOutput = "TEMPLATE preserved A artifact"

export type CompilerRebindSeed = {
  readonly harnessId: string
  readonly profileAId: string
  readonly profileBId: string
  readonly projectAId: string
  readonly projectBId: string
  readonly staticOutput: string
  readonly templateId: string
}

type ProjectPromptEntry = {
  readonly id: string
  readonly title: string
  readonly versionCount: number
}

export type CompilerOwnershipSnapshot = {
  readonly projectA: readonly ProjectPromptEntry[]
  readonly projectB: readonly ProjectPromptEntry[]
}

type CompilerRebindPngInput = {
  readonly anchor: Locator
  readonly name: string
  readonly region: Locator
}

export async function seedCompilerRebindFixture(page: Page): Promise<CompilerRebindSeed> {
  return page.evaluate(
    async ({
      existingBPromptTitle,
      harnessName,
      manualContext,
      originalRequest,
      profileAName,
      profileBName,
      projectAName,
      projectBName,
      sourcePromptTitle,
      templateName,
    }) => {
      const projectA = await window.prompter.projects.create({
        name: projectAName,
        techStack: "Electron, React, TypeScript",
        defaultAgent: "claude_code",
      })
      const projectB = await window.prompter.projects.create({
        name: projectBName,
        techStack: "Rust",
        defaultAgent: "generic_agent",
      })
      const profileA = await window.prompter.projectContextProfiles.create({
        projectId: projectA.id,
        name: profileAName,
        techStack: "Electron, React, TypeScript",
        validationCommands: "npm run typecheck",
        isDefault: true,
      })
      const profileB = await window.prompter.projectContextProfiles.create({
        projectId: projectB.id,
        name: profileBName,
        techStack: "Rust",
        validationCommands: "cargo test",
        isDefault: true,
      })
      await window.prompter.prompts.createWithInitialVersion({
        projectId: projectA.id,
        title: sourcePromptTitle,
        scenario: "bugfix",
        targetAgent: "claude_code",
        originalInput: "Project A persisted source input",
        compiledPrompt: "Project A persisted source output",
      })
      await window.prompter.prompts.createWithInitialVersion({
        projectId: projectB.id,
        title: existingBPromptTitle,
        scenario: "research",
        targetAgent: "generic_agent",
        originalInput: "Project B existing input",
        compiledPrompt: "Project B existing output",
      })
      const harness = await window.prompter.harnessTemplates.create({
        name: harnessName,
        scenario: "bugfix",
        targetAgent: "claude_code",
        templateBody:
          "STATIC\n{{title}}\n{{originalInput}}\n{{projectContext}}\n{{scenario}}\n{{targetAgent}}",
      })
      const template = await window.prompter.promptTemplates.create({
        name: templateName,
        scenario: "bugfix",
        targetAgent: "claude_code",
        templateBody: "TEMPLATE {{objective}}",
      })
      return {
        harnessId: harness.id,
        profileAId: profileA.id,
        profileBId: profileB.id,
        projectAId: projectA.id,
        projectBId: projectB.id,
        staticOutput: [
          "STATIC",
          "Phase 18 A authored prompt",
          originalRequest,
          manualContext,
          "bugfix",
          "claude_code",
        ].join("\n"),
        templateId: template.id,
      }
    },
    {
      existingBPromptTitle: compilerExistingBPromptTitle,
      harnessName: compilerHarnessName,
      manualContext: compilerManualContext,
      originalRequest: compilerOriginalRequest,
      profileAName: compilerProfileAName,
      profileBName: compilerProfileBName,
      projectAName: compilerProjectAName,
      projectBName: compilerProjectBName,
      sourcePromptTitle: compilerSourcePromptTitle,
      templateName: compilerTemplateName,
    },
  )
}

export async function readCompilerOwnershipSnapshot(
  page: Page,
  seed: CompilerRebindSeed,
): Promise<CompilerOwnershipSnapshot> {
  return page.evaluate(async ({ projectAId, projectBId }) => {
    async function readProject(projectId: string) {
      const assets = await window.prompter.prompts.listAssets({ projectId })
      return Promise.all(
        assets
          .toSorted((left, right) => left.title.localeCompare(right.title))
          .map(async (asset) => ({
            id: asset.id,
            title: asset.title,
            versionCount: (await window.prompter.prompts.listVersions(asset.id)).length,
          })),
      )
    }
    const [projectA, projectB] = await Promise.all([
      readProject(projectAId),
      readProject(projectBId),
    ])
    return { projectA, projectB }
  }, seed)
}

export async function resizeCompilerEvidenceWindow(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ BrowserWindow }) => {
    const browserWindow = BrowserWindow.getAllWindows()[0]
    if (browserWindow === undefined) {
      throw new TypeError("Expected a compiler evidence window")
    }
    browserWindow.setContentSize(1280, 1800)
  })
}

export async function attachCompilerRebindPng(
  input: CompilerRebindPngInput,
  testInfo: TestInfo,
): Promise<void> {
  const path = testInfo.outputPath(input.name)
  await input.anchor.scrollIntoViewIfNeeded()
  await input.region.screenshot({ path })
  await testInfo.attach(input.name, { path, contentType: "image/png" })
}
