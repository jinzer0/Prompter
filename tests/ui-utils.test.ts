import { describe, expect, it } from "vitest"

import { cn } from "../renderer/src/lib/utils"

describe("UI class utilities", () => {
  it('keeps the later padding-x class when merging cn("px-2", "px-4")', () => {
    const mergedClassName = cn("px-2", "px-4")

    expect(mergedClassName.split(" ")).toContain("px-4")
    expect(mergedClassName.split(" ")).not.toContain("px-2")
  })
})
