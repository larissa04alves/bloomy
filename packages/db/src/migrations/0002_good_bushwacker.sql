CREATE TABLE `profile` (
	`user_id` text PRIMARY KEY NOT NULL,
	`onboarding_completed_at` integer,
	`rest_seconds` integer DEFAULT 45 NOT NULL,
	`auto_rest` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
