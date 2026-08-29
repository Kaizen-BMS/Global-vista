-- ============================================================================
-- Migration: Announcement dismissals (dashboard banner)
--
-- The dashboard's "Company Announcement" banner originally reused
-- conversations_participants.last_read_at to decide "has this person seen
-- it" — but that field is also touched by two things that have nothing to
-- do with the dashboard banner: sending the message yourself (marks your
-- own last_read_at immediately, so the person who POSTED the announcement
-- can never see their own banner), and simply opening the Messages page
-- (auto-marks the thread read, silently dismissing the banner without the
-- explicit "I've seen this" click). This table gives the banner its own,
-- explicit dismissal record tied to a specific message id, so a new
-- announcement is automatically "unseen" for everyone again regardless of
-- old dismissals or unrelated last_read_at changes.
-- ============================================================================

CREATE TABLE announcement_dismissals (
  id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  conversation_id BIGINT(20) UNSIGNED NOT NULL,
  user_id INT(10) UNSIGNED NOT NULL,
  message_id BIGINT(20) UNSIGNED NOT NULL,
  dismissed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_announcement_dismissal (conversation_id, user_id),
  KEY idx_ad_message (message_id),
  CONSTRAINT fk_ad_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  CONSTRAINT fk_ad_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ============================================================================
-- EXISTING DATA AFFECTED: none — one brand-new, empty table.
--
-- ROLLBACK SQL:
-- DROP TABLE announcement_dismissals;
--
-- VERIFICATION SQL:
-- SHOW TABLES LIKE 'announcement_dismissals';
-- ============================================================================
