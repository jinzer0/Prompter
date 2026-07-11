import type { ProjectContextProfile } from "../../../electron/ipc-types"
import { SidebarItem } from "./shell/sidebar-item"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { EmptyState } from "./ui/empty-state"

type ProjectContextProfileSidebarSectionProps = {
  readonly error: string | null
  readonly profiles: readonly ProjectContextProfile[]
  readonly selectedProfileId: string | null
  readonly status: "idle" | "loading" | "ready" | "error"
  readonly onCreateDefault: () => void
  readonly onDuplicateSelected: () => void
  readonly onNewProfile: () => void
  readonly onRequestDelete: () => void
  readonly onSelectProfile: (id: string) => void
  readonly onSetDefaultSelected: () => void
}

function formatUpdatedAt(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 16).replace("T", " ")
}

function previewText(value: string | null): string {
  const trimmed = value?.trim() ?? ""
  return trimmed.length > 0 ? trimmed : "No entry"
}

export function ProjectContextProfileSidebarSection({
  error,
  profiles,
  selectedProfileId,
  status,
  onCreateDefault,
  onDuplicateSelected,
  onNewProfile,
  onRequestDelete,
  onSelectProfile,
  onSetDefaultSelected,
}: ProjectContextProfileSidebarSectionProps) {
  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? null
  const hasSelection = selectedProfile !== null
  const canSetDefault = selectedProfile !== null && !selectedProfile.isDefault

  return (
    <section className="space-y-3" aria-labelledby="context-profiles-heading">
      <div className="flex items-center justify-between gap-2">
        <h2
          id="context-profiles-heading"
          className="text-[16px] font-semibold text-foreground"
          tabIndex={-1}
        >
          Context Profiles
        </h2>
        <Button aria-label="New Context Profile" variant="ghost" size="sm" onClick={onNewProfile}>
          New
        </Button>
      </div>

      <div className="space-y-2 rounded-card border border-border bg-panel-muted p-3">
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={!hasSelection}
            aria-label="Duplicate Context Profile"
            onClick={onDuplicateSelected}
          >
            Duplicate
          </Button>
          <Button
            aria-label="Delete Context Profile"
            size="sm"
            variant="ghost"
            disabled={!hasSelection}
            onClick={onRequestDelete}
          >
            Delete
          </Button>
        </div>
        <Button
          className="w-full"
          size="sm"
          variant="secondary"
          disabled={!canSetDefault}
          aria-label="Set Default Context Profile"
          onClick={onSetDefaultSelected}
        >
          Set Default
        </Button>
      </div>

      <div className="space-y-1">
        {status === "loading" && <p className="text-[12px] text-muted">Loading profiles...</p>}
        {status === "error" && <p className="text-[12px] text-muted-strong">{error}</p>}
        {profiles.map((profile) => {
          const updatedAt = formatUpdatedAt(profile.updatedAt)
          const isSelected = profile.id === selectedProfileId

          return (
            <SidebarItem
              key={profile.id}
              aria-current={isSelected ? "page" : undefined}
              aria-label={`${profile.name}, Updated ${updatedAt}`}
              className="min-h-20 items-start gap-2 overflow-hidden py-2"
              variant={isSelected ? "active" : "default"}
              onClick={() => onSelectProfile(profile.id)}
            >
              <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
                <span className="flex max-w-full items-center gap-2">
                  <span className="truncate">{profile.name}</span>
                  {profile.isDefault && <Badge variant="accent">Default</Badge>}
                </span>
                <span className="max-w-full truncate text-[11px] font-normal text-muted">
                  Summary: {previewText(profile.summary)}
                </span>
                <span className="max-w-full truncate text-[11px] font-normal text-muted">
                  Stack: {previewText(profile.techStack)}
                </span>
                <span className="font-mono text-[11px] font-normal text-muted">
                  Updated {updatedAt}
                </span>
              </span>
            </SidebarItem>
          )
        })}
      </div>

      {status === "ready" && profiles.length === 0 && (
        <div className="space-y-2">
          <EmptyState
            title="컨텍스트 프로파일이 없습니다"
            description="Create an explicit profile for project-specific compiler context."
          />
          <Button className="w-full" variant="secondary" onClick={onCreateDefault}>
            Default Context 만들기
          </Button>
        </div>
      )}
    </section>
  )
}
