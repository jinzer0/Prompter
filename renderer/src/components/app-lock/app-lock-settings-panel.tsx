import type { ElectronBridge } from "../../../../electron/ipc-types"
import {
  type AppLockSettingsController,
  useAppLockSettings,
} from "../../hooks/use-app-lock-settings"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Input } from "../ui/input"
import { AppLockCredentialFlows } from "./app-lock-credential-flows"

type AppLockSettingsPanelProps = {
  readonly bridge: ElectronBridge["appLock"]
  readonly onStateChange: () => Promise<void>
}

type AppLockSettingsPanelViewProps = {
  readonly controller: AppLockSettingsController
}

export function AppLockSettingsPanelView({ controller }: AppLockSettingsPanelViewProps) {
  const settings = controller.settings
  const isWorking = controller.phase === "working"
  const timeoutIsValid =
    settings !== null &&
    Number.isInteger(settings.timeoutMinutes) &&
    settings.timeoutMinutes >= 1 &&
    settings.timeoutMinutes <= 240

  return (
    <Card aria-labelledby="app-lock-settings-heading">
      <CardHeader>
        <CardTitle id="app-lock-settings-heading">App lock</CardTitle>
        <CardDescription>
          Protect the visible workspace and sensitive actions when Prompter is unattended.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {settings === null ? (
          <div className="space-y-3" role="status" aria-live="polite">
            <p className="text-[12px] leading-5 text-muted-strong">
              {controller.phase === "error"
                ? "App-lock settings are unavailable."
                : "Loading app-lock settings..."}
            </p>
            {controller.phase === "error" && (
              <Button variant="secondary" onClick={() => void controller.reload()}>
                Retry app-lock settings
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-3">
              <label className="flex items-start gap-2 rounded-card border border-border bg-panel-muted p-3 text-[12px] leading-5 text-muted-strong">
                <input
                  className="mt-1 accent-accent"
                  type="checkbox"
                  checked={settings.lockOnStart}
                  disabled={isWorking}
                  onChange={(event) =>
                    controller.setSetting("lockOnStart", event.currentTarget.checked)
                  }
                />
                <span>
                  <span className="block font-medium text-foreground">Lock on start</span>
                  <span className="block text-muted">
                    Require the passphrase whenever Prompter starts.
                  </span>
                </span>
              </label>
              <label
                htmlFor="app-lock-timeout"
                className="grid gap-2 text-[12px] font-medium text-muted-strong"
              >
                Inactivity timeout (minutes)
                <Input
                  id="app-lock-timeout"
                  max={240}
                  min={1}
                  type="number"
                  value={settings.timeoutMinutes}
                  disabled={isWorking}
                  onChange={(event) =>
                    controller.setSetting("timeoutMinutes", event.currentTarget.valueAsNumber)
                  }
                />
              </label>
              {!timeoutIsValid && (
                <p role="alert" className="text-[12px] leading-5 text-muted-strong">
                  Inactivity timeout must be a whole number from 1 to 240.
                </p>
              )}
            </div>

            {settings.enabled && (
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={isWorking || !timeoutIsValid}
                  onClick={() => void controller.saveSettings()}
                >
                  Save lock settings
                </Button>
                <Button
                  variant="secondary"
                  disabled={isWorking}
                  onClick={() => void controller.lockNow()}
                >
                  Lock Prompter now
                </Button>
              </div>
            )}

            <AppLockCredentialFlows controller={controller} />
          </>
        )}

        {controller.message !== null && (
          <output className="block text-[12px] leading-5 text-muted-strong" aria-live="polite">
            {controller.message}
          </output>
        )}

        <div className="space-y-2 border-t border-border-subtle pt-4 text-[12px] leading-5 text-muted">
          <p>
            App lock protects the Prompter UI and session actions. It does not encrypt the SQLite
            database or protect against OS access, malware, or screen capture.
          </p>
          <p>
            If the passphrase is lost, it cannot be recovered. There is no reset control or recovery
            key.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export function AppLockSettingsPanel({ bridge, onStateChange }: AppLockSettingsPanelProps) {
  return <AppLockSettingsPanelView controller={useAppLockSettings({ bridge, onStateChange })} />
}
