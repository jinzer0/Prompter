import type { SensitiveFinding } from "../../../electron/ipc-types"
import { usePrivacyScan } from "../hooks/use-privacy-scan"
import {
  type CompilerDraftPrivacyContent,
  scanCompilerDraftPrivacy,
} from "../lib/prompt-compiler/compiler-privacy-scan"
import { PrivacyScanPanel } from "./privacy/privacy-scan-panel"

type PromptCompilerPrivacyScanProps = {
  readonly content: CompilerDraftPrivacyContent
}

function navigateToFinding(location: SensitiveFinding["location"]): void {
  const target = Array.from(document.querySelectorAll<HTMLElement>("[data-privacy-field]")).find(
    (element) => element.dataset["privacyField"] === location.field,
  )
  target?.focus()
  target?.scrollIntoView({ block: "center" })
}

export function PromptCompilerPrivacyScan({ content }: PromptCompilerPrivacyScanProps) {
  const scan = usePrivacyScan((input: CompilerDraftPrivacyContent) =>
    scanCompilerDraftPrivacy(window.prompter.privacy, input),
  )

  return (
    <PrivacyScanPanel
      description="Inspect the current compiler draft and included context only when requested. Findings are masked and content stays unchanged."
      headingId="prompt-compiler-privacy-scan-heading"
      onNavigate={navigateToFinding}
      onScan={() => void scan.run(content)}
      state={scan.state}
      title="Sensitive information scan"
    />
  )
}
