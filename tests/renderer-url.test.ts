import { describe, expect, it } from "vitest"

import { canonicalizeRendererUrl } from "../electron/renderer-url.js"

describe("renderer URL canonicalization", () => {
  it("canonicalizes a development root URL with URL semantics", () => {
    expect(canonicalizeRendererUrl("http://127.0.0.1:5173")).toBe("http://127.0.0.1:5173/")
  })

  it("preserves an exact canonical production file URL", () => {
    const productionUrl = "file:///Applications/Prompter.app/Contents/Resources/renderer/index.html"
    expect(canonicalizeRendererUrl(productionUrl)).toBe(productionUrl)
  })
})
