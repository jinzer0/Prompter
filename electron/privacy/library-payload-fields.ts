import type { SensitiveFinding } from "./privacy-schemas.js"
import {
  type ContextField,
  contextFields,
  type VersionField,
  versionFields,
} from "./sensitive-payload-fields.js"

export type SensitivePayloadField = {
  readonly location: SensitiveFinding["location"]
  readonly text: string
}

type VersionRow = { readonly id: string; readonly versionNumber: number } & Record<
  VersionField,
  string | null
>
type ContextRow = { readonly id: string; readonly name: string } & Record<
  ContextField,
  string | null
>
type ProjectRow = {
  readonly id: string
  readonly name: string
  readonly description: string | null
  readonly techStack: string | null
}
type NamedRow = { readonly id: string; readonly name: string }
type TitledRow = { readonly id: string; readonly title: string }
type PromptTemplateRow = NamedRow & {
  readonly description: string | null
  readonly templateBody: string
}
type HarnessTemplateRow = NamedRow & {
  readonly templateBody: string
  readonly requiredFields: string | null
  readonly clarificationPolicy: string | null
}
type PromptQualityReviewField =
  | "dimensionScores"
  | "strengths"
  | "issues"
  | "suggestions"
  | "missingSections"
  | "warnings"
  | "recommendedClarifyingQuestions"
  | "scoreExplanation"
  | "snapshot"
  | "improvedPromptDraft"
type PromptQualityReviewRow = { readonly id: string } & Record<
  PromptQualityReviewField,
  string | null
>

const promptQualityReviewFields = [
  ["dimensionScores", "dimension scores"],
  ["strengths", "strengths"],
  ["issues", "issues"],
  ["suggestions", "suggestions"],
  ["missingSections", "missing sections"],
  ["warnings", "warnings"],
  ["recommendedClarifyingQuestions", "recommended clarifying questions"],
  ["scoreExplanation", "score explanation"],
  ["snapshot", "snapshot"],
  ["improvedPromptDraft", "improved prompt draft"],
] as const satisfies readonly (readonly [PromptQualityReviewField, string])[]

export function textField(
  text: string | null | undefined,
  location: SensitiveFinding["location"],
): readonly SensitivePayloadField[] {
  return text === null || text === undefined ? [] : [{ text, location }]
}

export function versionPayloadFields(
  versions: readonly VersionRow[],
): readonly SensitivePayloadField[] {
  return versions.flatMap((version) =>
    versionFields.flatMap(([field, label]) =>
      textField(version[field], {
        entityType: "prompt_version",
        entityId: version.id,
        field,
        previewLabel: `Prompt version ${version.versionNumber} ${label}`,
      }),
    ),
  )
}

export function contextPayloadFields(
  profiles: readonly ContextRow[],
): readonly SensitivePayloadField[] {
  return profiles.flatMap((profile) => [
    ...textField(profile.name, {
      entityType: "project_context",
      entityId: profile.id,
      field: "name",
      previewLabel: "Project context name",
    }),
    ...contextFields.flatMap(([field, label]) =>
      textField(profile[field], {
        entityType: "project_context",
        entityId: profile.id,
        field,
        previewLabel: `Project context ${profile.name} ${label}`,
      }),
    ),
  ])
}

export function titledPayloadFields(rows: readonly TitledRow[]): readonly SensitivePayloadField[] {
  return rows.flatMap((row) =>
    textField(row.title, {
      entityType: "prompt_asset",
      entityId: row.id,
      field: "title",
      previewLabel: "Prompt title",
    }),
  )
}

function projectPayloadFields(rows: readonly ProjectRow[]): readonly SensitivePayloadField[] {
  return rows.flatMap((project) => [
    ...textField(project.name, {
      entityType: "project",
      entityId: project.id,
      field: "name",
      previewLabel: "Project name",
    }),
    ...textField(project.description, {
      entityType: "project",
      entityId: project.id,
      field: "description",
      previewLabel: `Project ${project.name} description`,
    }),
    ...textField(project.techStack, {
      entityType: "project",
      entityId: project.id,
      field: "techStack",
      previewLabel: `Project ${project.name} tech stack`,
    }),
  ])
}

function namedPayloadFields(
  rows: readonly NamedRow[],
  entityType: string,
  previewLabel: string,
): readonly SensitivePayloadField[] {
  return rows.flatMap((row) =>
    textField(row.name, { entityType, entityId: row.id, field: "name", previewLabel }),
  )
}

function promptTemplatePayloadFields(
  templates: readonly PromptTemplateRow[],
): readonly SensitivePayloadField[] {
  return templates.flatMap((template) => [
    ...namedPayloadFields([template], "prompt_template", "Prompt template name"),
    ...textField(template.description, {
      entityType: "prompt_template",
      entityId: template.id,
      field: "description",
      previewLabel: `Prompt template ${template.name} description`,
    }),
    ...textField(template.templateBody, {
      entityType: "prompt_template",
      entityId: template.id,
      field: "templateBody",
      previewLabel: `Prompt template ${template.name}`,
    }),
  ])
}

function harnessTemplatePayloadFields(
  templates: readonly HarnessTemplateRow[],
): readonly SensitivePayloadField[] {
  return templates.flatMap((template) => [
    ...namedPayloadFields([template], "harness_template", "Harness template name"),
    ...textField(template.templateBody, {
      entityType: "harness_template",
      entityId: template.id,
      field: "templateBody",
      previewLabel: `Harness template ${template.name}`,
    }),
    ...textField(template.requiredFields, {
      entityType: "harness_template",
      entityId: template.id,
      field: "requiredFields",
      previewLabel: `Harness template ${template.name} required fields`,
    }),
    ...textField(template.clarificationPolicy, {
      entityType: "harness_template",
      entityId: template.id,
      field: "clarificationPolicy",
      previewLabel: `Harness template ${template.name} clarification policy`,
    }),
  ])
}

function promptQualityReviewPayloadFields(
  reviews: readonly PromptQualityReviewRow[],
): readonly SensitivePayloadField[] {
  return reviews.flatMap((review) =>
    promptQualityReviewFields.flatMap(([field, label]) =>
      textField(review[field], {
        entityType: "prompt_quality_review",
        entityId: review.id,
        field,
        previewLabel: `Prompt quality review ${label}`,
      }),
    ),
  )
}

export type SensitiveLibraryPayload = {
  readonly projects?: readonly ProjectRow[]
  readonly promptAssets?: readonly TitledRow[]
  readonly promptVersions?: readonly VersionRow[]
  readonly tags?: readonly NamedRow[]
  readonly projectContextProfiles?: readonly ContextRow[]
  readonly promptTemplates?: readonly PromptTemplateRow[]
  readonly harnessTemplates?: readonly HarnessTemplateRow[]
  readonly promptQualityReviews?: readonly PromptQualityReviewRow[]
}

export function libraryPayloadFields(
  input: SensitiveLibraryPayload,
): readonly SensitivePayloadField[] {
  return [
    ...projectPayloadFields(input.projects ?? []),
    ...titledPayloadFields(input.promptAssets ?? []),
    ...versionPayloadFields(input.promptVersions ?? []),
    ...namedPayloadFields(input.tags ?? [], "tag", "Tag name"),
    ...contextPayloadFields(input.projectContextProfiles ?? []),
    ...promptTemplatePayloadFields(input.promptTemplates ?? []),
    ...harnessTemplatePayloadFields(input.harnessTemplates ?? []),
    ...promptQualityReviewPayloadFields(input.promptQualityReviews ?? []),
  ]
}
