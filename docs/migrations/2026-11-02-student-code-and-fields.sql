-- WHY: Schools need a counsellor-facing "Student ID" that's visibly their
-- own (not the generic cross-tenant GV-2026-xxxxxx Lead Number), auto
-- generated from the school's own short name + academic year + a running
-- sequence (e.g. KHL-2026-0001). Additive, nullable — every non-child
-- company simply never has this column populated.
ALTER TABLE leads ADD COLUMN student_code VARCHAR(32) NULL DEFAULT NULL AFTER lead_number;

-- New Add Student fields (Parent Mobile, Class, Subjects, District,
-- School, Academic Year) are seeded per-company as `lead_custom_fields`
-- rows (same EAV mechanism as Stream/Registration Number/Parent Name from
-- the prior phase) — this file documents the shape; the actual INSERTs for
-- the 5 existing school companies (28-32) were run via a short-lived Node
-- script per the project's standing DB-migration convention, and the same
-- seeding is now added to src/lib/platform/actions/provisioning.js so every
-- future child company gets them automatically. See that function for the
-- exact field_key/label/options_json values.

-- Rollback:
-- ALTER TABLE leads DROP COLUMN student_code;
-- DELETE FROM lead_custom_fields WHERE field_key IN ('parent_mobile','class','subjects','district','school_name','academic_year') AND company_id IN (28,29,30,31,32);

-- Verification:
-- DESCRIBE leads; -- confirm student_code exists
-- SELECT company_id, field_key, label, field_type, options_json FROM lead_custom_fields WHERE field_key IN ('parent_mobile','class','subjects','district','school_name','academic_year') ORDER BY company_id;
