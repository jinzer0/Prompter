PRAGMA foreign_keys = OFF;
--> statement-breakpoint
CREATE TABLE `__new_projects` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `tech_stack` text,
  `default_agent` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_projects` (`id`, `name`, `description`, `tech_stack`, `default_agent`, `created_at`, `updated_at`)
SELECT
  `id`,
  `name`,
  nullif(`description`, ''),
  NULL,
  NULL,
  coalesce(cast(strftime('%s', `created_at`) AS integer) * 1000, cast(strftime('%s', 'now') AS integer) * 1000),
  coalesce(cast(strftime('%s', `updated_at`) AS integer) * 1000, cast(strftime('%s', 'now') AS integer) * 1000)
FROM `projects`;
--> statement-breakpoint
CREATE TABLE `__new_prompt_assets` (
  `id` text PRIMARY KEY NOT NULL,
  `project_id` text,
  `title` text NOT NULL,
  `scenario` text NOT NULL,
  `target_agent` text NOT NULL,
  `current_version_id` text,
  `parent_prompt_id` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`project_id`) REFERENCES `__new_projects`(`id`) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (`parent_prompt_id`) REFERENCES `__new_prompt_assets`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_prompt_assets` (`id`, `project_id`, `title`, `scenario`, `target_agent`, `current_version_id`, `parent_prompt_id`, `created_at`, `updated_at`)
SELECT
  `id`,
  `project_id`,
  `title`,
  'feature',
  'generic_agent',
  coalesce(
    (SELECT `id` FROM `prompt_versions` WHERE `prompt_asset_id` = `prompt_assets`.`id` ORDER BY `version` DESC LIMIT 1),
    `id`
  ),
  NULL,
  coalesce(cast(strftime('%s', `created_at`) AS integer) * 1000, cast(strftime('%s', 'now') AS integer) * 1000),
  coalesce(cast(strftime('%s', `updated_at`) AS integer) * 1000, cast(strftime('%s', 'now') AS integer) * 1000)
FROM `prompt_assets`;
--> statement-breakpoint
CREATE TABLE `__new_prompt_versions` (
  `id` text PRIMARY KEY NOT NULL,
  `prompt_asset_id` text NOT NULL,
  `version_number` integer NOT NULL,
  `original_input` text NOT NULL,
  `compiled_prompt` text NOT NULL,
  `assumptions` text,
  `questions` text,
  `answers` text,
  `acceptance_criteria` text,
  `validation_commands` text,
  `quality_score` integer,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`prompt_asset_id`) REFERENCES `__new_prompt_assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_prompt_versions` (`id`, `prompt_asset_id`, `version_number`, `original_input`, `compiled_prompt`, `assumptions`, `questions`, `answers`, `acceptance_criteria`, `validation_commands`, `quality_score`, `created_at`)
SELECT
  `id`,
  `prompt_asset_id`,
  `version`,
  `body`,
  `body`,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  coalesce(cast(strftime('%s', `created_at`) AS integer) * 1000, cast(strftime('%s', 'now') AS integer) * 1000)
FROM `prompt_versions`;
--> statement-breakpoint
INSERT INTO `__new_prompt_versions` (`id`, `prompt_asset_id`, `version_number`, `original_input`, `compiled_prompt`, `assumptions`, `questions`, `answers`, `acceptance_criteria`, `validation_commands`, `quality_score`, `created_at`)
SELECT
  `id`,
  `id`,
  1,
  `body`,
  `body`,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  coalesce(cast(strftime('%s', `created_at`) AS integer) * 1000, cast(strftime('%s', 'now') AS integer) * 1000)
