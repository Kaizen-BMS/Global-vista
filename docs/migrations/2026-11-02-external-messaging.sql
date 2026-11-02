-- GVE <-> school external messaging.
--
-- Adds counterparty_company_id to conversations: NULL for every existing
-- direct/group/broadcast row (single-company, unchanged), set on a new
-- 'external' row to the OTHER company in a GVE<->school shared thread.
-- company_id stays the canonical "owner" side (always GVE's id for an
-- external row, regardless of which side started the thread).
--
-- The unique key is a no-op for direct/group/broadcast rows (MySQL treats
-- NULL as distinct from NULL in a unique index), so it only ever
-- constrains 'external' rows to exactly one thread per (GVE, school) pair
-- — closing the race where both sides click "start" for the first time at
-- once.
ALTER TABLE conversations
  ADD COLUMN counterparty_company_id INT UNSIGNED NULL AFTER company_id,
  ADD CONSTRAINT fk_conversations_counterparty FOREIGN KEY (counterparty_company_id) REFERENCES companies(id) ON DELETE CASCADE,
  ADD UNIQUE KEY uq_external_pair (company_id, counterparty_company_id),
  ADD KEY idx_counterparty_company (counterparty_company_id),
  MODIFY COLUMN type ENUM('direct','group','broadcast','external') NOT NULL;
