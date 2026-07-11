CREATE TABLE `project_context_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`summary` text,
	`tech_stack` text,
	`architecture_notes` text,
	`coding_conventions` text,
	`constraints` text,
	`forbidden_actions` text,
	`acceptance_defaults` text,
	`validation_commands` text,
	`security_notes` text,
	`additional_context` text,
	`testing_notes` text,
	`package_manager` text,
	`default_branch` text,
	`repo_path` text,
	`is_default` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_context_profiles_project_id_idx` ON `project_context_profiles` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_context_profiles_default_unique_idx` ON `project_context_profiles` (`project_id`) WHERE is_default = 1;