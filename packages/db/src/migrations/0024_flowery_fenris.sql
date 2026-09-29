ALTER TABLE `exercise` ADD `muscle_groups` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `session_exercise` ADD `muscle_groups` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `workout` ADD `focuses` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
UPDATE `workout` SET `focuses` = json_array(`focus`);--> statement-breakpoint
UPDATE `exercise` SET `muscle_groups` = CASE WHEN `muscle_group` IS NULL THEN '[]' ELSE json_array(`muscle_group`) END;--> statement-breakpoint
UPDATE `session_exercise` SET `muscle_groups` = CASE WHEN `muscle_group` IS NULL THEN '[]' ELSE json_array(`muscle_group`) END;
