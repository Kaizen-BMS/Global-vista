/**
 * The single source of truth for every BUILT-IN (physical `leads` column)
 * field the Lead Form Builder can configure. `key` is the camelCase name
 * every existing action/API already uses (createLead/updateLead's payload,
 * LeadForm.js's form state) — this file never introduces a new key, it only
 * describes the ones that already exist, so a company's visibility/label/
 * order override can never drift from what the DB actually accepts.
 *
 * `column` is documentation of the real `leads` column this maps to — no
 * code here ever renames or retypes it.
 *
 * `coreRequired: true` marks the 4 fields whose physical column is
 * `NOT NULL` with no default (name, phone, lead_source_id, service_id) —
 * these can be relabeled and moved between sections, but can never be
 * hidden or made optional, or lead creation would fail at the database
 * itself. leadFieldLayout.js enforces this server-side; the UI just
 * disables the toggles so nobody hits the error in the first place.
 */
export const BUILTIN_LEAD_FIELDS = [
  { key: "name", column: "name", label: "Full Name", inputType: "text", section: "Personal Information", order: 0, coreRequired: true },
  { key: "phone", column: "phone", label: "Phone", inputType: "tel", section: "Personal Information", order: 1, coreRequired: true },
  { key: "email", column: "email", label: "Email", inputType: "email", section: "Personal Information", order: 2 },
  { key: "whatsapp", column: "whatsapp", label: "WhatsApp", inputType: "tel", section: "Personal Information", order: 3 },
  { key: "country", column: "country", label: "Country", inputType: "geo-country", section: "Personal Information", order: 4 },
  { key: "state", column: "state", label: "State", inputType: "geo-state", section: "Personal Information", order: 5 },
  { key: "city", column: "city", label: "City", inputType: "geo-city", section: "Personal Information", order: 6 },
  { key: "gender", column: "gender", label: "Gender", inputType: "select", options: ["male", "female", "other"], section: "Personal Information", order: 7 },
  { key: "dob", column: "dob", label: "Date of Birth", inputType: "date", section: "Personal Information", order: 8 },
  { key: "address", column: "address", label: "Address", inputType: "text", section: "Personal Information", order: 9 },

  { key: "school", column: "school", label: "School", inputType: "text", section: "Academic Information", order: 0 },
  { key: "college", column: "college", label: "College", inputType: "text", section: "Academic Information", order: 1 },
  { key: "currentQualification", column: "current_qualification", label: "Current Qualification", inputType: "text", section: "Academic Information", order: 2 },
  { key: "passingYear", column: "passing_year", label: "Passing Year", inputType: "number", section: "Academic Information", order: 3 },
  { key: "percentage", column: "percentage", label: "Percentage / GPA", inputType: "number", section: "Academic Information", order: 4 },
  { key: "englishTest", column: "english_test", label: "English Test", inputType: "select", options: ["IELTS", "PTE", "TOEFL", "Duolingo", "None"], section: "Academic Information", order: 5 },
  { key: "ieltsScore", column: "ielts_score", label: "IELTS Score", inputType: "number", section: "Academic Information", order: 6 },
  { key: "pteScore", column: "pte_score", label: "PTE Score", inputType: "number", section: "Academic Information", order: 7 },

  { key: "preferredCountry", column: "preferred_country", label: "Preferred Country", inputType: "geo-country", section: "Study Preferences", order: 0 },
  { key: "preferredUniversity", column: "preferred_university", label: "Preferred University", inputType: "text", section: "Study Preferences", order: 1 },
  { key: "preferredIntake", column: "preferred_intake", label: "Preferred Intake", inputType: "text", section: "Study Preferences", order: 2 },
  { key: "budget", column: "budget", label: "Budget", inputType: "text", section: "Study Preferences", order: 3 },

  { key: "passportStatus", column: "passport_status", label: "Passport Status", inputType: "select", options: ["Yes", "No", "Applied"], section: "Passport", order: 0 },

  { key: "leadSourceId", column: "lead_source_id", label: "Lead Source", inputType: "lead-source", section: "Source & Assignment", order: 0, coreRequired: true },
  { key: "serviceId", column: "service_id", label: "Service", inputType: "service", section: "Source & Assignment", order: 1, coreRequired: true },
  { key: "campaign", column: "campaign", label: "Campaign", inputType: "text", section: "Source & Assignment", order: 2 },
  { key: "assignedTo", column: "assigned_to", label: "Assign To", inputType: "employee", section: "Source & Assignment", order: 3 },
  { key: "priority", column: "priority", label: "Priority", inputType: "priority", section: "Source & Assignment", order: 4 },
  { key: "tags", column: "tags", label: "Tags", inputType: "tags", section: "Source & Assignment", order: 5 },

  { key: "remarks", column: "remarks", label: "Remarks", inputType: "textarea", section: "Notes", order: 0 },
  { key: "notes", column: "notes", label: "Notes", inputType: "textarea", section: "Notes", order: 1 },
];

export const BUILTIN_LEAD_FIELD_KEYS = new Set(BUILTIN_LEAD_FIELDS.map((f) => f.key));
export const CORE_REQUIRED_FIELD_KEYS = new Set(BUILTIN_LEAD_FIELDS.filter((f) => f.coreRequired).map((f) => f.key));

/**
 * Converts a raw `leads` row (snake_case physical columns, e.g. from
 * getLeadById's `SELECT l.*`) into the camelCase shape LeadForm's state —
 * and createLead/updateLead's payload — actually use. Single-word columns
 * (name, phone, email, ...) happen to be spelled identically either way,
 * but every multi-word one (current_qualification, passport_status,
 * lead_source_id, ...) does NOT, so skipping this conversion silently
 * leaves those fields blank on Edit Lead even though the lead has real
 * data — the exact bug this helper exists to prevent.
 */
export function leadRowToFormValues(lead) {
  const values = {};
  for (const f of BUILTIN_LEAD_FIELDS) {
    const raw = lead[f.column];
    if (raw === null || raw === undefined) { values[f.key] = ""; continue; }
    // mysql2 returns DATE columns as JS Date objects (no `dateStrings`
    // option set on the pool) — an <input type="date"> needs a plain
    // "YYYY-MM-DD" string, not a Date, or it silently renders empty.
    values[f.key] = raw instanceof Date ? raw.toISOString().slice(0, 10) : raw;
  }
  return values;
}

/** The system default section list/order — what a brand-new company (and
 * "Reset Form") starts from. Existing companies that have already
 * customized their sections are never silently migrated to a later change
 * of this list — it's only read at bootstrap/reset time. */
export const DEFAULT_SECTIONS = [
  { name: "Personal Information", description: null },
  { name: "Academic Information", description: null },
  { name: "Study Preferences", description: null },
  { name: "Passport", description: null },
  { name: "Source & Assignment", description: null },
  { name: "Notes", description: null },
];
