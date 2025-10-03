-- phpMyAdmin SQL Dump
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET NAMES utf8mb4 */;

-- --------------------------------------------------------
-- Drop tables in correct order to avoid foreign key errors
-- --------------------------------------------------------
DROP TABLE IF EXISTS `vehicle_images`;
DROP TABLE IF EXISTS `vehicles`;
DROP TABLE IF EXISTS `models`;
DROP TABLE IF EXISTS `makes`;
DROP TABLE IF EXISTS `users`;

-- --------------------------------------------------------
-- Table: makes
-- --------------------------------------------------------
CREATE TABLE `makes` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_make_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: models
-- --------------------------------------------------------
CREATE TABLE `models` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `make_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_models_make_id` (`make_id`),
  CONSTRAINT `fk_models_makes` FOREIGN KEY (`make_id`) REFERENCES `makes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: users
-- --------------------------------------------------------
CREATE TABLE `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `role` ENUM('admin','user','moderator') NOT NULL DEFAULT 'user',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: vehicles
-- --------------------------------------------------------
CREATE TABLE `vehicles` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `model_id` INT UNSIGNED NOT NULL,
  `vin` VARCHAR(17) NOT NULL,
  `year` SMALLINT UNSIGNED NOT NULL CHECK (`year` BETWEEN 1800 AND 2099),
  `price` DECIMAL(10,2) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `engine` VARCHAR(50) DEFAULT NULL,
  `mileage` INT UNSIGNED DEFAULT NULL,
  `fuel_type` ENUM('Petrol','Diesel','Electric','Hybrid','Other') DEFAULT NULL,
  `transmission` ENUM('Manual','Automatic','Semi-Auto') DEFAULT NULL,
  `doors` TINYINT UNSIGNED DEFAULT NULL,
  `seats` TINYINT UNSIGNED DEFAULT NULL,
  `location` VARCHAR(255) DEFAULT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vehicles_vin` (`vin`),
  KEY `idx_vehicles_model_id` (`model_id`),
  KEY `idx_vehicles_user_id` (`user_id`),
  CONSTRAINT `fk_vehicles_models` FOREIGN KEY (`model_id`) REFERENCES `models`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_vehicles_users` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: vehicle_images
-- --------------------------------------------------------
CREATE TABLE `vehicle_images` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `vehicle_id` INT UNSIGNED NOT NULL,
  `image_url` VARCHAR(255) NOT NULL,
  `is_cover` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_vehicle_images_vehicle_id` (`vehicle_id`),
  CONSTRAINT `fk_vehicle_images_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;
