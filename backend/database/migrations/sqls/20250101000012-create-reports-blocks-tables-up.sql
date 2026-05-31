CREATE TABLE reports (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reporter_id   INT UNSIGNED NOT NULL,
  target_type   ENUM('user','post','comment','message','match') NOT NULL,
  target_id     INT UNSIGNED NOT NULL,
  reason        ENUM('spam','harassment','ghosting','inappropriate','other') NOT NULL,
  detail        TEXT NULL,
  status        ENUM('open','in_review','resolved','dismissed') DEFAULT 'open',
  resolved_by   INT UNSIGNED NULL,
  resolution    TEXT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reporter_id) REFERENCES users(id)
);

CREATE TABLE blocks (
  blocker_id INT UNSIGNED NOT NULL,
  blocked_id INT UNSIGNED NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (blocker_id, blocked_id),
  FOREIGN KEY (blocker_id) REFERENCES users(id),
  FOREIGN KEY (blocked_id) REFERENCES users(id)
);
