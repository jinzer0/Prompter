import type { Page } from "@playwright/test"

export const insightsProjectName = "Phase 18 Alpha"
export const insightsOtherProjectName = "Phase 18 Beta"
export const lowQualityPromptTitle = "Phase 18 low quality prompt"
export const exactTemplateName = "ZZZ Phase 18 exact template"
export const insightsTagName = "phase18-insights-tag"

export type InsightsElectronSeed = {
  readonly contextProfileId: string
  readonly exactTemplateId: string
  readonly lowQualityPromptId: string
  readonly lowQualityVersionId: string
  readonly projectId: string
}

export type InsightsReadSnapshot = {
  readonly contextProfileIds: readonly string[]
  readonly maintenanceStatus: string
  readonly projectIds: readonly string[]
  readonly promptAssetIds: readonly string[]
  readonly reviewCount: number
  readonly tagIds: readonly string[]
  readonly templateTotal: number
  readonly versionQualityScore: number | null
}

export async function seedPopulatedInsights(page: Page): Promise<InsightsElectronSeed> {
  return page.evaluate(
    async ({ exactName, lowTitle, otherProjectName, projectName, tagName }) => {
      const project = await window.prompter.projects.create({
        name: projectName,
        description: "Populated Insights project",
        techStack: "Electron, React, TypeScript",
        defaultAgent: "codex",
      })
      await window.prompter.projects.create({
        name: otherProjectName,
        techStack: "Rust",
        defaultAgent: "generic_agent",
      })
      const lowPrompt = await window.prompter.prompts.createWithInitialVersion({
        projectId: project.id,
        title: lowTitle,
        scenario: "bugfix",
        targetAgent: "codex",
        originalInput: "Fix the populated Insights navigation defect.",
        compiledPrompt: "Fix the defect and verify exact read-only navigation.",
        qualityScore: 25,
      })
      const extraVersions = await Promise.all(
        [2, 3, 4, 5].map((versionNumber) =>
          window.prompter.prompts.createVersion({
            promptAssetId: lowPrompt.asset.id,
            originalInput: `Iteration ${versionNumber}`,
            compiledPrompt: `Compiled populated Insights iteration ${versionNumber}.`,
            qualityScore: 25,
          }),
        ),
      )
      const latestLowVersion = extraVersions.at(-1)
      if (latestLowVersion === undefined) {
        throw new TypeError("Expected an additional low-quality prompt version")
      }
      await window.prompter.prompts.setCurrentVersion(lowPrompt.asset.id, latestLowVersion.id)
      const currentLowVersion = await window.prompter.prompts.getCurrentVersion(lowPrompt.asset.id)
      if (currentLowVersion === null) {
        throw new TypeError("Expected a current low-quality prompt version")
      }
      const highPrompt = await window.prompter.prompts.createWithInitialVersion({
        projectId: project.id,
        title: "Phase 18 excellent prompt",
        scenario: "feature",
        targetAgent: "claude_code",
        originalInput: "Build populated Insights coverage.",
        compiledPrompt: "Build complete populated Insights coverage with typed boundaries.",
        qualityScore: 95,
      })
      const tag = await window.prompter.tags.create({ name: tagName })
      await window.prompter.tags.attachToPrompt(lowPrompt.asset.id, tag.id)
      await window.prompter.tags.attachToPrompt(highPrompt.asset.id, tag.id)
      await window.prompter.tags.create({ name: "phase18-unused" })
      const profile = await window.prompter.projectContextProfiles.create({
        projectId: project.id,
        name: "Phase 18 default context",
        summary: "Context navigation target",
        techStack: "Electron, React, TypeScript",
        validationCommands: "npm run typecheck",
        forbiddenActions: "No prompt execution",
        repoPath: "/phase18/read-only",
        isDefault: true,
      })
      await window.prompter.harnessTemplates.create({
        name: "Phase 18 populated harness",
        scenario: "feature",
        targetAgent: "codex",
        templateBody: "{{objective}}\n{{acceptance_criteria}}",
      })
      const exactTemplate = await window.prompter.promptTemplates.createFromVersion({
        sourcePromptAssetId: lowPrompt.asset.id,
        sourcePromptVersionId: currentLowVersion.id,
        name: exactName,
        description: "Exact-ID navigation target outside the default list",
        templateBody:
          "{{objective}} {{context}} {{constraints}} {{acceptance}} {{validation}} {{response}}",
      })
      for (const index of Array.from({ length: 101 }, (_, itemIndex) => itemIndex)) {
        await window.prompter.promptTemplates.create({
          name: `AAA filler ${String(index).padStart(3, "0")}`,
          description: "Default-list boundary fixture",
          scenario: "docs",
          targetAgent: "cursor",
          templateBody: "{{objective}}",
        })
      }
      const firstPage = await window.prompter.promptTemplates.list({ limit: 100 })
      if (firstPage.templates.some((template) => template.id === exactTemplate.id)) {
        throw new TypeError("Exact template must be absent from the default 100-item list")
      }
      return {
        contextProfileId: profile.id,
        exactTemplateId: exactTemplate.id,
        lowQualityPromptId: lowPrompt.asset.id,
        lowQualityVersionId: currentLowVersion.id,
        projectId: project.id,
      }
    },
    {
      exactName: exactTemplateName,
      lowTitle: lowQualityPromptTitle,
      otherProjectName: insightsOtherProjectName,
      projectName: insightsProjectName,
      tagName: insightsTagName,
    },
  )
}

export async function readInsightsSnapshot(
  page: Page,
  seed: InsightsElectronSeed,
): Promise<InsightsReadSnapshot> {
  return page.evaluate(async ({ lowQualityPromptId, lowQualityVersionId, projectId }) => {
    const [projects, prompts, reviews, tags, templates, profiles, maintenance, version] =
      await Promise.all([
        window.prompter.projects.list(),
        window.prompter.prompts.listAssets({}),
        window.prompter.promptQuality.listReviewsForVersion({
          promptVersionId: lowQualityVersionId,
        }),
        window.prompter.tags.list(),
        window.prompter.promptTemplates.list({ limit: 100 }),
        window.prompter.projectContextProfiles.list(projectId),
        window.prompter.insights.getMaintenanceSnapshot({ projectId: null, dateRange: "all" }),
        window.prompter.prompts.getVersion(lowQualityVersionId),
      ])
    if (!prompts.some((prompt) => prompt.id === lowQualityPromptId)) {
      throw new TypeError("Expected the low-quality prompt in the read snapshot")
    }
    return {
      contextProfileIds: profiles.map((profile) => profile.id).sort(),
      maintenanceStatus: maintenance.status,
      projectIds: projects.map((project) => project.id).sort(),
      promptAssetIds: prompts.map((prompt) => prompt.id).sort(),
      reviewCount: reviews.length,
      tagIds: tags.map((tag) => tag.id).sort(),
      templateTotal: templates.total,
      versionQualityScore: version?.qualityScore ?? null,
    }
  }, seed)
}
