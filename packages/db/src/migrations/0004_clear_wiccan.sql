CREATE TABLE `appointment` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`professional` text NOT NULL,
	`specialty` text,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`scheduled_at` integer,
	`suggested_at` integer,
	`completed_at` integer,
	`location` text,
	`remind_day_before` integer DEFAULT false NOT NULL,
	`parent_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `appointment`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `appointment_user_scheduled_idx` ON `appointment` (`user_id`,`scheduled_at`);--> statement-breakpoint
CREATE INDEX `appointment_user_status_idx` ON `appointment` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `exam` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'to_schedule' NOT NULL,
	`scheduled_at` integer,
	`suggested_at` integer,
	`completed_at` integer,
	`parent_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `exam`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `exam_user_idx` ON `exam` (`user_id`);