-- ============================================================================
-- Migration: Editable lead notes with edit audit trail
-- Database:  u111637957_gv_crm (Hostinger phpMyAdmin)
-- Verified against LIVE schema on 2026-08-24 — lead_notes currently has no
-- updated_by/updated_at columns (only created_by/created_at).
--
-- Adds the two columns needed to record WHO last edited a note and WHEN,
-- shown on the note in the lead activity timeline. Both NULLable and
-- default NULL — an existing, never-edited note simply shows no "edited"
-- marker; nothing about existing rows changes.
-- ============================================================================

ALTER TABLE lead_notes
  ADD COLUMN updated_by INT(10) UNSIGNED NULL DEFAULT NULL AFTER created_by,
  ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL AFTER created_at;

-- ============================================================================
-- ROLLBACK (only if you need to undo this migration)
-- ============================================================================
-- ALTER TABLE lead_notes DROP COLUMN updated_by, DROP COLUMN updated_at;
