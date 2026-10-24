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
    <Panel
      headingId="privacy-center-heading"
      className="h-full min-h-0 gap-5 overflow-auto bg-shell p-6 [overflow-wrap:anywhere] [&>*]:mx-auto [&>*]:w-full [&>*]:max-w-[740px] [&>*]:shrink-0"
    >
      <header className="flex flex-wrap items-start justify-between gap-4 py-2">
        <div className="min-w-0 flex-1 basis-80">
          <p className="text-[12px] font-medium text-muted">Local privacy controls</p>
          <h2
            id="privacy-center-heading"
            className="mt-1 text-[23px] font-semibold tracking-[-0.035em] text-foreground"
          >
            Privacy Center
          </h2>
          <p className="mt-2 text-[14px] leading-6 text-muted">
            Review masked signals and warning gates without changing saved prompts or drafts.
          </p>
        </div>
        <Button variant="secondary" onClick={onBackToLibrary}>
          Back to library
        </Button>
      </header>

      <Card className="min-w-0 px-5">
        {privacyGuidance.map((item) => (
          <CardHeader
            key={item.title}
            className="border-b border-border-subtle px-0 py-4 last:border-b-0"
          >
            <CardTitle>{item.title}</CardTitle>
            <CardDescription>{item.description}</CardDescription>
          </CardHeader>
        ))}
      </Card>

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
