CREATE TABLE `login_attempts` (
	`phone` text NOT NULL,
	`created_at` text NOT NULL
);
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`product_name` text NOT NULL,
	`customer_phone` text NOT NULL,
	`province` text NOT NULL,
	`quantity` integer NOT NULL,
	`address` text NOT NULL,
	`price` integer NOT NULL,
	`photo_path` text NOT NULL,
	`status` text DEFAULT 'registered' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`processed_at` text,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`phone` text NOT NULL,
	`pin_hash` text NOT NULL,
	`pin_salt` text NOT NULL,
	`role` text DEFAULT 'agent' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`selfie_path` text,
	`created_at` text NOT NULL
);
CREATE UNIQUE INDEX `users_phone_unique` ON `users` (`phone`);