import { type FormEvent, useEffect, useRef, useState } from "react"

import { type AppLockPhase, unlockApp } from "../../hooks/use-app-lock-state"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Input } from "../ui/input"

type LockScreenProps = {
  readonly phase: AppLockPhase
  readonly onRefresh: () => Promise<void>
  readonly onUnlock: (passphrase: string) => Promise<boolean>
}

export function LockScreen({ onRefresh, onUnlock, phase }: LockScreenProps) {
  const [passphrase, setPassphrase] = useState("")
  const [isWorking, setIsWorking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (phase.kind === "locked") inputRef.current?.focus()
  }, [phase.kind])

  useEffect(() => {
    if (!isWorking && message !== null) inputRef.current?.focus()
  }, [isWorking, message])

  async function submitUnlock(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (passphrase.length < 8 || passphrase.trim().length === 0) {
      setMessage("Enter the app-lock passphrase (at least 8 characters).")
      return
    }

    setMessage(null)
    setIsWorking(true)
    const unlocked = await unlockApp({
      clearPassphrase: () => setPassphrase(""),
      passphrase,
      unlock: onUnlock,
    })
    setIsWorking(false)
    if (!unlocked) {
      setMessage("Passphrase was not accepted. Try again.")
      inputRef.current?.focus()
    }
  }

  return (
    <main
      data-testid="lock-screen"
      aria-label="Prompter locked"
      className="flex min-h-[100dvh] items-center justify-center overflow-auto bg-shell p-6 text-foreground"
    >
      <Card className="w-full max-w-[460px] shadow-panel">
        <CardHeader className="border-b border-border-subtle pb-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Prompter</p>
          <CardTitle className="pt-2 text-[16px]">Workspace locked</CardTitle>
          <CardDescription className="text-[14px] text-muted-strong">
            Your current session is protected until the app-lock passphrase is verified.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {phase.kind === "protected_error" || phase.kind === "loading" ? (
            <ProtectedStatus isLoading={phase.kind === "loading"} onRefresh={onRefresh} />
          ) : (
            <form className="space-y-3" onSubmit={submitUnlock}>
              <label
                htmlFor="app-lock-passphrase"
                className="block space-y-2 text-[12px] font-medium text-muted-strong"
              >
                App-lock passphrase
                <Input
                  id="app-lock-passphrase"
                  ref={inputRef}
                  aria-describedby="app-lock-scope"
                  autoComplete="current-password"
                  disabled={isWorking}
                  maxLength={1024}
                  type="password"
                  value={passphrase}
                  className="focus:border-accent focus:ring-accent/45"
                  onChange={(event) => setPassphrase(event.currentTarget.value)}
                />
              </label>
              {message !== null && (
                <p role="alert" className="text-[12px] leading-5 text-muted-strong">
                  {message}
                </p>
              )}
              <Button className="w-full" type="submit" disabled={isWorking}>
                {isWorking ? "Unlocking..." : "Unlock Prompter"}
              </Button>
            </form>
          )}
          <p id="app-lock-scope" className="text-[12px] leading-5 text-muted-strong">
            App lock protects this UI session. It does not encrypt the SQLite file or protect
            against OS access, malware, or screen capture.
          </p>
        </CardContent>
      </Card>
    </main>
  )
}

type ProtectedStatusProps = {
  readonly isLoading: boolean
  readonly onRefresh: () => Promise<void>
}

function ProtectedStatus({ isLoading, onRefresh }: ProtectedStatusProps) {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <p className="text-[12px] leading-5 text-muted-strong">
        {isLoading
          ? "Checking app-lock status. The workspace remains protected."
          : "App-lock status could not be verified. Prompter remains locked."}
      </p>
      {!isLoading && (
        <Button className="w-full" variant="secondary" onClick={() => void onRefresh()}>
          Retry status check
        </Button>
      )}
    </div>
  )
}
