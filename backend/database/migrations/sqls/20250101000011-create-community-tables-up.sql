CREATE TABLE communities (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  skill_id INT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  FOREIGN KEY (skill_id) REFERENCES skills(id)
);

CREATE TABLE posts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  community_id INT UNSIGNED NOT NULL,
  author_id INT UNSIGNED NOT NULL,
  content TEXT NOT NULL,
  upvotes INT DEFAULT 0,
  status ENUM('active','removed','flagged') DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (community_id) REFERENCES communities(id),
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE TABLE comments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id INT UNSIGNED NOT NULL,
  author_id INT UNSIGNED NOT NULL,
  content TEXT NOT NULL,
  parent_id INT UNSIGNED NULL,
  upvotes INT DEFAULT 0,
  status ENUM('active','removed') DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id),
  FOREIGN KEY (parent_id) REFERENCES comments(id)
);

CREATE TABLE post_votes (
  user_id INT UNSIGNED NOT NULL,
  post_id INT UNSIGNED NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (post_id) REFERENCES posts(id)
);
