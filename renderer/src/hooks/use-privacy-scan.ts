import { useReducer, useRef } from "react"

import type { SensitiveScanResult } from "../../../electron/ipc-types"

export type PrivacyScanState =
  | { readonly kind: "idle" }
  | { readonly kind: "scanning" }
  | { readonly kind: "ready"; readonly result: SensitiveScanResult }
  | { readonly kind: "error"; readonly message: string }

export type PrivacyScanEvent =
  | { readonly type: "scan_started" }
  | { readonly type: "scan_succeeded"; readonly result: SensitiveScanResult }
  | { readonly type: "scan_failed"; readonly message: string }
  | { readonly type: "reset" }

type PrivacyScanBusyRef = { current: boolean }

type RunPrivacyScanInput<TInput> = {
  readonly busy: PrivacyScanBusyRef
  readonly dispatch: (event: PrivacyScanEvent) => void
  readonly input: TInput
  readonly scan: (input: TInput) => Promise<SensitiveScanResult>
}

function assertNever(value: never): never {
  throw new TypeError(`Unexpected privacy scan event: ${JSON.stringify(value)}`)
}

export function createInitialPrivacyScanState(): PrivacyScanState {
  return { kind: "idle" }
}

export function privacyScanReducer(
  _state: PrivacyScanState,
  event: PrivacyScanEvent,
): PrivacyScanState {
  switch (event.type) {
    case "scan_started":
      return { kind: "scanning" }
    case "scan_succeeded":
      return { kind: "ready", result: event.result }
    case "scan_failed":
      return { kind: "error", message: event.message }
    case "reset":
      return createInitialPrivacyScanState()
    default:
      return assertNever(event)
  }
}

export async function runPrivacyScan<TInput>({
  busy,
  dispatch,
  input,
  scan,
}: RunPrivacyScanInput<TInput>): Promise<void> {
  if (busy.current) return

  busy.current = true
  dispatch({ type: "scan_started" })
  try {
    const result = await scan(input)
    dispatch({ type: "scan_succeeded", result })
  } catch (error) {
    if (!(error instanceof Error)) throw error
    dispatch({ type: "scan_failed", message: "Privacy scan could not be completed." })
  } finally {
    busy.current = false
  }
}

export type UsePrivacyScanResult<TInput> = {
  readonly reset: () => void
  readonly run: (input: TInput) => Promise<void>
  readonly state: PrivacyScanState
}

export function usePrivacyScan<TInput>(
  scan: (input: TInput) => Promise<SensitiveScanResult>,
): UsePrivacyScanResult<TInput> {
  const [state, dispatch] = useReducer(privacyScanReducer, undefined, createInitialPrivacyScanState)
  const busy = useRef(false)

  return {
    reset: () => dispatch({ type: "reset" }),
    run: (input) => runPrivacyScan({ busy, dispatch, input, scan }),
    state,
  }
}
