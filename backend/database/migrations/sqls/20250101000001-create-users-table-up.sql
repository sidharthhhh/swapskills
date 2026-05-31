CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uid VARCHAR(16) UNIQUE NOT NULL,
  username VARCHAR(64) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  bio TEXT,
  experience_level ENUM('beginner','intermediate','advanced','expert') DEFAULT 'beginner',
  availability ENUM('weekdays','weekends','flexible') DEFAULT 'flexible',
  trust_score DECIMAL(5,2) DEFAULT 100.00,
  status ENUM('active','suspended','banned','cooldown') DEFAULT 'active',
  cooldown_until DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
