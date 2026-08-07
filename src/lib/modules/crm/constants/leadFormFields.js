/**
 * The public-form field types are intentionally a fixed set, not fully
 * arbitrary custom fields — each one maps directly to a real captured
 * value the submission handler reads (name/phone/email/country/state/
 * city/message), consistent with there being no custom-fields storage
 * in the schema. A form is a configured subset + order + labels of
 * these, not a generic field-type system.
 */
export const AVAILABLE_FORM_FIELDS = [
  { type: "name", label: "Full Name", inputType: "text", lockedRequired: true },
  { type: "phone", label: "Phone Number", inputType: "tel", lockedRequired: true },
  { type: "email", label: "Email Address", inputType: "email", lockedRequired: false },
  { type: "country", label: "Country", inputType: "text", lockedRequired: false },
  { type: "state", label: "State", inputType: "text", lockedRequired: false },
  { type: "city", label: "City", inputType: "text", lockedRequired: false },
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
