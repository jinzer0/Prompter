import { useEffect, useState } from "react"

import { LockScreen } from "./components/app-lock/lock-screen"
import { AppShell } from "./components/shell/app-shell"
import { useAppLockState } from "./hooks/use-app-lock-state"
import { useAutoLock } from "./hooks/use-auto-lock"
import { handleMenuAction, handleMenuKeyDown } from "./lib/menu-actions"
import { createCompilerMemory } from "./lib/prompt-compiler/compiler-memory"

export function App() {
  const appLock = useAppLockState(window.prompter.appLock)
  const [compilerMemory] = useState(createCompilerMemory)
  const unlockedState = appLock.phase.kind === "unlocked" ? appLock.phase.state : null

  useAutoLock(unlockedState, appLock.lock)

  useEffect(
    () =>
      window.prompter.menu.onAction((action) =>
        handleMenuAction(action, { refreshAppLock: () => void appLock.refresh() }),
      ),
    [appLock.refresh],
  )

  useEffect(() => {
    window.addEventListener("keydown", handleMenuKeyDown)
    return () => window.removeEventListener("keydown", handleMenuKeyDown)
  }, [])

  return (
    <>
      {appLock.phase.kind === "unlocked" && (
        <AppShell compilerMemory={compilerMemory} onAppLockStateChange={appLock.refresh} />
      )}
      {appLock.phase.kind !== "unlocked" && (
        <LockScreen phase={appLock.phase} onRefresh={appLock.refresh} onUnlock={appLock.unlock} />
      )}
    </>
  )
}
