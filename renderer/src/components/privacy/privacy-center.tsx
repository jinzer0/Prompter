import { type UsePrivacyScanResult, usePrivacyScan } from "../../hooks/use-privacy-scan"
import { type UsePrivacySettingsResult, usePrivacySettings } from "../../hooks/use-privacy-settings"
import { Panel } from "../shell/panel"
import { Button } from "../ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { PrivacyScanPanel } from "./privacy-scan-panel"
import { PrivacySettingsPanelView } from "./privacy-settings-panel"
import type { SensitiveFindingNavigationHandler } from "./sensitive-finding-list"

type PrivacyCenterProps = {
  readonly onBackToLibrary: () => void
  readonly onNavigate: SensitiveFindingNavigationHandler
}

type LibraryPrivacyScanInput = {
  readonly projectId?: string
}

export type PrivacyCenterViewProps = PrivacyCenterProps & {
  readonly scan: UsePrivacyScanResult<LibraryPrivacyScanInput>
  readonly settings: UsePrivacySettingsResult
}

const privacyGuidance = [
  {
    title: "Backup protection",
    description:
      "Plaintext backups are the default export format. Encrypted backups are available, but a lost password has no recovery option.",
  },
  {
    title: "Secret isolation",
    description:
      "The OpenAI API key stays in the main-process secret store and is excluded from backups and renderer scan results.",
  },
  {
    title: "Scan boundaries",
    description:
      "Scans are local-only and manual. They never redact, delete, edit, upload, or automatically fix library content, and pattern matches can be possible false positives.",
  },
] as const

export function PrivacyCenterView({
  onBackToLibrary,
  onNavigate,
  scan,
  settings,
}: PrivacyCenterViewProps) {
  return (
    <Panel headingId="privacy-center-heading" className="h-full min-h-0 gap-4 overflow-auto">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            Local privacy controls
          </p>
          <h2 id="privacy-center-heading" className="mt-1 text-[24px] font-medium text-foreground">
            Privacy Center
          </h2>
          <p className="mt-1 text-[12px] leading-5 text-muted">
            Review masked signals and warning gates without changing saved prompts or drafts.
          </p>
        </div>
        <Button variant="secondary" onClick={onBackToLibrary}>
          Back to library
        </Button>
      </header>

      <div className="grid gap-3 xl:grid-cols-3">
        {privacyGuidance.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <PrivacyScanPanel
        description="Inspect the saved local library only when requested. Results are transient, masked, and grouped by entity."
        headingId="privacy-library-scan-heading"
        onNavigate={onNavigate}
        onScan={() => void scan.run({})}
        scanDisabled={!settings.settings.enableLibraryScan}
        scanDisabledReason="Enable manual library scans in Privacy settings to use this action."
        scanLabel="Scan library now"
        state={scan.state}
        title="Library privacy scan"
      />

      <PrivacySettingsPanelView controller={settings} />
    </Panel>
  )
}

export function PrivacyCenter(props: PrivacyCenterProps) {
  const scan = usePrivacyScan((input: LibraryPrivacyScanInput) =>
    window.prompter.privacy.scanLibrary(input),
  )
  const settings = usePrivacySettings(window.prompter.privacy)
  return <PrivacyCenterView {...props} scan={scan} settings={settings} />
}
