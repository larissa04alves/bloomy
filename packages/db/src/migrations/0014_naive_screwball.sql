CREATE TABLE `session_exercise` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`user_id` text NOT NULL,
	`exercise_id` text,
	`name` text NOT NULL,
	`target_sets` integer NOT NULL,
	`target_reps` integer DEFAULT 12 NOT NULL,
	`rest_seconds` integer DEFAULT 45 NOT NULL,
	`position` integer NOT NULL,
	`catalog_id` text,
	`muscle_group` text,
	`origin` text DEFAULT 'template' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `workout_session`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`catalog_id`) REFERENCES `exercise_catalog`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `session_exercise_session_idx` ON `session_exercise` (`session_id`);--> statement-breakpoint
ALTER TABLE `set_log` ADD `session_exercise_id` text REFERENCES session_exercise(id);
--> statement-breakpoint
INSERT INTO `session_exercise` (
  `id`, `session_id`, `user_id`, `exercise_id`, `name`,
  `target_sets`, `target_reps`, `rest_seconds`, `position`,
  `catalog_id`, `muscle_group`, `origin`, `created_at`
)
SELECT
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4'
    || substr(lower(hex(randomblob(2))), 2) || '-'
    || substr('89ab', abs(random()) % 4 + 1, 1)
    || substr(lower(hex(randomblob(2))), 2) || '-'
    || lower(hex(randomblob(6))),
  ws.`id`, ws.`user_id`, e.`id`, e.`name`,
  e.`target_sets`, e.`target_reps`, e.`rest_seconds`, e.`position`,
  e.`catalog_id`, e.`muscle_group`, 'template',
  cast(unixepoch('subsecond') * 1000 as integer)
FROM `workout_session` ws
JOIN `exercise` e ON e.`workout_id` = ws.`workout_id`;
--> statement-breakpoint
UPDATE `set_log` SET `session_exercise_id` = (
  SELECT se.`id` FROM `session_exercise` se
  WHERE se.`session_id` = `set_log`.`session_id`
    AND se.`exercise_id` = `set_log`.`exercise_id`
)
WHERE `exercise_id` IS NOT NULL;