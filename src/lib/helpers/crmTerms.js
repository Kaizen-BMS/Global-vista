/**
 * The single source for the Lead→Student relabel shown to sub-companies
 * (schools under a parent company, e.g. Global Vista Educators) — every
 * other company keeps seeing "Lead"/"Leads" exactly as before. Nothing
 * about the underlying `leads` table, permission slugs, or API routes
 * changes; this is display text only. Plain function (no "server-only")
 * so both server pages and client components can call it directly, once
 * the caller already has `session.is_child_company`.
 */
export function getCrmTerms(isChildCompany) {
  return isChildCompany
    ? { singular: "Student", plural: "Students", singularLower: "student", pluralLower: "students" }
    : { singular: "Lead", plural: "Leads", singularLower: "lead", pluralLower: "leads" };
}
