import type {
  ProjectContextCompilerBuildResult,
  ProjectContextProfile,
} from "../../../electron/ipc-types"
import type { CompilerProjectContextPreviewStatus } from "../hooks/use-compiler-project-context"
import type { ProjectContextProfilesStatus } from "../hooks/use-project-context-profiles"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Select } from "./ui/select"

type ProjectContextProfileSelectorProps = {
  readonly error: string | null
  readonly includeProjectContextProfile: boolean
  readonly preview: ProjectContextCompilerBuildResult | null
  readonly previewError: string | null
  readonly previewStatus: CompilerProjectContextPreviewStatus
  readonly profiles: readonly ProjectContextProfile[]
  readonly projectName: string | null
  readonly selectedProfileId: string | null
  readonly status: ProjectContextProfilesStatus
  readonly onIncludeChange: (include: boolean) => void
  readonly onManageProfiles: () => void
  readonly onSelectProfile: (id: string | null) => void
}

function previewText(preview: ProjectContextCompilerBuildResult | null): string | null {
  const context = preview?.context?.trim() ?? ""
  return context.length > 0 ? context : null
}

export function ProjectContextProfileSelector({
  error,
  includeProjectContextProfile,
  preview,
  previewError,
  previewStatus,
  profiles,
  projectName,
  selectedProfileId,
  status,
  onIncludeChange,
  onManageProfiles,
  onSelectProfile,
}: ProjectContextProfileSelectorProps) {
  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? null
  const selectedPreview = previewText(preview)
  const isSelectionDisabled = projectName === null || status === "loading" || profiles.length === 0
  const canInclude = selectedProfile !== null

  return (
    <section className="space-y-2 rounded-card border border-border bg-panel-muted p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[12px] font-medium text-muted-strong">Project context profile</p>
          <p className="truncate text-[12px] text-muted">
            Current project: {projectName ?? "Select a project"}
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={onManageProfiles}>
          프로파일 편집
        </Button>
      </div>

      <div className="space-y-1">
        <label
          className="text-[12px] font-medium text-muted-strong"
          htmlFor="project-context-profile"
        >
          Context profile
        </label>
        <Select
          id="project-context-profile"
          aria-label="Project context profile"
          disabled={isSelectionDisabled}
          value={selectedProfileId ?? ""}
          onChange={(event) => onSelectProfile(event.currentTarget.value || null)}
        >
          <option value="">No context profile</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.isDefault ? `${profile.name} (recommended)` : profile.name}
            </option>
          ))}
        </Select>
      </div>

      <label className="flex items-center gap-2 text-[12px] text-muted-strong">
        <input
          aria-label="Include project context profile"
          checked={includeProjectContextProfile && canInclude}
          className="size-4 rounded-control accent-accent"
          disabled={!canInclude}
          type="checkbox"
          onChange={(event) => onIncludeChange(event.currentTarget.checked)}
        />
        Include this profile in analyze/compile payloads
      </label>

      {selectedProfile?.isDefault === true && <Badge variant="accent">Recommended default</Badge>}
      {status === "loading" && <p className="text-[12px] text-muted">Loading profiles...</p>}
      {status === "ready" && projectName !== null && profiles.length === 0 && (
        <p className="text-[12px] text-muted">No context profiles for this project yet.</p>
      )}
      {status === "error" && <p className="text-[12px] text-muted-strong">{error}</p>}
      {previewStatus === "loading" && (
        <p className="text-[12px] text-muted">Resolving profile preview...</p>
      )}
      {previewStatus === "error" && <p className="text-[12px] text-muted-strong">{previewError}</p>}
      {previewStatus === "ready" && selectedPreview !== null && (
        <pre className="max-h-28 overflow-auto whitespace-pre-wrap rounded-control border border-border bg-panel-elevated p-3 font-mono text-[11px] leading-5 text-muted-strong">
          {selectedPreview}
        </pre>
      )}
      {preview?.warnings.map((warning) => (
        <p key={warning} className="text-[12px] text-muted-strong">
          {warning}
        </p>
      ))}
    </section>
  )
}
