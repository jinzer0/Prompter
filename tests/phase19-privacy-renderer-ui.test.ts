import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import type { SensitiveFinding, SensitiveScanResult } from "../electron/ipc-types"
import { CompiledPromptPreview } from "../renderer/src/components/compiled-prompt-preview"
import { PrivacyScanPanel } from "../renderer/src/components/privacy/privacy-scan-panel"
import { PrivacySettingsPanel } from "../renderer/src/components/privacy/privacy-settings-panel"
import {
  focusPrivacyDialog,
  handlePrivacyDialogKeyDown,
  PrivacyWarningDialog,
} from "../renderer/src/components/privacy/privacy-warning-dialog"
import { SensitiveFindingList } from "../renderer/src/components/privacy/sensitive-finding-list"
import { PromptCompilerForm } from "../renderer/src/components/prompt-compiler-form"
import { PromptCompilerPrivacyScan } from "../renderer/src/components/prompt-compiler-privacy-scan"
import { PromptExportActions } from "../renderer/src/components/prompt-export-actions"
import { emptyCompilerInput } from "../renderer/src/lib/prompt-compiler/llm-compiler-flow"

const finding = {
  id: "github-token-candidate",
  severity: "critical",
  category: "github_token",
  label: "GitHub token candidate",
  description: "A token-shaped value needs review.",
  location: {
    entityType: "prompt_version",
    entityId: "8f529b76-09d2-45ee-8f16-57910a1dfa26",
    field: "compiledPrompt",
    previewLabel: "Compiled prompt",
  },
  evidenceMasked: "github_pat_...wxyz",
  confidence: "high",
  recommendation: "Remove the token before sharing this prompt.",
} satisfies SensitiveFinding

const scanResult = {
  scannedAt: 1_000,
  source: "draft",
  findingCount: 1,
  criticalCount: 1,
  highCount: 0,
  mediumCount: 0,
  lowCount: 0,
  findings: [finding],
  safeToProceed: false,
  warnings: ["Critical findings require confirmation."],
} satisfies SensitiveScanResult

