import { describe, expect, it } from "vitest"

import type { SettingsDefaults } from "../electron/ipc-types"
import { createCompilerDefaultsLoader } from "../renderer/src/hooks/use-compiler-defaults"
import {
  type CompilerDefaultRoutingPatch,
  type CompilerRoutingFields,
  createCompilerRoutingFieldAuthorship,
} from "../renderer/src/lib/prompt-compiler/routing-field-authorship"
import { createDeferred } from "./phase18-insights-renderer-fixtures"

const settingsDefaults = {
  defaultModel: "gpt-4.1",
  defaultTargetAgent: "cursor",
  defaultProjectId: null,
  defaultScenario: "research",
  appTheme: "system",
  compilerDefaultLanguage: "ko",
} satisfies SettingsDefaults

const initialRoutingFields = {
  scenario: "feature",
  targetAgent: "codex",
} satisfies CompilerRoutingFields

function createDeferredDefaultsRequest() {
  const authorship = createCompilerRoutingFieldAuthorship()
  const response = createDeferred<SettingsDefaults>()
  const patches: CompilerDefaultRoutingPatch[] = []
  const messages: (string | null)[] = []
  const loader = createCompilerDefaultsLoader({
    applyDefaultRoutingPatch: (patch) => patches.push(patch),
    getDefaults: () => response.promise,
    getRoutingFieldGenerations: authorship.current,
    setMessage: (message) => messages.push(message),
  })

  return { authorship, loader, messages, patches, response }
}

describe("compiler defaults authored routing fields", () => {
  it("initializes both fields when neither field changes before a deferred response", async () => {
    // Given: both routing fields are still untouched when settings begin loading.
    const request = createDeferredDefaultsRequest()
    const loading = request.loader.loadDefaults()
    // When: the settings bridge resolves.
    request.response.resolve(settingsDefaults)
    await loading
    // Then: both untouched fields receive their defaults.
    expect(request.patches).toEqual([
      {
        scenario: settingsDefaults.defaultScenario,
        targetAgent: settingsDefaults.defaultTargetAgent,
      },
    ])
  })

  it("preserves an edited scenario while initializing its untouched target agent", async () => {
    // Given: only scenario changes before the settings response arrives.
    const request = createDeferredDefaultsRequest()
    const loading = request.loader.loadDefaults()
    request.authorship.markChanged(initialRoutingFields, {
      ...initialRoutingFields,
      scenario: "bugfix",
    })
    // When: the settings bridge resolves.
    request.response.resolve(settingsDefaults)
    await loading
    // Then: only the untouched target agent receives a default.
    expect(request.patches).toEqual([{ targetAgent: settingsDefaults.defaultTargetAgent }])
  })

  it("preserves an edited target agent while initializing its untouched scenario", async () => {
    // Given: only target agent changes before the settings response arrives.
    const request = createDeferredDefaultsRequest()
    const loading = request.loader.loadDefaults()
    request.authorship.markChanged(initialRoutingFields, {
      ...initialRoutingFields,
      targetAgent: "claude_code",
    })
    // When: the settings bridge resolves.
    request.response.resolve(settingsDefaults)
    await loading
    // Then: only the untouched scenario receives a default.
    expect(request.patches).toEqual([{ scenario: settingsDefaults.defaultScenario }])
  })

  it("does not apply defaults when both routing fields change before a deferred response", async () => {
    // Given: both routing fields change before the settings response arrives.
    const request = createDeferredDefaultsRequest()
    const loading = request.loader.loadDefaults()
    request.authorship.markChanged(initialRoutingFields, {
      scenario: "docs",
      targetAgent: "generic_agent",
    })
    // When: the settings bridge resolves.
    request.response.resolve(settingsDefaults)
    await loading
    // Then: neither authored field receives a default patch.
    expect(request.patches).toEqual([])
  })

  it("freezes preserved routing fields even when their values equal the initial defaults", async () => {
    // Given: an Insights preservation transition occurs before defaults return.
    const request = createDeferredDefaultsRequest()
    const loading = request.loader.loadDefaults()
    request.authorship.markAllAuthored()
    // When: settings return values equal to the draft's initial routing fields.
    request.response.resolve({
      ...settingsDefaults,
      defaultScenario: initialRoutingFields.scenario,
      defaultTargetAgent: initialRoutingFields.targetAgent,
    })
    await loading
    // Then: authorship, not value equality, prevents the stale patch.
    expect(request.patches).toEqual([])
  })

  it("freezes both fields when a derived draft seeds routing fields before defaults return", async () => {
    // Given: derivation seeds both routing fields while settings remain deferred.
    const request = createDeferredDefaultsRequest()
    const loading = request.loader.loadDefaults()
    request.authorship.markAllAuthored()
    // When: the settings bridge resolves after the derived seed.
    request.response.resolve(settingsDefaults)
    await loading
    // Then: neither derived field is replaced by defaults.
    expect(request.patches).toEqual([])
  })

  it("ignores a deferred response after the defaults owner unmounts", async () => {
    // Given: settings are loading while the compiler defaults owner is still mounted.
    const request = createDeferredDefaultsRequest()
    const loading = request.loader.loadDefaults()
    request.loader.dispose()
    // When: the deferred bridge response arrives after unmount.
    request.response.resolve(settingsDefaults)
    await loading
    // Then: neither state nor status is changed after disposal.
    expect(request.patches).toEqual([])
    expect(request.messages).toEqual([])
  })
})
