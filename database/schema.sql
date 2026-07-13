-- CivicFix Database Schema
-- Import this in phpMyAdmin (XAMPP) before running the app

CREATE DATABASE IF NOT EXISTS civicfix;
USE civicfix;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('citizen','admin') DEFAULT 'citizen',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'Other',
  status ENUM('pending','in_progress','resolved') DEFAULT 'pending',
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  photo_path VARCHAR(255),
  duplicate_of INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (duplicate_of) REFERENCES complaints(id) ON DELETE SET NULL
);

CREATE TABLE complaint_updates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT NOT NULL,
  status ENUM('pending','in_progress','resolved') NOT NULL,
  remarks TEXT,
  updated_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Seed one admin account (password is "admin123", hashed with PHP password_hash)
-- We'll create this via register.php in practice, but here's a manual fallback:
-- INSERT INTO users (name, email, password, role) VALUES
-- ('Admin', 'admin@civicfix.com', '$2y$10$examplehashreplaceafterrunningregister', 'admin');
