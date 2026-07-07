CREATE TABLE `exercise` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_id` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`target_sets` integer NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`workout_id`) REFERENCES `workout`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `exercise_workout_idx` ON `exercise` (`workout_id`);--> statement-breakpoint
CREATE TABLE `set_log` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`exercise_id` text,
	`user_id` text NOT NULL,
	`exercise_name` text NOT NULL,
	`set_index` integer NOT NULL,
	`reps` integer,
	`load` real,
	`done` integer DEFAULT false NOT NULL,
	`done_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `workout_session`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `set_log_session_idx` ON `set_log` (`session_id`);--> statement-breakpoint
CREATE TABLE `workout` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`focus` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workout_user_idx` ON `workout` (`user_id`);--> statement-breakpoint
CREATE TABLE `workout_session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`workout_id` text NOT NULL,
	`day` text NOT NULL,
	`started_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`completed_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workout_id`) REFERENCES `workout`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workout_session_user_day_idx` ON `workout_session` (`user_id`,`day`);