/**
 * The mappable CRM fields for the lead-import column-mapping step.
 * Plain data/no server imports so both the client wizard and the
 * server-only validation action can import it without crossing the
 * client/server boundary.
 */
export const LEAD_IMPORT_FIELDS = [
  // Universal — exact-match row-to-existing-record identifier, exported
  // alongside every company's own data (see src/app/api/leads/export/route.js).
  // Leaving it blank always means "create a new record," exactly like
  // today; mapping it lets a re-uploaded, edited export update the exact
  // right record instead of guessing from phone/email.
  { key: "leadId", label: "Lead/Student ID (leave blank to create new)", required: false },
  { key: "name", label: "Name", required: true },
  { key: "phone", label: "Phone", required: true },
  { key: "email", label: "Email", required: false },
  { key: "whatsapp", label: "WhatsApp", required: false },
  { key: "country", label: "Country", required: false },
  { key: "state", label: "State", required: false },
  { key: "city", label: "City", required: false },
  { key: "leadSourceName", label: "Lead Source", required: false },
  { key: "serviceName", label: "Interested Service", required: false },
  { key: "assignedToName", label: "Assigned User (name or email)", required: false },
  { key: "priority", label: "Priority", required: false },
  { key: "tags", label: "Tags (comma separated)", required: false },
  { key: "remarks", label: "Notes", required: false },
  // A historical note — e.g. from an offline tracking sheet a school's
  // counsellor filled in by hand — imported with the date it actually
  // happened, not the moment the import runs. Both optional; noteDate is
  // ignored unless noteContent is also present. Accepts YYYY-MM-DD or
  // YYYY-MM-DD HH:mm[:ss], or an Excel date-formatted cell.
  { key: "noteContent", label: "Note", required: false },
  { key: "noteDate", label: "Note Date (YYYY-MM-DD, optional time)", required: false },
  // A real scheduled Follow-up (not just a logged note) — same date
  // format as noteDate. followupType must be one of FOLLOWUP_TYPES
  // (leadStages.js) or falls back to "Custom".
  { key: "followupType", label: "Follow-up Type", required: false },
  { key: "followupDate", label: "Follow-up Date (YYYY-MM-DD, optional time)", required: false },
];

// noteContent/noteDate/followupType/followupDate are a sub-company-only
// feature (schools importing an offline counselling tracking sheet) —
// every other company's mapping UI, auto-map suggestions, and
// downloadable template simply never offer these fields at all, matching
// the real server-side enforcement in validateLeadImportRows/
// commitLeadImportChunk (leadImport.js), not just hiding them here.
// leadId is universal — exact-ID matching is safe and useful for every
// company, not a counselling-specific concept.
const SUB_COMPANY_ONLY_KEYS = new Set(["noteContent", "noteDate", "followupType", "followupDate"]);
export function getLeadImportFields(isChildCompany) {
  return isChildCompany ? LEAD_IMPORT_FIELDS : LEAD_IMPORT_FIELDS.filter((f) => !SUB_COMPANY_ONLY_KEYS.has(f.key));
}
