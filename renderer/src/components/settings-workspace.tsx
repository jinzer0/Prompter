import type { ComponentProps } from "react"

import { SettingsPanel } from "./settings-panel"
import { Button } from "./ui/button"

type SettingsWorkspaceProps = ComponentProps<typeof SettingsPanel> & {
  readonly active: boolean
  readonly onBackToLibrary: () => void
  readonly onOpenPrivacy: () => void
}

export function SettingsWorkspace({
  active,
  onBackToLibrary,
  onOpenPrivacy,
  ...props
}: SettingsWorkspaceProps) {
  return (
    <section
      hidden={!active}
      data-testid="settings-workspace"
      aria-label="설정 작업 공간"
      className="prompter-workspace col-span-2 min-h-0 min-w-0 overflow-y-auto bg-panel p-4"
    >
      <div className="mb-4">
        <Button variant="secondary" onClick={onBackToLibrary}>
          라이브러리로 돌아가기
        </Button>
      </div>
      <SettingsPanel {...props} />
      <section className="mt-4 border-t border-border-subtle pt-4" aria-label="개인정보 설정">
        <h3 className="text-[16px] font-semibold">개인정보 설정</h3>
        <p className="my-2 text-muted-strong">
          Privacy Center에서 경고 설정과 수동 검사를 관리합니다.
        </p>
        <Button variant="secondary" onClick={onOpenPrivacy}>
          Privacy Center 열기
        </Button>
      </section>
    </section>
  )
}
