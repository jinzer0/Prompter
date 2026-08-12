import type { AppLockGuard } from "../app-lock/app-lock-guard.js"
import type {
  HarnessTemplate,
  PrivacySettings,
  ProjectContextCompilerBuildResult,
  PromptAsset,
  PromptVersion,
  SettingsDefaults,
} from "../ipc-types.js"
import type { PrivacyConfirmationSessionStore } from "../privacy/privacy-confirmation-session-store.js"
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
  readonly privacyConfirmationSessions?: PrivacyConfirmationSessionStore
  readonly appLockGuard?: AppLockGuard
}

export type LLMServices = PromptCompilerService &
  PromptQualityService & {
    readonly privacyGuard: PrivacyGuardService
  }

export function createLLMServices(config: LLMServicesConfig): LLMServices {
  const privacyGuard = createPrivacyGuardService({
    getPrivacySettings: config.getPrivacySettings,
    ...(config.privacyConfirmationSessions === undefined
      ? {}
      : { sessions: config.privacyConfirmationSessions }),
  })
  const promptQuality = createPromptQualityService({
    getPromptAsset: config.getPromptAsset,
    getPromptVersion: config.getPromptVersion,
    getOpenAIKeyForMainProcessOnly: config.getOpenAIKeyForMainProcessOnly,
    privacyGuard,
    reviews: config.reviews,
    ...(config.appLockGuard === undefined ? {} : { appLockGuard: config.appLockGuard }),
  })
  const promptCompilerConfig: PromptCompilerServiceConfig =
    config.promptCompilerClientFactory === undefined
      ? {
          getDefaults: config.getDefaults,
          getOpenAIKeyForMainProcessOnly: config.getOpenAIKeyForMainProcessOnly,
          getHarnessTemplate: config.getHarnessTemplate,
          getProjectContextProfileForCompiler: config.getProjectContextProfileForCompiler,
          privacyGuard,
          ...(config.appLockGuard === undefined ? {} : { appLockGuard: config.appLockGuard }),
        }
      : {
          getDefaults: config.getDefaults,
          getOpenAIKeyForMainProcessOnly: config.getOpenAIKeyForMainProcessOnly,
          getHarnessTemplate: config.getHarnessTemplate,
          getProjectContextProfileForCompiler: config.getProjectContextProfileForCompiler,
          createClient: config.promptCompilerClientFactory,
          privacyGuard,
          ...(config.appLockGuard === undefined ? {} : { appLockGuard: config.appLockGuard }),
        }

  return {
    privacyGuard,
    ...createPromptCompilerService(promptCompilerConfig),
    ...promptQuality,
  }
}