FROM `prompt_assets`
WHERE NOT EXISTS (
  SELECT 1 FROM `prompt_versions` WHERE `prompt_versions`.`prompt_asset_id` = `prompt_assets`.`id`
);
--> statement-breakpoint
CREATE TABLE `__new_tags` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_tags` (`id`, `name`, `created_at`)
SELECT
  `id`,
  `name`,
  coalesce(cast(strftime('%s', `created_at`) AS integer) * 1000, cast(strftime('%s', 'now') AS integer) * 1000)
FROM `tags`;
--> statement-breakpoint
CREATE TABLE `__new_prompt_tags` (
  `prompt_asset_id` text NOT NULL,
  `tag_id` text NOT NULL,
  PRIMARY KEY(`prompt_asset_id`, `tag_id`),
  FOREIGN KEY (`prompt_asset_id`) REFERENCES `__new_prompt_assets`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`tag_id`) REFERENCES `__new_tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_prompt_tags` (`prompt_asset_id`, `tag_id`)
SELECT `prompt_asset_id`, `tag_id` FROM `prompt_tags`;
--> statement-breakpoint
CREATE TABLE `__new_harness_templates` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `scenario` text NOT NULL,
  `target_agent` text NOT NULL,
  `template_body` text NOT NULL,
  `required_fields` text,
  `clarification_policy` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_harness_templates` (`id`, `name`, `scenario`, `target_agent`, `template_body`, `required_fields`, `clarification_policy`, `created_at`, `updated_at`)
SELECT
  `id`,
  `name`,
  'feature',
  'generic_agent',
  `content`,
  NULL,
  NULL,
  coalesce(cast(strftime('%s', `created_at`) AS integer) * 1000, cast(strftime('%s', 'now') AS integer) * 1000),
  coalesce(cast(strftime('%s', `updated_at`) AS integer) * 1000, cast(strftime('%s', 'now') AS integer) * 1000)
FROM `harness_templates`;
--> statement-breakpoint
CREATE TABLE `__new_settings` (
  `key` text PRIMARY KEY NOT NULL,
  `value` text NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_settings` (`key`, `value`, `updated_at`)
SELECT
  `key`,
  `value`,
  coalesce(cast(strftime('%s', `updated_at`) AS integer) * 1000, cast(strftime('%s', 'now') AS integer) * 1000)
FROM `settings`;
--> statement-breakpoint
DROP TABLE `prompt_tags`;
--> statement-breakpoint
DROP TABLE `prompt_versions`;
--> statement-breakpoint
DROP TABLE `prompt_assets`;
--> statement-breakpoint
DROP TABLE `harness_templates`;
--> statement-breakpoint
DROP TABLE `settings`;
--> statement-breakpoint
DROP TABLE `tags`;
--> statement-breakpoint
DROP TABLE `projects`;
--> statement-breakpoint
ALTER TABLE `__new_projects` RENAME TO `projects`;
--> statement-breakpoint
ALTER TABLE `__new_prompt_assets` RENAME TO `prompt_assets`;
--> statement-breakpoint
ALTER TABLE `__new_prompt_versions` RENAME TO `prompt_versions`;
--> statement-breakpoint
ALTER TABLE `__new_tags` RENAME TO `tags`;
--> statement-breakpoint
ALTER TABLE `__new_prompt_tags` RENAME TO `prompt_tags`;
--> statement-breakpoint
ALTER TABLE `__new_harness_templates` RENAME TO `harness_templates`;
--> statement-breakpoint
ALTER TABLE `__new_settings` RENAME TO `settings`;
--> statement-breakpoint
CREATE INDEX `prompt_assets_project_id_idx` ON `prompt_assets` (`project_id`);
--> statement-breakpoint
CREATE INDEX `prompt_assets_parent_prompt_id_idx` ON `prompt_assets` (`parent_prompt_id`);
--> statement-breakpoint
CREATE INDEX `prompt_versions_prompt_asset_id_idx` ON `prompt_versions` (`prompt_asset_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `prompt_versions_prompt_asset_version_idx` ON `prompt_versions` (`prompt_asset_id`, `version_number`);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);
--> statement-breakpoint
PRAGMA foreign_keys = ON;
