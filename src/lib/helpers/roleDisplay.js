// Every company's cloned "super-admin"-slug role is named "Company Owner"
// (see docs/migrations/2026-09-08-single-owner-role-template.sql) — for a
// school that's really the Principal. The role row itself is shared by
// every company and can't be renamed without affecting all of them, so
// the override happens only at display time, here.
export function displayRoleName(roleName, roleSlug, isChildCompany) {
  if (isChildCompany && roleSlug === "super-admin") return "Principal";
  return roleName;
}
