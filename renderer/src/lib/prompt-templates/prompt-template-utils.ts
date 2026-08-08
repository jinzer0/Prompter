import {
  extractTemplateVariables,
  TEMPLATE_VARIABLE_PATTERN,
} from "../../../../shared/prompt-template-variables.js"

export { extractTemplateVariables as extractVariables }

export type TemplateValues = Readonly<Record<string, string | undefined>>

export type TemplateRenderResult = {
  readonly rendered: string
  readonly warnings: readonly string[]
}

export function renderTemplate(template: string, values: TemplateValues): TemplateRenderResult {
  const warnings: string[] = []
  const missing = new Set<string>()

  const rendered = template.replace(
    TEMPLATE_VARIABLE_PATTERN,
    (placeholder: string, variable: string): string => {
      const value = values[variable]

      if (value === undefined) {
        if (!missing.has(placeholder)) {
          missing.add(placeholder)
          warnings.push(`Missing value for ${placeholder}`)
        }

        return placeholder
      }

      return value
    },
  )

  return { rendered, warnings }
}
