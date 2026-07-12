CREATE TABLE `prompt_quality_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`prompt_version_id` text NOT NULL,
	`source` text NOT NULL,
	`review_mode` text NOT NULL,
	`overall_score` integer NOT NULL,
	`grade` text NOT NULL,
	`dimension_scores` text NOT NULL,
	`strengths` text NOT NULL,
	`issues` text NOT NULL,
	`suggestions` text NOT NULL,
	`missing_sections` text NOT NULL,
	`warnings` text NOT NULL,
	`recommended_clarifying_questions` text NOT NULL,
	`score_explanation` text NOT NULL,
	`snapshot` text NOT NULL,
	`improved_prompt_draft` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`prompt_version_id`) REFERENCES `prompt_versions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `prompt_quality_reviews_prompt_version_created_at_idx` ON `prompt_quality_reviews` (`prompt_version_id`,`created_at`);