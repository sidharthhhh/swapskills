CREATE TABLE reputation_events (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  event_type ENUM('exchange_complete','endorsement_received','ghosting_penalty','no_show_penalty','positive_feedback','session_complete') NOT NULL,
  delta      DECIMAL(5,2) NOT NULL,
  note       TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
