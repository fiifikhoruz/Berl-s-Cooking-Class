CREATE TABLE `availability_overrides` (
	`key` text PRIMARY KEY NOT NULL,
	`session_date` text NOT NULL,
	`session_time` text NOT NULL,
	`available` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `availability_overrides_date` ON `availability_overrides` (`session_date`);--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`dish_id` text NOT NULL,
	`dish_name` text NOT NULL,
	`session_date` text NOT NULL,
	`session_time` text NOT NULL,
	`guest_name` text NOT NULL,
	`guest_email` text NOT NULL,
	`guest_phone` text,
	`notes` text,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_unique_slot` ON `bookings` (`session_date`,`session_time`);--> statement-breakpoint
CREATE INDEX `bookings_session_date` ON `bookings` (`session_date`);--> statement-breakpoint
CREATE INDEX `bookings_guest_email` ON `bookings` (`guest_email`);
--> statement-breakpoint
PRAGMA optimize;
