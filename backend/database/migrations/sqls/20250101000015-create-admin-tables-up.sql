CREATE TABLE admin_users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(64) UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('super_admin','moderator','analyst') DEFAULT 'moderator',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_log (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id    INT UNSIGNED NOT NULL,
  action      VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id   INT UNSIGNED NOT NULL,
  metadata    JSON NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admin_users(id)
);
