CREATE TABLE matches (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_a_id INT UNSIGNED NOT NULL,
  user_b_id INT UNSIGNED NOT NULL,
  skill_a_teaches_b INT UNSIGNED NOT NULL,
  skill_b_teaches_a INT UNSIGNED NOT NULL,
  status ENUM('active','completed','stalled','ghosted') DEFAULT 'active',
  sessions_a INT DEFAULT 0,
  sessions_b INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_a_id) REFERENCES users(id),
  FOREIGN KEY (user_b_id) REFERENCES users(id)
);
