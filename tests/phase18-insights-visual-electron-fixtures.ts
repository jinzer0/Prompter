import type { Page } from "@playwright/test"

export const visualProjectAName = "한국어 AI Workflow Alpha 프로젝트 긴 이름 검증"
export const visualProjectBName = "교차 Project Beta Context 탐색 대상 긴 이름"
export const visualPromptTitle = "다국어 결제 승인 Prompt Library 품질 점검 시나리오"
export const visualTagName = "한국어-frontend-긴-태그-접근성"
export const visualUnusedTagName = "미사용-maintenance-정리-대상-긴-태그"
export const visualTemplateName = "한국어 Template 다국어 문맥 보존 및 줄바꿈 검증"
export const visualProfileName = "한국어 Compiler Context Profile 긴 이름 보존"

export type InsightsVisualSeed = {
  readonly profileAId: string
  readonly projectAId: string
  readonly projectBId: string
}

export async function seedMixedCjkInsights(page: Page): Promise<InsightsVisualSeed> {
  return page.evaluate(
    async ({
      profileName,
      projectAName,
      projectBName,
      promptTitle,
      tagName,
      templateName,
      unusedTagName,
    }) => {
      const projectA = await window.prompter.projects.create({
        name: projectAName,
        description: "Korean 한국어 and Latin mixed-content visual regression project",
        techStack: "Electron, React, TypeScript, 한글 UI",
        defaultAgent: "codex",
      })
      const projectB = await window.prompter.projects.create({
        name: projectBName,
        description: "Explicit cross-project Insights navigation target",
        techStack: "Rust, SQLite, 한국어 문맥",
        defaultAgent: "generic_agent",
      })
      const prompt = await window.prompter.prompts.createWithInitialVersion({
        projectId: projectA.id,
        title: promptTitle,
        scenario: "feature",
        targetAgent: "codex",
        originalInput: "한국어와 Latin text가 섞인 결제 승인 흐름을 검증한다.",
        compiledPrompt:
          "Validate mixed-CJK 결제 승인 workflow with keyboard accessibility evidence.",
        qualityScore: 42,
      })
      for (const versionNumber of [2, 3, 4]) {
        await window.prompter.prompts.createVersion({
          promptAssetId: prompt.asset.id,
          originalInput: `반복 Iteration ${versionNumber} 입력 문맥`,
          compiledPrompt: `Compiled 다국어 iteration ${versionNumber} with deterministic content.`,
          qualityScore: 42,
        })
      }
      const tag = await window.prompter.tags.create({ name: tagName })
      await window.prompter.tags.attachToPrompt(prompt.asset.id, tag.id)
      await window.prompter.tags.create({ name: unusedTagName })
      const profileA = await window.prompter.projectContextProfiles.create({
        projectId: projectA.id,
        name: profileName,
        summary: "한국어 compiler context와 Latin identifiers를 함께 유지한다.",
        techStack: "Electron, React, TypeScript",
        validationCommands: "npm run typecheck && npm run lint",
        forbiddenActions: "No network, LLM, or maintenance execution",
        repoPath: "/phase18/mixed-cjk-read-only",
        isDefault: true,
      })
      await window.prompter.promptTemplates.createFromVersion({
        sourcePromptAssetId: prompt.asset.id,
        sourcePromptVersionId: prompt.version.id,
        name: templateName,
        description: "Mixed Korean/Latin template name clipping evidence",
        templateBody: "{{objective}} {{context}} {{constraints}} {{acceptance}} {{validation}}",
      })
      await window.prompter.harnessTemplates.create({
        name: "한국어 Agent Harness CJK Layout Validation 긴 이름",
        scenario: "feature",
        targetAgent: "codex",
        templateBody: "{{objective}}\n{{acceptance_criteria}}",
      })

      return { profileAId: profileA.id, projectAId: projectA.id, projectBId: projectB.id }
    },
    {
      profileName: visualProfileName,
      projectAName: visualProjectAName,
      projectBName: visualProjectBName,
      promptTitle: visualPromptTitle,
      tagName: visualTagName,
      templateName: visualTemplateName,
      unusedTagName: visualUnusedTagName,
    },
  )
}
