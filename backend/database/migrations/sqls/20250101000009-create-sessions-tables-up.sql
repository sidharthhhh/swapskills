CREATE TABLE sessions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  match_id INT UNSIGNED NOT NULL,
  teacher_id INT UNSIGNED NOT NULL,
  learner_id INT UNSIGNED NOT NULL,
  skill_id INT UNSIGNED NOT NULL,
  scheduled_at DATETIME NOT NULL,
  duration_min TINYINT DEFAULT 60,
  status ENUM('scheduled','completed','cancelled','no_show') DEFAULT 'scheduled',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES matches(id),
  FOREIGN KEY (teacher_id) REFERENCES users(id),
  FOREIGN KEY (learner_id) REFERENCES users(id)
);

CREATE TABLE session_notes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
