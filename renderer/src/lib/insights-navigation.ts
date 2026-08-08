export type InsightsNavigationIntent =
  | { readonly kind: "project"; readonly projectId: string }
  | {
      readonly kind: "prompt"
      readonly projectId: string
      readonly promptAssetId: string
      readonly promptVersionId: string | null
    }
  | {
      readonly kind: "prompt_quality"
      readonly projectId: string
      readonly promptAssetId: string
      readonly promptVersionId: string
    }
  | { readonly kind: "tag"; readonly projectId: string; readonly tagId: string }
  | { readonly kind: "prompt_templates"; readonly promptTemplateId: string | null }
  | { readonly kind: "harness_templates"; readonly harnessTemplateId: string | null }
  | {
      readonly kind: "project_context"
      readonly projectId: string
      readonly profileId: string | null
    }
  | { readonly kind: "maintenance" }

export type InsightsNavigationSection = InsightsNavigationIntent["kind"]

function assertNever(intent: never): never {
  throw new TypeError(`Unexpected insights navigation intent: ${JSON.stringify(intent)}`)
}

export function insightsNavigationSection(
  intent: InsightsNavigationIntent,
): InsightsNavigationSection {
  switch (intent.kind) {
    case "project":
      return "project"
    case "prompt":
      return "prompt"
    case "prompt_quality":
      return "prompt_quality"
    case "tag":
      return "tag"
    case "prompt_templates":
      return "prompt_templates"
    case "harness_templates":
      return "harness_templates"
    case "project_context":
      return "project_context"
    case "maintenance":
      return "maintenance"
    default:
      return assertNever(intent)
  }
}
