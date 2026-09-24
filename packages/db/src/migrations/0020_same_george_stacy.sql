DROP INDEX "account_userId_idx";--> statement-breakpoint
DROP INDEX "session_token_unique";--> statement-breakpoint
DROP INDEX "session_userId_idx";--> statement-breakpoint
DROP INDEX "user_email_unique";--> statement-breakpoint
DROP INDEX "verification_identifier_idx";--> statement-breakpoint
DROP INDEX "meal_user_day_idx";--> statement-breakpoint
DROP INDEX "medication_user_idx";--> statement-breakpoint
DROP INDEX "medication_intake_user_day_idx";--> statement-breakpoint
DROP INDEX "medication_intake_unique_idx";--> statement-breakpoint
DROP INDEX "water_log_user_day_idx";--> statement-breakpoint
DROP INDEX "goal_user_domain_idx";--> statement-breakpoint
DROP INDEX "appointment_user_scheduled_idx";--> statement-breakpoint
DROP INDEX "appointment_user_status_idx";--> statement-breakpoint
DROP INDEX "exam_user_idx";--> statement-breakpoint
DROP INDEX "weight_log_user_day_idx";--> statement-breakpoint
DROP INDEX "mind_note_user_created_idx";--> statement-breakpoint
DROP INDEX "mind_note_user_day_idx";--> statement-breakpoint
DROP INDEX "mood_checkin_user_day_idx";--> statement-breakpoint
DROP INDEX "push_subscription_user_idx";--> statement-breakpoint
DROP INDEX "push_subscription_endpoint_idx";--> statement-breakpoint
DROP INDEX "reminder_user_idx";--> statement-breakpoint
DROP INDEX "reminder_user_type_idx";--> statement-breakpoint
DROP INDEX "reminder_delivery_user_day_idx";--> statement-breakpoint
DROP INDEX "reminder_delivery_unique_idx";--> statement-breakpoint
DROP INDEX "exercise_workout_idx";--> statement-breakpoint
DROP INDEX "session_exercise_session_idx";--> statement-breakpoint
DROP INDEX "set_log_session_idx";--> statement-breakpoint
DROP INDEX "set_log_session_exercise_idx";--> statement-breakpoint
DROP INDEX "set_log_user_exercise_idx";--> statement-breakpoint
DROP INDEX "workout_user_idx";--> statement-breakpoint
DROP INDEX "workout_session_user_day_idx";--> statement-breakpoint
ALTER TABLE `medication` ALTER COLUMN "stock" TO "stock" real;--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE INDEX `meal_user_day_idx` ON `meal` (`user_id`,`day`);--> statement-breakpoint
CREATE INDEX `medication_user_idx` ON `medication` (`user_id`);--> statement-breakpoint
CREATE INDEX `medication_intake_user_day_idx` ON `medication_intake` (`user_id`,`day`);--> statement-breakpoint
CREATE UNIQUE INDEX `medication_intake_unique_idx` ON `medication_intake` (`medication_id`,`day`,`time`);--> statement-breakpoint
CREATE INDEX `water_log_user_day_idx` ON `water_log` (`user_id`,`day`);--> statement-breakpoint
CREATE UNIQUE INDEX `goal_user_domain_idx` ON `goal` (`user_id`,`domain`);--> statement-breakpoint
CREATE INDEX `appointment_user_scheduled_idx` ON `appointment` (`user_id`,`scheduled_at`);--> statement-breakpoint
CREATE INDEX `appointment_user_status_idx` ON `appointment` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `exam_user_idx` ON `exam` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `weight_log_user_day_idx` ON `weight_log` (`user_id`,`day`);--> statement-breakpoint
CREATE INDEX `mind_note_user_created_idx` ON `mind_note` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `mind_note_user_day_idx` ON `mind_note` (`user_id`,`day`);--> statement-breakpoint
CREATE UNIQUE INDEX `mood_checkin_user_day_idx` ON `mood_checkin` (`user_id`,`day`);--> statement-breakpoint
CREATE INDEX `push_subscription_user_idx` ON `push_subscription` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscription_endpoint_idx` ON `push_subscription` (`endpoint`);--> statement-breakpoint
CREATE INDEX `reminder_user_idx` ON `reminder` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `reminder_user_type_idx` ON `reminder` (`user_id`,`type`);--> statement-breakpoint
CREATE INDEX `reminder_delivery_user_day_idx` ON `reminder_delivery` (`user_id`,`day`);--> statement-breakpoint
CREATE UNIQUE INDEX `reminder_delivery_unique_idx` ON `reminder_delivery` (`reminder_id`,`day`,`slot`,`ref_id`);--> statement-breakpoint
CREATE INDEX `exercise_workout_idx` ON `exercise` (`workout_id`);--> statement-breakpoint
CREATE INDEX `session_exercise_session_idx` ON `session_exercise` (`session_id`);--> statement-breakpoint
CREATE INDEX `set_log_session_idx` ON `set_log` (`session_id`);--> statement-breakpoint
CREATE INDEX `set_log_session_exercise_idx` ON `set_log` (`session_exercise_id`);--> statement-breakpoint
CREATE INDEX `set_log_user_exercise_idx` ON `set_log` (`user_id`,`exercise_name`);--> statement-breakpoint
CREATE INDEX `workout_user_idx` ON `workout` (`user_id`);--> statement-breakpoint
CREATE INDEX `workout_session_user_day_idx` ON `workout_session` (`user_id`,`day`);--> statement-breakpoint
ALTER TABLE `medication` ADD `dose_amount` real DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `medication` ADD `dose_unit` text DEFAULT 'comp' NOT NULL;--> statement-breakpoint
ALTER TABLE `medication_intake` ADD `stock_delta` real;--> statement-breakpoint
-- Tomas antigas descontavam sempre 1 unidade.
UPDATE `medication_intake` SET `stock_delta` = 1 WHERE `stock_decremented` = 1;