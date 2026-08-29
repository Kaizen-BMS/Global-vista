-- ============================================================================
-- Migration: Track WHEN a follow-up was actually completed (not just when
-- it was originally scheduled/due)
-- Database:  u111637957_gv_crm (Hostinger phpMyAdmin)
--
-- Real bug this fixes: getFollowupDashboard's "Completed Today" list/count
-- filtered on DATE(scheduled_at) = CURDATE() — the ORIGINAL due date, not
-- the completion date. An overdue follow-up (scheduled for a past date)
-- that an employee completes today never showed up as completed today,
-- because its scheduled_at is still in the past. There was no column
-- anywhere recording the actual completion moment.
--
-- Existing rows: completed_at stays NULL for every follow-up completed
-- before this migration runs (that historical completion moment was never
-- recorded and can't be reconstructed) — code treats a NULL completed_at
-- on an already-Completed row by falling back to its old (inaccurate)
-- behavior for that one row, never a crash.
-- ============================================================================

ALTER TABLE lead_followups
  ADD COLUMN completed_at DATETIME NULL DEFAULT NULL AFTER scheduled_at;

-- ============================================================================
-- ROLLBACK (only if you need to undo this migration)
-- ============================================================================
-- ALTER TABLE lead_followups DROP COLUMN completed_at;
