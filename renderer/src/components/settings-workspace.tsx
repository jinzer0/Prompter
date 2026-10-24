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
      className="prompter-workspace col-span-2 min-h-0 min-w-0 overflow-y-auto bg-shell px-6 py-6 text-[14px]"
    >
      <div className="mx-auto w-full max-w-[740px] space-y-6">
        <div>
          <Button variant="secondary" onClick={onBackToLibrary}>
            라이브러리로 돌아가기
          </Button>
        </div>
        <SettingsPanel {...props} />
        <section
          className="rounded-card bg-panel px-5 py-4"
          aria-labelledby="settings-privacy-heading"
        >
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="min-w-0 flex-1 basis-60">
              <h3 id="settings-privacy-heading" className="text-[14px] font-semibold">
                개인정보 설정
              </h3>
              <p className="mt-1 text-[12px] text-muted-strong">
                Privacy Center에서 경고 설정과 수동 검사를 관리합니다.
              </p>
            </div>
            <Button variant="secondary" onClick={onOpenPrivacy}>
              Privacy Center 열기
            </Button>
          </div>
        </section>
      </div>
    </section>
  )
}
