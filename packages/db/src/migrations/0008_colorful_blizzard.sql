CREATE TABLE `exercise_catalog` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_pt` text NOT NULL,
	`group` text NOT NULL,
	`body_part` text NOT NULL,
	`target` text NOT NULL,
	`equipment` text NOT NULL,
	`secondary_muscles` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `exercise` ADD `catalog_id` text REFERENCES exercise_catalog(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `exercise` ADD `muscle_group` text;