-- Lets a company be a "child" of another company (e.g. a school under
-- Global Vista Educators, company id 9). A child company is a completely
-- normal, fully-isolated company row in every other respect — this
-- column only records the relationship for (a) the platform-operator
-- "Create Company" wizard's optional parent picker, (b) the
-- billing-exemption bypass in permissions.js/workspace layout, (c) the
-- parent Super Admin's "switch into" flow.
--
-- Purely additive: adds a new nullable column to an existing table. It
-- does not read, modify, or delete any existing row's data — company 9
-- (or any other existing company) is completely unaffected by running
-- this; it only ever becomes "a parent" because some OTHER, brand-new
-- company's own row later sets parent_company_id = 9 on itself.
--
-- ON DELETE RESTRICT (not CASCADE) is deliberate, matching this
-- project's existing convention in deleteCompany() of never letting one
-- company's deletion silently cascade into another tenant's data —
-- a parent company becomes undeletable for as long as it still has
-- children, which must fail loudly rather than silently destroy or
-- orphan a child's independent data.

ALTER TABLE companies
  ADD COLUMN parent_company_id INT UNSIGNED NULL AFTER id,
  ADD CONSTRAINT fk_companies_parent_company
    FOREIGN KEY (parent_company_id) REFERENCES companies(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD INDEX idx_companies_parent_company_id (parent_company_id);
