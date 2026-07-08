import { z } from "zod"

export const expectedTables = [
  "projects",
  "prompt_assets",
  "prompt_versions",
  "tags",
  "prompt_tags",
  "harness_templates",
  "settings",
] as const

export const forbiddenTables = [
  "prompt_runs",
  "agent_runs",
  "execution_results",
  "validation_results",
  "run_logs",
] as const

export const expectedColumns = {
  projects: [
    "id",
    "name",
    "description",
    "tech_stack",
    "default_agent",
    "created_at",
    "updated_at",
  ],
  prompt_assets: [
    "id",
    "project_id",
    "title",
    "scenario",
    "target_agent",
    "current_version_id",
    "parent_prompt_id",
    "created_at",
    "updated_at",
  ],
  prompt_versions: [
    "id",
    "prompt_asset_id",
    "version_number",
    "original_input",
    "compiled_prompt",
    "assumptions",
    "questions",
    "answers",
    "acceptance_criteria",
    "validation_commands",
    "quality_score",
    "created_at",
  ],
  tags: ["id", "name", "created_at"],
  prompt_tags: ["prompt_asset_id", "tag_id"],
  harness_templates: [
    "id",
    "name",
    "scenario",
    "target_agent",
    "template_body",
    "required_fields",
    "clarification_policy",
    "created_at",
    "updated_at",
  ],
  settings: ["key", "value", "updated_at"],
} as const

export const stringArraySchema = z.array(z.string())
