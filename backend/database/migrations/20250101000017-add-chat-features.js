'use strict';
var dbm;
exports.setup = function(options) { dbm = options.dbmigrate; };
exports.up = function(db) {
  return db.runSql(`
    -- Message reactions table
    CREATE TABLE IF NOT EXISTS message_reactions (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      message_id INT UNSIGNED NOT NULL,
      user_id INT UNSIGNED NOT NULL,
      emoji VARCHAR(10) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_reaction (message_id, user_id, emoji),
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Add reply_to_id column to messages table
    ALTER TABLE messages ADD COLUMN reply_to_id INT UNSIGNED NULL AFTER content_type;
    ALTER TABLE messages ADD FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL;

    -- Add file_url and file_type columns to messages table
    ALTER TABLE messages ADD COLUMN file_url VARCHAR(500) NULL AFTER language;
    ALTER TABLE messages ADD COLUMN file_name VARCHAR(255) NULL AFTER file_url;
    ALTER TABLE messages ADD COLUMN file_size INT UNSIGNED NULL AFTER file_name;

    -- Update content_type enum to include 'image' and 'file'
    ALTER TABLE messages MODIFY COLUMN content_type ENUM('text','code','image','file') DEFAULT 'text';
  `);
};
exports.down = function(db) {
  return db.runSql(`
    DROP TABLE IF EXISTS message_reactions;
    ALTER TABLE messages DROP FOREIGN KEY messages_ibfk_3;
    ALTER TABLE messages DROP COLUMN reply_to_id;
    ALTER TABLE messages DROP COLUMN file_url;
    ALTER TABLE messages DROP COLUMN file_name;
    ALTER TABLE messages DROP COLUMN file_size;
    ALTER TABLE messages MODIFY COLUMN content_type ENUM('text','code') DEFAULT 'text';
  `);
};
