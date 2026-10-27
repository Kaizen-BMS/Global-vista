-- Correction: the user confirmed company id 10 ("Global Vista Educators")
-- is the real parent company for schools, not company id 9 ("GVE") as
-- stated earlier (verified live: the account in their screenshot,
-- globalvistaeducators@gmail.com / employee GLOBAL-VISTA-EDUCATORS-1-001,
-- belongs to company 10, not 9).
--
-- Company 10's subscription (row id 4) is already on plan 13
-- ("Concierge", every limit column NULL = unlimited) and status='active'
-- — only its ends_at (2026-11-24) needed clearing so it never expires.
--
-- The earlier fix applied to company 9's subscription is left in place
-- (harmless — that company is simply unused) rather than reverted, to
-- avoid an unnecessary extra write to a row that isn't causing any
-- problem either way.

UPDATE company_subscriptions
SET ends_at = NULL
WHERE id = 4 AND company_id = 10;
