CREATE TABLE skill_endorsements (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  endorser_id INT UNSIGNED NOT NULL,
  endorsed_id INT UNSIGNED NOT NULL,
  skill_id INT UNSIGNED NOT NULL,
  match_id INT UNSIGNED NOT NULL,
  rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_endorsement (endorser_id, endorsed_id, match_id),
  FOREIGN KEY (endorser_id) REFERENCES users(id),
  FOREIGN KEY (endorsed_id) REFERENCES users(id),
  FOREIGN KEY (skill_id) REFERENCES skills(id),
  FOREIGN KEY (match_id) REFERENCES matches(id)
);
