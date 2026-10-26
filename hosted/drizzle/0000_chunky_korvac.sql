CREATE TABLE `customers` (
	`user_id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`checkout_id` text,
	`checkout_expires` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_customer_id_unique` ON `customers` (`customer_id`);--> statement-breakpoint
CREATE TABLE `favorites` (
	`user_id` text NOT NULL,
	`story_id` text NOT NULL,
	PRIMARY KEY(`user_id`, `story_id`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text NOT NULL,
	`bucket` integer NOT NULL,
	`count` integer NOT NULL,
	PRIMARY KEY(`key`, `bucket`)
);
--> statement-breakpoint
CREATE TABLE `stripe_events` (
	`id` text PRIMARY KEY NOT NULL,
	`processed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`category` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`author` text NOT NULL,
	`place` text NOT NULL,
	`source_url` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`reviewed_by` text
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`price_id` text NOT NULL,
	`status` text NOT NULL,
	`period_end` integer NOT NULL,
	`cancel_at_period_end` integer NOT NULL,
	`updated_at` integer NOT NULL
);
