export const TEMPLATE_VARIABLE_PATTERN = /\{\{([A-Za-z][A-Za-z0-9_]*)\}\}/g

export function extractTemplateVariables(template) {
  const variables = []
  const seen = new Set()

  for (const match of template.matchAll(TEMPLATE_VARIABLE_PATTERN)) {
    const variable = match[1]

    if (variable === undefined || seen.has(variable)) {
      continue
    }

    seen.add(variable)
    variables.push(variable)
  }

  return variables
}
