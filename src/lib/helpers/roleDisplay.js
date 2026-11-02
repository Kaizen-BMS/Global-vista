// Every company's cloned "super-admin"-slug role is named "Company Owner"
// (see docs/migrations/2026-09-08-single-owner-role-template.sql). Schools
// already have their own dedicated, limited-permission "Principal" role
// from the predefined-roles set, so the super-admin/owner account is
// labeled "School Owner" instead — picking "Principal" here would collide
// with that existing role. The role row itself is shared by every company
// and can't be renamed without affecting all of them, so the override
// happens only at display time, here.
export function displayRoleName(roleName, roleSlug, isChildCompany) {
  if (isChildCompany && roleSlug === "super-admin") return "School Owner";
  return roleName;
}
