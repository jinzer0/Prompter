CREATE TABLE `prompt_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`source_prompt_asset_id` text,
	`source_prompt_version_id` text,
	`scenario` text NOT NULL,
	`target_agent` text NOT NULL,
	`template_body` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`source_prompt_asset_id`) REFERENCES `prompt_assets`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`source_prompt_version_id`) REFERENCES `prompt_versions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `prompt_templates_source_prompt_asset_id_idx` ON `prompt_templates` (`source_prompt_asset_id`);--> statement-breakpoint
CREATE INDEX `prompt_templates_source_prompt_version_id_idx` ON `prompt_templates` (`source_prompt_version_id`);--> statement-breakpoint
CREATE INDEX `prompt_templates_scenario_idx` ON `prompt_templates` (`scenario`);--> statement-breakpoint
CREATE INDEX `prompt_templates_target_agent_idx` ON `prompt_templates` (`target_agent`);--> statement-breakpoint
CREATE INDEX `prompt_templates_updated_at_idx` ON `prompt_templates` (`updated_at`);--> statement-breakpoint
ALTER TABLE `prompt_assets` ADD `parent_prompt_version_id` text REFERENCES prompt_versions(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `prompt_assets` ADD `derivation_type` text;--> statement-breakpoint
CREATE INDEX `prompt_assets_parent_prompt_version_id_idx` ON `prompt_assets` (`parent_prompt_version_id`);--> statement-breakpoint
CREATE INDEX `prompt_assets_derivation_type_idx` ON `prompt_assets` (`derivation_type`);
