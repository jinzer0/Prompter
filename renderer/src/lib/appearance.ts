import type { AppearanceState, ElectronBridge } from "../../../electron/ipc-types"

type AppearanceRoot = {
  readonly dataset: { [name: string]: string | undefined }
  readonly style: { colorScheme: string }
}

export function subscribeToAppearance(
  bridge: ElectronBridge["appearance"],
  onChanged: (state: AppearanceState) => void,
): () => void {
  const unsubscribe = bridge.onChanged(onChanged)
  try {
    onChanged(bridge.getState())
  } catch (error) {
    unsubscribe()
    throw error
  }
  return unsubscribe
}

export function initializeAppearance(
  bridge: ElectronBridge["appearance"],
  root: AppearanceRoot,
): () => void {
  return subscribeToAppearance(bridge, (state) => {
    root.style.colorScheme = state.effectiveTheme
    root.dataset["theme"] = state.effectiveTheme
  })
}
