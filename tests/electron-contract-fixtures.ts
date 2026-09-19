import type {
  PromptLineage,
  PromptLineageSummary,
  PromptQualityLLMReviewResult,
  PromptQualityReviewResult,
  PromptQualityReviewSnapshot,
} from "../electron/ipc-types"
import { validProjectId, validPromptAssetId } from "./electron-contract-helpers"

export const validPromptVersionId = "22222222-2222-4222-8222-222222222222"
export const comparePromptVersionId = "33333333-3333-4333-8333-333333333333"
export const promptAssetResponse = {
  id: validPromptAssetId,
  projectId: null,
  title: "Versioned Prompt",
  scenario: "feature",
  targetAgent: "codex",
  currentVersionId: validPromptVersionId,
  parentPromptId: null,
  parentPromptVersionId: null,
  derivationType: null,
  createdAt: 1,
  updatedAt: 2,
} as const
export const promptVersionResponse = {
  id: validPromptVersionId,
  promptAssetId: validPromptAssetId,
  versionNumber: 1,
  originalInput: "Original request",
  compiledPrompt: "Compiled prompt",
  assumptions: null,
  questions: null,
  answers: null,
  acceptanceCriteria: null,
  validationCommands: null,
  qualityScore: null,
  createdAt: 1,
} as const
export const compareVersionResponse = {
  ...promptVersionResponse,
  id: comparePromptVersionId,
  versionNumber: 2,
  compiledPrompt: "Compiled prompt\nwith changes",
} as const
export const promptAssetVersionResponse = {
  asset: promptAssetResponse,
  version: promptVersionResponse,
} as const
export const promptLineageChild = {
  promptAssetId: validPromptAssetId,
  promptVersionId: validPromptVersionId,
  title: "Derived Child",
  versionNumber: 1,
  derivationType: "derived",
} satisfies PromptLineageSummary
export const promptLineageResponse = {
  parent: null,
  children: [promptLineageChild],
} satisfies PromptLineage
export const promptTemplateResponse = {
  id: "55555555-5555-4555-8555-555555555555",
  name: "Feature Template",
  description: null,
  sourcePromptAssetId: null,
  sourcePromptVersionId: null,
  scenario: "feature",
  targetAgent: "codex",
  templateBody: "# Objective\n{{objective}}",
  createdAt: 1,
  updatedAt: 2,
} as const
export const createPromptWithInitialVersionInput = {
  projectId: validProjectId,
  title: "Atomic Prompt",
  scenario: "feature",
  targetAgent: "codex",
  originalInput: "Create an atomic prompt.",
  compiledPrompt: "# Objective\nCreate an atomic prompt.",
} as const
export const createDerivedPromptAssetInput = {
  sourcePromptAssetId: validPromptAssetId,
  sourcePromptVersionId: validPromptVersionId,
  title: "Derived Prompt",
  originalInput: "Derive this prompt.",
  compiledPrompt: "# Objective\nDerive this prompt.",
} as const
export const createPromptTemplateInput = {
  name: "Feature Template",
  description: null,
  scenario: "feature",
  targetAgent: "codex",
  templateBody: "# Objective\n{{objective}}",
} as const
export const createPromptTemplateFromVersionInput = {
  sourcePromptAssetId: validPromptAssetId,
  sourcePromptVersionId: validPromptVersionId,
  name: "Version Template",
  description: null,
  templateBody: "# Objective\n{{objective}}",
} as const
export const promptQualitySnapshot = {
  compiledPrompt: "# Objective\n\nDefine the expected change.",
  originalInput: "Improve the prompt instructions.",
  scenario: "feature",
  targetAgent: "codex",
  harnessTemplateId: null,
  projectContextProfileId: null,
  includeProjectContextProfile: false,
  projectContext: null,
  constraints: "Preserve the existing public contract.",
  acceptanceCriteria: "The new behavior is covered by tests.",
  validationCommands: "npm test",
} satisfies PromptQualityReviewSnapshot
export const promptQualityReviewResponse = {
  id: "33333333-3333-4333-8333-333333333333",
  source: "prompt_version",
  promptVersionId: validPromptVersionId,
  reviewMode: "local",
  overallScore: 82,
  grade: "good",
  dimensionScores: {
    clarity: 88,
    context: 78,
    scope: 84,
    constraints: 81,
    acceptanceCriteria: 85,
    validation: 76,
    safety: 90,
    ambiguityRisk: 20,
  },
  strengths: ["The objective is explicit."],
  issues: [],
  suggestions: [],
  missingSections: [],
  warnings: [],
  recommendedClarifyingQuestions: [],
  scoreExplanation: "The prompt is clear but needs focused validation guidance.",
  snapshot: promptQualitySnapshot,
  createdAt: 1,
  improvedPromptDraft: null,
} satisfies PromptQualityReviewResult
export const draftPromptQualityReviewResponse = {
  ...promptQualityReviewResponse,
  id: null,
  source: "draft",
  promptVersionId: null,
} satisfies PromptQualityReviewResult
export const unavailableLLMReviewResponse = {
  ok: false,
  code: "llm_review_unavailable",
  message: "LLM prompt review is not available yet. Use local review instead.",
} satisfies PromptQualityLLMReviewResult
export const validHarnessTemplateId = "44444444-4444-4444-8444-444444444444"
export const harnessTemplateResponse = {
  id: validHarnessTemplateId,
  name: "Feature Harness",
  scenario: "feature",
  targetAgent: "generic_agent",
  templateBody: "  Keep exact body whitespace.  \n",
  requiredFields: null,
  clarificationPolicy: null,
  createdAt: 1,
  updatedAt: 2,
} as const
