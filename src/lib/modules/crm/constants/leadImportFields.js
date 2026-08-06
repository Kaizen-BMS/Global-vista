/**
 * The mappable CRM fields for the lead-import column-mapping step.
 * Plain data/no server imports so both the client wizard and the
 * server-only validation action can import it without crossing the
 * client/server boundary.
 */
export const LEAD_IMPORT_FIELDS = [
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
];
