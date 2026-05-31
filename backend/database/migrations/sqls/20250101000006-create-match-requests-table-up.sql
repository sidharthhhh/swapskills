CREATE TABLE match_requests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sender_id INT UNSIGNED NOT NULL,
  receiver_id INT UNSIGNED NOT NULL,
  teach_skill_id INT UNSIGNED NOT NULL,
  learn_skill_id INT UNSIGNED NOT NULL,
  status ENUM('pending','accepted','rejected','expired') DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (receiver_id) REFERENCES users(id)
);
