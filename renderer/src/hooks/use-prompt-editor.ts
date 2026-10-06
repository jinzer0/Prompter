import { useSyncExternalStore } from "react"

import type { PromptEditorStore } from "../lib/prompt-editor"

export function usePromptEditor(store: PromptEditorStore) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}
