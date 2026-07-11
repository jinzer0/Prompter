import { sql } from "drizzle-orm"
import {
  type AnySQLiteColumn,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

import { SCENARIOS, TARGET_AGENTS } from "../ipc-contract.js"

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  techStack: text("tech_stack"),
  defaultAgent: text("default_agent", { enum: TARGET_AGENTS }),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

export const projectContextProfiles = sqliteTable(
  "project_context_profiles",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    summary: text("summary"),
    techStack: text("tech_stack"),
    architectureNotes: text("architecture_notes"),
    codingConventions: text("coding_conventions"),
    constraints: text("constraints"),
    forbiddenActions: text("forbidden_actions"),
    acceptanceDefaults: text("acceptance_defaults"),
    validationCommands: text("validation_commands"),
    securityNotes: text("security_notes"),
    additionalContext: text("additional_context"),
    testingNotes: text("testing_notes"),
    packageManager: text("package_manager"),
    defaultBranch: text("default_branch"),
    repoPath: text("repo_path"),
    isDefault: integer("is_default", { mode: "boolean" }).notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("project_context_profiles_project_id_idx").on(table.projectId),
    uniqueIndex("project_context_profiles_default_unique_idx")
      .on(table.projectId)
      .where(sql`is_default = 1`),
  ],
)

export const promptAssets = sqliteTable(
  "prompt_assets",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    scenario: text("scenario", { enum: SCENARIOS }).notNull(),
    targetAgent: text("target_agent", { enum: TARGET_AGENTS }).notNull(),
    currentVersionId: text("current_version_id"),
    parentPromptId: text("parent_prompt_id").references((): AnySQLiteColumn => promptAssets.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("prompt_assets_project_id_idx").on(table.projectId),
    index("prompt_assets_parent_prompt_id_idx").on(table.parentPromptId),
  ],
)

export const promptVersions = sqliteTable(
  "prompt_versions",
  {
    id: text("id").primaryKey(),
    promptAssetId: text("prompt_asset_id")
      .notNull()
      .references(() => promptAssets.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    originalInput: text("original_input").notNull(),
    compiledPrompt: text("compiled_prompt").notNull(),
    assumptions: text("assumptions"),
    questions: text("questions"),
    answers: text("answers"),
    acceptanceCriteria: text("acceptance_criteria"),
    validationCommands: text("validation_commands"),
    qualityScore: integer("quality_score"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("prompt_versions_prompt_asset_id_idx").on(table.promptAssetId),
    uniqueIndex("prompt_versions_prompt_asset_version_idx").on(
      table.promptAssetId,
      table.versionNumber,
    ),
  ],
)

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: integer("created_at").notNull(),
})

export const promptTags = sqliteTable(
  "prompt_tags",
  {
    promptAssetId: text("prompt_asset_id")
      .notNull()
      .references(() => promptAssets.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.promptAssetId, table.tagId] })],
)

export const harnessTemplates = sqliteTable("harness_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  scenario: text("scenario", { enum: SCENARIOS }).notNull(),
  targetAgent: text("target_agent", { enum: TARGET_AGENTS }).notNull(),
  templateBody: text("template_body").notNull(),
  requiredFields: text("required_fields"),
  clarificationPolicy: text("clarification_policy"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull(),
})
