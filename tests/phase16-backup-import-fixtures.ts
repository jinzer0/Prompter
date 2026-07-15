import { backupEnvelopeSchema } from "../electron/ipc-contract"
import type { BackupEnvelope, BackupType } from "../electron/ipc-types"

// allow: SIZE_OK - one complete raw backup fixture shared across scoped import cases.
export const importFixtureIds = {
  project: "11111111-1111-4111-8111-111111111111",
  asset: "22222222-2222-4222-8222-222222222222",
  version: "33333333-3333-4333-8333-333333333333",
  tag: "44444444-4444-4444-8444-444444444444",
  harness: "55555555-5555-4555-8555-555555555555",
  profile: "66666666-6666-4666-8666-666666666666",
  template: "77777777-7777-4777-8777-777777777777",
  review: "88888888-8888-4888-8888-888888888888",
  externalAsset: "99999999-9999-4999-8999-999999999999",
  externalVersion: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
} as const

export const rawReviewTexts = {
  dimensionScores: '{  "clarity": 91, "context": 82 }',
  strengths: '[ "precise" ]',
  issues: "[]",
  suggestions: "[]",
  missingSections: "[]",
  warnings: "[]",
  recommendedClarifyingQuestions: "[]",
  snapshot: '{ "compiledPrompt": "# Objective" }',
} as const

const itemCounts = {
  projects: 1,
  promptAssets: 1,
  promptVersions: 1,
  tags: 1,
  promptTags: 1,
  harnessTemplates: 1,
  projectContextProfiles: 1,
  promptTemplates: 1,
  promptQualityReviews: 1,
} as const

export function fullImportEnvelope() {
  const envelope = backupEnvelopeSchema.parse({
    schemaVersion: 1,
    appName: "Prompter",
    backupType: "full",
    exportedAt: 100,
    metadata: {
      itemCounts,
      sourceSummary: "One complete project",
      excludesSecrets: true,
      excludesSecretStatus: true,
      includesSettings: false,
      plaintext: true,
      schemaVersion: 1,
    },
    data: {
      projects: [
        {
          id: importFixtureIds.project,
          name: "Project",
          description: "Source project",
          techStack: "TypeScript",
          defaultAgent: "codex",
          createdAt: 10,
          updatedAt: 11,
        },
      ],
      promptAssets: [
        {
          id: importFixtureIds.asset,
          projectId: importFixtureIds.project,
          title: "Imported search phrase",
          scenario: "feature",
          targetAgent: "codex",
          currentVersionId: importFixtureIds.version,
          parentPromptId: null,
          parentPromptVersionId: null,
          derivationType: null,
          createdAt: 12,
          updatedAt: 13,
        },
      ],
      promptVersions: [
        {
          id: importFixtureIds.version,
          promptAssetId: importFixtureIds.asset,
          versionNumber: 1,
          originalInput: "Build the imported feature.",
          compiledPrompt: "# Objective\nImported search phrase",
          assumptions: "[]",
          questions: "[]",
          answers: "[]",
          acceptanceCriteria: "[]",
          validationCommands: "[]",
          qualityScore: 91,
          createdAt: 14,
        },
      ],
      tags: [{ id: importFixtureIds.tag, name: "shared", createdAt: 15 }],
      promptTags: [{ promptAssetId: importFixtureIds.asset, tagId: importFixtureIds.tag }],
      harnessTemplates: [
        {
          id: importFixtureIds.harness,
          name: "Harness",
          scenario: "feature",
          targetAgent: "codex",
          templateBody: "{{prompt}}",
          requiredFields: '["prompt"]',
          clarificationPolicy: '{"mode":"ask"}',
          createdAt: 16,
          updatedAt: 17,
        },
      ],
      projectContextProfiles: [
        {
          id: importFixtureIds.profile,
          projectId: importFixtureIds.project,
          name: "Default Context",
          summary: "Summary",
          techStack: "TypeScript",
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
          repoPath: "/source/metadata-only",
          isDefault: true,
          createdAt: 18,
          updatedAt: 19,
        },
      ],
      promptTemplates: [
        {
          id: importFixtureIds.template,
          name: "Template",
          description: "Template description",
          sourcePromptAssetId: importFixtureIds.asset,
          sourcePromptVersionId: importFixtureIds.version,
          scenario: "feature",
          targetAgent: "codex",
          templateBody: "{{objective}}",
          createdAt: 20,
          updatedAt: 21,
        },
      ],
      promptQualityReviews: [
        {
          id: importFixtureIds.review,
          promptVersionId: importFixtureIds.version,
          source: "prompt_version",
          reviewMode: "local",
          overallScore: 91,
          grade: "excellent",
          ...rawReviewTexts,
          scoreExplanation: "Exact raw review",
          improvedPromptDraft: null,
          createdAt: 22,
        },
      ],
    },
  })
  if (envelope.backupType !== "full") {
    throw new TypeError("Expected a full fixture")
  }
  return envelope
}

export function importEnvelope(backupType: BackupType): BackupEnvelope {
  const full = fullImportEnvelope()
  switch (backupType) {
    case "full":
      return full
    case "project":
      return backupEnvelopeSchema.parse({
        ...full,
        backupType,
        data: {
          projects: full.data.projects,
          promptAssets: full.data.promptAssets,
          promptVersions: full.data.promptVersions,
          tags: full.data.tags,
          promptTags: full.data.promptTags,
          projectContextProfiles: full.data.projectContextProfiles,
          promptTemplates: full.data.promptTemplates,
          promptQualityReviews: full.data.promptQualityReviews,
        },
      })
    case "prompt_assets":
      return backupEnvelopeSchema.parse({
        ...full,
        backupType,
        data: {
          promptAssets: full.data.promptAssets,
          promptVersions: full.data.promptVersions,
          tags: full.data.tags,
          promptTags: full.data.promptTags,
          promptQualityReviews: full.data.promptQualityReviews,
        },
      })
    case "prompt_templates":
      return backupEnvelopeSchema.parse({
        ...full,
        backupType,
        data: { promptTemplates: full.data.promptTemplates },
      })
    case "harness_templates":
      return backupEnvelopeSchema.parse({
        ...full,
        backupType,
        data: { harnessTemplates: full.data.harnessTemplates },
      })
    default:
      throw new TypeError(`Unsupported fixture backup type: ${backupType}`)
  }
}

export function projectEnvelopeWithExternalLineage(): BackupEnvelope {
  const project = importEnvelope("project")
  if (project.backupType !== "project") {
    throw new TypeError("Expected a project fixture")
  }
  const asset = project.data.promptAssets[0]
  if (asset === undefined) {
    throw new TypeError("Expected a project prompt asset fixture")
  }
  return backupEnvelopeSchema.parse({
    ...project,
    data: {
      ...project.data,
      promptAssets: [
        {
          ...asset,
          parentPromptId: importFixtureIds.externalAsset,
          parentPromptVersionId: importFixtureIds.externalVersion,
          derivationType: "derived",
        },
      ],
    },
  })
}

export function fullEnvelopeWithMissingCurrentVersion(): BackupEnvelope {
  const full = fullImportEnvelope()
  const asset = full.data.promptAssets[0]
  if (asset === undefined) {
    throw new TypeError("Expected a full prompt asset fixture")
  }
  return backupEnvelopeSchema.parse({
    ...full,
    data: {
      ...full.data,
      promptAssets: [{ ...asset, currentVersionId: importFixtureIds.externalVersion }],
    },
  })
}
