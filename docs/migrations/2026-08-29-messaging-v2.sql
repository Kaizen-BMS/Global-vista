-- Messaging v2: editable messages (2-minute window), system messages
-- (e.g. "X left the group"), and blocking between employees.
-- Run manually against production; the app degrades gracefully (features
-- simply stay hidden) until this has been applied — see schemaFlags.js.

ALTER TABLE messages
  ADD COLUMN message_type ENUM('text','system') NOT NULL DEFAULT 'text' AFTER sender_id,
  ADD COLUMN edited_at TIMESTAMP NULL DEFAULT NULL AFTER body;

CREATE TABLE IF NOT EXISTS blocked_users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id INT UNSIGNED NOT NULL,
  blocker_id INT UNSIGNED NOT NULL,
  blocked_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_blocker_blocked (blocker_id, blocked_id),
  KEY idx_blocked_company (company_id),
  KEY idx_blocked_blocked (blocked_id)
);
