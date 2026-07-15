import { describe, expect, it } from "vitest"

import {
  extractVariables,
  renderTemplate,
} from "../renderer/src/lib/prompt-templates/prompt-template-utils"

describe("prompt template utilities", () => {
  it("extracts unique variables in first-occurrence order from valid placeholders", () => {
    const template = "Hello {{objective}} {{audience}} {{objective}} {{project_name}}."

    expect(extractVariables(template)).toEqual(["objective", "audience", "project_name"])
  })

  it("ignores invalid placeholders and malformed braces", () => {
    const template =
      "{{1bad}} {{ bad }} {{objective {{objective}} objective}} {{objective_2}} {{objective_2}}"

    expect(extractVariables(template)).toEqual(["objective", "objective_2"])
  })

  it("renders markdown while preserving whitespace, code fences, diff blocks, and literal replacement values", () => {
    const template = [
      "# Prompt",
      "",
      "Lead-in {{objective}}.",
      "",
      "```ts",
      'const literal = "{{objective}}"',
      "```",
      "",
      "```diff",
      "- old {{objective}}",
      "+ new {{objective}}",
      "```",
      "",
      "Trailing {{path}} and {{nested}} and {{backslash}} and {{dollar}} and {{token}}.",
    ].join("\n")

    const result = renderTemplate(template, {
      objective: "Ship the feature",
      path: "C:\\tmp\\prompt-template",
      nested: "{{x}}",
      backslash: "\\\\",
      dollar: "$1",
      token: "$&",
    })

    expect(result).toEqual({
      rendered: [
        "# Prompt",
        "",
        "Lead-in Ship the feature.",
        "",
        "```ts",
        'const literal = "Ship the feature"',
        "```",
        "",
        "```diff",
        "- old Ship the feature",
        "+ new Ship the feature",
        "```",
        "",
        "Trailing C:\\tmp\\prompt-template and {{x}} and \\\\ and $1 and $&.",
      ].join("\n"),
      warnings: [],
    })
  })

  it("preserves missing placeholders and reports warnings in first-occurrence order", () => {
    const result = renderTemplate("{{objective}} {{missing}} {{missing}} {{later}}", {
      objective: "Ship it",
      later: "Later value",
    })

    expect(result).toEqual({
      rendered: "Ship it {{missing}} {{missing}} Later value",
      warnings: ["Missing value for {{missing}}"],
    })
  })
})
