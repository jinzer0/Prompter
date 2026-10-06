import { useEffect, useState } from "react"

import type { AppearanceState, ElectronBridge } from "../../../electron/ipc-types"
import { subscribeToAppearance } from "../lib/appearance"

export function useAppearance(
  bridge: ElectronBridge["appearance"] = window.prompter.appearance,
): AppearanceState {
  const [appearance, setAppearance] = useState(() => bridge.getState())

  useEffect(() => subscribeToAppearance(bridge, setAppearance), [bridge])

  return appearance
}
