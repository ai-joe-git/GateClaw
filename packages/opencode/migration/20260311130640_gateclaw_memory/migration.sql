CREATE TABLE `gc_fact` (
	`id` text PRIMARY KEY,
	`key` text NOT NULL UNIQUE,
	`value` text NOT NULL,
	`time_created` integer NOT NULL,
	`time_updated` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `gc_message` (
	`id` text PRIMARY KEY,
	`session_key` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`time_created` integer NOT NULL,
	`time_updated` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `gc_task` (
	`id` text PRIMARY KEY,
	`description` text NOT NULL,
	`interval_ms` integer NOT NULL,
	`last_run` integer,
	`enabled` integer DEFAULT 1 NOT NULL,
	`time_created` integer NOT NULL,
	`time_updated` integer NOT NULL
);
