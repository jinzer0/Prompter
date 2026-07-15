import { useId } from "react"
import type {
  BackupImportResult,
  BackupItemCounts,
  BackupValidationPreview,
  Project,
} from "../../../../electron/ipc-types"
import { Button } from "../ui/button"
import { Select } from "../ui/select"

const countLabels = {
  projects: "Projects",
  projectContextProfiles: "Profiles",
  promptAssets: "Prompts",
  promptVersions: "Versions",
  tags: "Tags",
  promptTags: "Prompt tags",
  harnessTemplates: "Harnesses",
  promptTemplates: "Prompt templates",
  promptQualityReviews: "Quality reviews",
} as const satisfies Record<keyof BackupItemCounts, string>

const countKeys = Object.keys(countLabels) as readonly (keyof BackupItemCounts)[]

export function backupTypeLabel(type: BackupValidationPreview["backupType"]): string {
  switch (type) {
    case "full":
      return "Full library backup"
    case "project":
      return "Project backup"
    case "prompt_assets":
      return "Prompt asset pack"
    case "prompt_templates":
      return "Prompt template pack"
    case "harness_templates":
      return "Harness template pack"
  }
}

export function CountGrid({ counts }: { readonly counts: BackupItemCounts }) {
  return (
    <dl className="grid grid-cols-2 gap-2">
      {countKeys.map((key) => (
        <div key={key} className="rounded-card border border-border bg-panel-muted p-2">
          <dt className="font-mono text-[11px] text-muted">{countLabels[key]}</dt>
          <dd className="mt-1 text-[13px] font-medium text-foreground">{counts[key]}</dd>
        </div>
      ))}
    </dl>
  )
}

export function BackupLedger({ preview }: { readonly preview: BackupValidationPreview }) {
  return (
    <div className="space-y-2">
      <p className="text-[12px] font-medium text-muted-strong">Import preview ledger</p>
      <ul className="space-y-2 text-[12px] leading-5 text-muted">
        {preview.consequences.map((item) => (
          <li key={item.code} className="rounded-card border border-border bg-panel-muted p-2">
            {item.message} <span className="font-mono text-muted-strong">({item.count})</span>
          </li>
        ))}
        {preview.conflicts.map((item) => (
          <li
            key={`${item.code}-${item.sourceId ?? item.message}`}
            className="rounded-card border border-border bg-panel-muted p-2"
          >
            {item.message} <span className="text-muted-strong">Resolution: {item.resolution}</span>
          </li>
        ))}
        {preview.warnings.map((item) => (
          <li
            key={`${item.code}-${item.sourceId ?? item.message}`}
            className="rounded-card border border-border bg-panel-muted p-2"
          >
            {item.message}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function DestinationSelector({
  destinationProjectId,
  disabled,
  onChange,
  projects,
}: {
  readonly destinationProjectId: string
  readonly disabled: boolean
  readonly onChange: (projectId: string) => void
  readonly projects: readonly Project[]
}) {
  const destinationSelectId = useId()

  return (
    <label className="grid gap-2" htmlFor={destinationSelectId}>
      <span className="font-mono text-[11px] text-muted">destination project required</span>
      <Select
        aria-label="Backup import destination project"
        disabled={disabled}
        id={destinationSelectId}
        value={destinationProjectId}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        <option value="">Choose a destination project...</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </Select>
    </label>
  )
}

export function ImportSummary({
  onViewImportedProject,
  result,
}: {
  readonly onViewImportedProject: (projectId: string) => void
  readonly result: BackupImportResult
}) {
  const importedProjectId = result.createdProjectIds[0] ?? null

  return (
    <div className="space-y-3 rounded-card border border-border bg-panel-muted p-3">
      <p className="text-[13px] font-medium text-foreground">Import complete</p>
      <p className="text-[12px] leading-5 text-muted-strong">{result.message}</p>
      <CountGrid counts={result.importedCounts} />
      {result.warnings.length > 0 && (
        <ul className="space-y-1 text-[12px] leading-5 text-muted">
          {result.warnings.map((warning) => (
            <li key={`${warning.code}-${warning.sourceId ?? warning.message}`}>
              {warning.message}
            </li>
          ))}
        </ul>
      )}
      {importedProjectId !== null && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => onViewImportedProject(importedProjectId)}
        >
          View imported project
        </Button>
      )}
    </div>
  )
}
