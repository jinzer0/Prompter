const TEMPLATE_VARIABLE_PATTERN = /\{\{([A-Za-z][A-Za-z0-9_]*)\}\}/g

export type TemplateValues = Readonly<Record<string, string | undefined>>

export type TemplateRenderResult = {
  readonly rendered: string
  readonly warnings: readonly string[]
}

export function extractVariables(template: string): readonly string[] {
  const variables: string[] = []
  const seen = new Set<string>()

  for (const match of template.matchAll(TEMPLATE_VARIABLE_PATTERN)) {
    const variable = match[1]

    if (variable === undefined) {
      continue
    }

    if (seen.has(variable)) {
      continue
    }

    seen.add(variable)
    variables.push(variable)
  }

  return variables
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
