import { useCallback, useRef, useState } from "react"

import type { SensitiveScanResult } from "../../../electron/ipc-types"

export type PrivacyWarningState =
  | { readonly kind: "idle" }
  | { readonly kind: "confirmation_required"; readonly scanResult: SensitiveScanResult }

export type PrivacyWarningRequest = {
  readonly scanResult: SensitiveScanResult
  readonly retry: () => Promise<void>
  readonly onCancel?: () => Promise<void> | void
}

export type PrivacyWarningPendingRef = {
  current: PrivacyWarningRequest | null
}

type PrivacyWarningStateSetter = (state: PrivacyWarningState) => void

export function openPrivacyWarning(
  pending: PrivacyWarningPendingRef,
  setState: PrivacyWarningStateSetter,
  request: PrivacyWarningRequest,
): void {
  if (pending.current !== null) return

  pending.current = request
  setState({ kind: "confirmation_required", scanResult: request.scanResult })
}

export async function confirmPrivacyWarning(
  pending: PrivacyWarningPendingRef,
  setState: PrivacyWarningStateSetter,
): Promise<void> {
  const request = pending.current
  if (request === null) return

  pending.current = null
  setState({ kind: "idle" })
  await request.retry()
}

export async function cancelPrivacyWarning(
  pending: PrivacyWarningPendingRef,
  setState: PrivacyWarningStateSetter,
): Promise<void> {
  const request = pending.current
  if (request === null) return

  pending.current = null
  setState({ kind: "idle" })
  await request.onCancel?.()
}

export type UsePrivacyWarningResult = {
  readonly cancel: () => Promise<void>
  readonly confirm: () => Promise<void>
  readonly open: (request: PrivacyWarningRequest) => void
  readonly state: PrivacyWarningState
}

export function usePrivacyWarning(): UsePrivacyWarningResult {
  const [state, setState] = useState<PrivacyWarningState>({ kind: "idle" })
  const pending = useRef<PrivacyWarningRequest | null>(null)
  const cancel = useCallback(() => cancelPrivacyWarning(pending, setState), [])
  const confirm = useCallback(() => confirmPrivacyWarning(pending, setState), [])
  const open = useCallback(
    (request: PrivacyWarningRequest) => openPrivacyWarning(pending, setState, request),
    [],
  )

  return {
    cancel,
    confirm,
    open,
    state,
  }
}