describe("Phase 19 privacy renderer UI", () => {
  it("renders the compiler sensitive-information action in an idle manual state", () => {
    // Given: current compiler content that has not been scanned.
    const content = {
      answers: {},
      draft: emptyCompilerInput,
      editablePrompt: "",
      includedProjectContext: null,
      selectedHarnessTemplate: null,
      selectedPromptTemplate: null,
    }

    // When: the compiler privacy surface renders without interaction.
    const markup = renderToStaticMarkup(createElement(PromptCompilerPrivacyScan, { content }))

    // Then: the visible action is available and no automatic scan state appears.
    expect(markup).toContain("Sensitive information scan")
    expect(markup).toContain("Run privacy scan")
    expect(markup).toContain("No scan has run")
    expect(markup).not.toContain("Scanning requested content")
  })

  it("keeps the clear-content export UX passive and disabled", () => {
    // Given: the existing export card with no source content.
    // When: it renders without any user action.
    const markup = renderToStaticMarkup(
      createElement(PromptExportActions, {
        canSaveToFile: true,
        copyButtonLabel: "Copy export",
        exportBase: null,
        formatLabel: "Export format",
        rawContent: "",
        saveButtonLabel: "Save export",
        saveDisabledDescriptionId: null,
        title: "Prompt export",
      }),
    )

    // Then: preview, copy, and save stay disabled without scanning or side effects.
    expect(markup.match(/disabled=""/g)?.length).toBe(3)
    expect(markup).not.toContain("Sensitive content needs review")
  })

  it("marks every navigable compiler text field with stable privacy identities", () => {
    // Given: the compiler form and editable output preview.
    const draft = { ...emptyCompilerInput, originalInput: "Draft" }

    // When: both surfaces render without interaction.
    const markup = renderToStaticMarkup(
      createElement("div", null, [
        createElement(PromptCompilerForm, {
          key: "form",
          draft,
          onChange: () => undefined,
        }),
        createElement(CompiledPromptPreview, {
          key: "output",
          canEditOutput: true,
          guardDescriptionId: "guard",
          value: "Compiled",
          onChange: () => undefined,
        }),
      ]),
    )

    // Then: scan findings can navigate to every base draft field and editable output.
    for (const field of [
      "originalInput",
      "projectContext",
      "techStack",
      "constraints",
      "acceptanceCriteria",
      "validationCommands",
      "additionalNotes",
      "compiledPrompt",
    ]) {
      expect(markup).toContain(`data-privacy-field="${field}"`)
    }
  })

  it("renders masked finding metadata and a navigation action without raw text", () => {
    // Given: one renderer-safe masked finding.
    // When: the finding list renders with navigation enabled.
    const markup = renderToStaticMarkup(
      createElement(SensitiveFindingList, {
        findings: [finding],
        onNavigate: () => undefined,
      }),
    )

    // Then: every review field is visible and no raw secret field exists.
    expect(markup).toContain("Critical severity")
    expect(markup).toContain("GitHub token")
    expect(markup).toContain("prompt version")
    expect(markup).toContain("compiledPrompt")
    expect(markup).toContain("github_pat_...wxyz")
    expect(markup).toContain("Remove the token before sharing this prompt.")
    expect(markup).toContain("Open finding location")
    expect(markup).not.toMatch(/rawEvidence|matchedValue|github_pat_raw_secret/)
  })

  it("renders every manual scan state without starting work during render", () => {
    // Given: idle, scanning, ready, and error scan states with a scan observer.
    const onScan = vi.fn<() => void>()
    const states = [
      { kind: "idle" },
      { kind: "scanning" },
      { kind: "ready", result: scanResult },
      { kind: "error", message: "Privacy scan could not be completed." },
    ] as const

    // When: each state is rendered without interaction.
    const markup = states.map((state) =>
      renderToStaticMarkup(
        createElement(PrivacyScanPanel, {
          description: "Inspect this content only when requested.",
          headingId: `privacy-scan-${state.kind}`,
          onScan,
          state,
          title: "Draft privacy scan",
        }),
      ),
    )

    // Then: render is passive and each state has an explicit accessible surface.
    expect(onScan).not.toHaveBeenCalled()
    expect(markup[0]).toContain("Run privacy scan")
    expect(markup[1]).toContain('role="status"')
    expect(markup[2]).toContain("github_pat_...wxyz")
    expect(markup[3]).toContain('role="alert"')
  })

  it("renders a labelled modal alertdialog with safe initial cancellation", () => {
    // Given: a confirmation-required privacy warning.
    // When: the warning dialog renders.
    const markup = renderToStaticMarkup(
      createElement(PrivacyWarningDialog, {
        confirmLabel: "Continue copying",
        onCancel: () => undefined,
        onConfirm: async () => undefined,
        state: { kind: "confirmation_required", scanResult },
      }),
    )

    // Then: the dialog is labelled, described, modal, and exposes both decisions.
    expect(markup).toContain('role="alertdialog"')
    expect(markup).toContain('aria-modal="true"')
    expect(markup).toContain('aria-labelledby="privacy-warning-title"')
    expect(markup).toContain('aria-describedby="privacy-warning-description"')
    expect(markup).toContain("Cancel and review")
    expect(markup).toContain("1 finding(s)")
    expect(markup).toContain("1 critical")
    expect(markup).toContain("GitHub token")
    expect(markup).toContain("github_pat_...wxyz")
    expect(markup).toContain("Continue copying")
  })

  it("uses Escape as cancel and restores the previously focused control", () => {
    // Given: focus observers and an Escape keyboard event.
    const initialFocus = { focus: vi.fn<() => void>() }
    const restoreFocus = { focus: vi.fn<() => void>() }
    const restore = focusPrivacyDialog({ initialFocus, restoreFocus })
    const preventDefault = vi.fn<() => void>()
    const onCancel = vi.fn<() => void>()

    // When: Escape is handled and the dialog cleanup runs.
    handlePrivacyDialogKeyDown({ event: { key: "Escape", preventDefault }, onCancel })
    restore()

    // Then: safe cancellation and focus lifecycle match the button path.
    expect(initialFocus.focus).toHaveBeenCalledTimes(1)
    expect(preventDefault).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(restoreFocus.focus).toHaveBeenCalledTimes(1)
  })

  it("renders safe privacy defaults disabled until a bridge is injected", () => {
    // Given: no runtime privacy bridge wiring.
    // When: the standalone settings panel renders.
    const markup = renderToStaticMarkup(createElement(PrivacySettingsPanel, { bridge: null }))

    // Then: safe controls are enabled by default while persistence stays unavailable.
    expect(markup).toContain("Warn before LLM requests")
    expect(markup).toContain("Warn before exports")
    expect(markup).toContain("Warn before backups")
    expect(markup).toContain("Enable manual library scans")
    expect(markup.match(/checked=""/g)?.length ?? 0).toBe(4)
    expect(markup).toContain("Save privacy settings")
    expect(markup).toContain('disabled=""')
  })
})
