import type {
  HarnessTemplate,
  PrivacySettings,
  ProjectContextCompilerBuildResult,
  PromptAsset,
  PromptVersion,
  SettingsDefaults,
} from "../ipc-types.js"
import {
  createPrivacyGuardService,
  type PrivacyGuardService,
} from "../privacy/privacy-guard-service.js"
import {
  createPromptCompilerService,
  type PromptCompilerClientFactory,
  type PromptCompilerService,
  type PromptCompilerServiceConfig,
} from "../prompt-compiler/prompt-compiler-service.js"
import {
  createPromptQualityService,
  type PromptQualityService,
} from "../prompt-quality/prompt-quality-service.js"
import type { PromptQualityReviewRepository } from "./repositories/prompt-quality-reviews.js"

type LLMServicesConfig = {
  readonly getDefaults: () => SettingsDefaults
  readonly getHarnessTemplate: (id: string) => HarnessTemplate | null
  readonly getOpenAIKeyForMainProcessOnly: () => Promise<string | null>
  readonly getPrivacySettings: () => PrivacySettings
  readonly getProjectContextProfileForCompiler: (input: {
    readonly projectId: string
    readonly profileId: string
  }) => ProjectContextCompilerBuildResult
  readonly getPromptAsset: (id: string) => PromptAsset | null
  readonly getPromptVersion: (id: string) => PromptVersion | null
  readonly promptCompilerClientFactory?: PromptCompilerClientFactory
  readonly reviews: PromptQualityReviewRepository
}

export type LLMServices = PromptCompilerService &
  PromptQualityService & {
    readonly privacyGuard: PrivacyGuardService
  }

export function createLLMServices(config: LLMServicesConfig): LLMServices {
  const privacyGuard = createPrivacyGuardService({
    getPrivacySettings: config.getPrivacySettings,
  })
  const promptQuality = createPromptQualityService({
    getPromptAsset: config.getPromptAsset,
    getPromptVersion: config.getPromptVersion,
    getOpenAIKeyForMainProcessOnly: config.getOpenAIKeyForMainProcessOnly,
    privacyGuard,
    reviews: config.reviews,
  })
  const promptCompilerConfig: PromptCompilerServiceConfig =
    config.promptCompilerClientFactory === undefined
      ? {
          getDefaults: config.getDefaults,
          getOpenAIKeyForMainProcessOnly: config.getOpenAIKeyForMainProcessOnly,
          getHarnessTemplate: config.getHarnessTemplate,
          getProjectContextProfileForCompiler: config.getProjectContextProfileForCompiler,
          privacyGuard,
        }
      : {
          getDefaults: config.getDefaults,
          getOpenAIKeyForMainProcessOnly: config.getOpenAIKeyForMainProcessOnly,
          getHarnessTemplate: config.getHarnessTemplate,
          getProjectContextProfileForCompiler: config.getProjectContextProfileForCompiler,
          createClient: config.promptCompilerClientFactory,
          privacyGuard,
        }

  return {
    privacyGuard,
    ...createPromptCompilerService(promptCompilerConfig),
    ...promptQuality,
  }
}
