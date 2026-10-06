import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { App } from "./app"
import { initializeAppearance } from "./lib/appearance"
import "./styles.css"

const cleanupAppearance = initializeAppearance(window.prompter.appearance, document.documentElement)
window.addEventListener("unload", cleanupAppearance, { once: true })

const rootElement = document.getElementById("root")

if (rootElement === null) {
  throw new TypeError("Renderer root element was not found")
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
