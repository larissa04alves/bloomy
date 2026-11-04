CREATE TABLE `rest_alarm` (
	`user_id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`ends_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
