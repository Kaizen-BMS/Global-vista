/**
 * The public-form field types are intentionally a fixed set, not fully
 * arbitrary custom fields — each one maps directly to a real captured
 * value the submission handler reads and writes to an existing `leads`
 * column (see the FORM_FIELD_TO_LEAD_COLUMN map in publicLeadForms.js),
 * consistent with there being no custom-fields storage in the schema yet.
 * A form is a configured subset + order + labels of these, not a fully
 * generic field-type system — that (admin-invented custom questions with
 * no fixed column) needs new schema; see the platform refinement report
 * for the exact SQL proposed for that, not built here.
 */
export const AVAILABLE_FORM_FIELDS = [
  { type: "name", label: "Full Name", inputType: "text", lockedRequired: true },
  { type: "phone", label: "Phone Number", inputType: "tel", lockedRequired: true },
  { type: "email", label: "Email Address", inputType: "email", lockedRequired: false },
  { type: "whatsapp", label: "WhatsApp Number", inputType: "tel", lockedRequired: false },
  { type: "country", label: "Country", inputType: "geo", lockedRequired: false },
  { type: "state", label: "State", inputType: "geo", lockedRequired: false },
  { type: "city", label: "City", inputType: "geo", lockedRequired: false },
  { type: "address", label: "Address", inputType: "text", lockedRequired: false },
  { type: "gender", label: "Gender", inputType: "select", lockedRequired: false },
  { type: "dob", label: "Date of Birth", inputType: "date", lockedRequired: false },
  { type: "school", label: "School", inputType: "text", lockedRequired: false },
  { type: "college", label: "College", inputType: "text", lockedRequired: false },
  { type: "currentQualification", label: "Current Qualification", inputType: "text", lockedRequired: false },
  { type: "englishTest", label: "English Test", inputType: "select", lockedRequired: false },
  { type: "preferredCountry", label: "Preferred Country", inputType: "geo", lockedRequired: false },
  { type: "preferredUniversity", label: "Preferred University", inputType: "text", lockedRequired: false },
  { type: "preferredIntake", label: "Preferred Intake", inputType: "text", lockedRequired: false },
  { type: "budget", label: "Budget", inputType: "number", lockedRequired: false },
  { type: "passportStatus", label: "Passport Available", inputType: "select", lockedRequired: false },
  { type: "message", label: "Message", inputType: "textarea", lockedRequired: false },
];

export function defaultFormFields() {
  return [
    { type: "name", label: "Full Name", placeholder: "Your full name", required: true },
    { type: "phone", label: "Phone Number", placeholder: "Your phone number", required: true },
    { type: "email", label: "Email Address", placeholder: "you@example.com", required: false },
    { type: "message", label: "Message", placeholder: "Tell us what you're looking for", required: false },
  ];
}
