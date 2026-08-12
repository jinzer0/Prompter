import { type FormEvent, type ReactNode, useId, useState } from "react"

import type { AppLockSettingsController } from "../../hooks/use-app-lock-settings"
import { Button } from "../ui/button"
import { Input } from "../ui/input"

type CredentialFlow = "setup" | "change" | "disable" | null

type AppLockCredentialFlowsProps = {
  readonly controller: AppLockSettingsController
}

type ChangeFields = {
  readonly currentPassphrase: string
  readonly newPassphrase: string
  readonly confirmation: string
}

const EMPTY_CHANGE: ChangeFields = { currentPassphrase: "", newPassphrase: "", confirmation: "" }

export function AppLockCredentialFlows({ controller }: AppLockCredentialFlowsProps) {
  const enabled = controller.settings?.enabled === true
  const [flow, setFlow] = useState<CredentialFlow>(null)
  const [passphrase, setPassphrase] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [change, setChange] = useState(EMPTY_CHANGE)
  const [validation, setValidation] = useState<string | null>(null)
  const isWorking = controller.phase === "working"

  function clearFields(): void {
    setPassphrase("")
    setConfirmation("")
    setChange(EMPTY_CHANGE)
    setValidation(null)
  }

  function selectFlow(nextFlow: CredentialFlow): void {
    clearFields()
    setFlow(nextFlow)
  }

  function validPair(value: string, repeated: string): boolean {
    if (value.length < 8 || value.trim().length === 0) {
      setValidation("Passphrases must contain at least 8 non-blank characters.")
      return false
    }
    if (value !== repeated) {
      setValidation("Passphrase confirmation must match.")
      return false
    }
    return true
  }

  async function submitSetup(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!validPair(passphrase, confirmation)) return
    const input = { passphrase, confirmation }
    clearFields()
    const saved = await controller.setup(input)
    if (saved) setFlow(null)
  }

  async function submitChange(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (change.currentPassphrase.length < 8) {
      setValidation("Enter the current passphrase.")
      return
    }
    if (!validPair(change.newPassphrase, change.confirmation)) return
    const input = change
    clearFields()
    const saved = await controller.changePassphrase(input)
    if (saved) setFlow(null)
  }

  async function submitDisable(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (passphrase.length < 8 || passphrase.trim().length === 0) {
      setValidation("Enter the current passphrase.")
      return
    }
    const input = passphrase
    clearFields()
    const disabled = await controller.disable(input)
    if (disabled) setFlow("setup")
  }

  if (flow === "setup") {
    return (
      <CredentialForm
        title="Enable app lock"
        submitLabel="Enable app lock"
        validation={validation}
        isWorking={isWorking}
        onCancel={() => selectFlow(null)}
        onSubmit={submitSetup}
      >
        <PassphraseInput
          autoFocus
          label="New passphrase"
          value={passphrase}
          onChange={setPassphrase}
        />
        <PassphraseInput
          label="Confirm new passphrase"
          value={confirmation}
          onChange={setConfirmation}
        />
      </CredentialForm>
    )
  }

  if (flow === "change") {
    return (
      <CredentialForm
        title="Change passphrase"
        submitLabel="Change passphrase"
        validation={validation}
        isWorking={isWorking}
        onCancel={() => selectFlow(null)}
        onSubmit={submitChange}
      >
        <PassphraseInput
          autoFocus
          label="Current passphrase"
          value={change.currentPassphrase}
          onChange={(value) => setChange({ ...change, currentPassphrase: value })}
        />
        <PassphraseInput
          label="New passphrase"
          value={change.newPassphrase}
          onChange={(value) => setChange({ ...change, newPassphrase: value })}
        />
        <PassphraseInput
          label="Confirm new passphrase"
          value={change.confirmation}
          onChange={(value) => setChange({ ...change, confirmation: value })}
        />
      </CredentialForm>
    )
  }

  if (flow === "disable") {
    return (
      <CredentialForm
        title="Disable app lock"
        submitLabel="Disable app lock"
        validation={validation}
        isWorking={isWorking}
        onCancel={() => selectFlow(null)}
        onSubmit={submitDisable}
      >
        <PassphraseInput
          autoFocus
          label="Current passphrase"
          value={passphrase}
          onChange={setPassphrase}
        />
      </CredentialForm>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {enabled ? (
        <>
          <Button variant="secondary" disabled={isWorking} onClick={() => selectFlow("change")}>
            Change passphrase
          </Button>
          <Button variant="ghost" disabled={isWorking} onClick={() => selectFlow("disable")}>
            Disable app lock
          </Button>
        </>
      ) : (
        <Button disabled={isWorking} onClick={() => selectFlow("setup")}>
          Enable app lock
        </Button>
      )}
    </div>
  )
}

type PassphraseInputProps = {
  readonly autoFocus?: boolean
  readonly label: string
  readonly value: string
  readonly onChange: (value: string) => void
}

function PassphraseInput({ autoFocus = false, label, onChange, value }: PassphraseInputProps) {
  const id = useId()

  return (
    <label htmlFor={id} className="grid gap-2 text-[12px] font-medium text-muted-strong">
      {label}
      <Input
        id={id}
        autoFocus={autoFocus}
        autoComplete="off"
        maxLength={1024}
        type="password"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  )
}

type CredentialFormProps = {
  readonly children: ReactNode
  readonly isWorking: boolean
  readonly onCancel: (() => void) | null
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
  readonly submitLabel: string
  readonly title: string
  readonly validation: string | null
}

function CredentialForm({
  children,
  isWorking,
  onCancel,
  onSubmit,
  submitLabel,
  title,
  validation,
}: CredentialFormProps) {
  return (
    <form
      className="space-y-3 rounded-card border border-border bg-panel-muted p-3"
      onSubmit={onSubmit}
    >
      <h4 className="text-[14px] font-semibold text-foreground">{title}</h4>
      {children}
      {validation !== null && (
        <p className="text-[12px] leading-5 text-muted-strong" role="alert">
          {validation}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isWorking}>
          {isWorking ? "Working..." : submitLabel}
        </Button>
        {onCancel !== null && (
          <Button type="button" variant="ghost" disabled={isWorking} onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
