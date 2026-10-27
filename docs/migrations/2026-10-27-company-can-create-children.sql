-- Lets a specific company (e.g. Global Vista Educators) create its OWN
-- child companies directly from its own workspace Settings, instead of
-- only via the separate Platform Console. Defaults to 0/off for every
-- company — this is an explicit grant the Platform Operator switches on
-- per company (via the toggle on /platform/companies/[id]), not a
-- self-service capability anyone can turn on for themselves.

ALTER TABLE companies
  ADD COLUMN can_create_child_companies TINYINT(1) NOT NULL DEFAULT 0 AFTER parent_company_id;
