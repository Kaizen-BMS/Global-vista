export function required(value, fieldName) {
  if (value === undefined || value === null || String(value).trim() === "") return `${fieldName} is required.`;
  return null;
}
export function isEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
export function isPhone(value) { return /^[0-9+\-\s()]{7,20}$/.test(value); }
export function minLength(value, len, fieldName) { return String(value || "").length < len ? `${fieldName} must be at least ${len} characters.` : null; }

export function validate(data, rulesMap) {
  const errors = {};
  for (const field of Object.keys(rulesMap)) {
    for (const rule of rulesMap[field]) {
      const msg = rule(data[field]);
      if (msg) { errors[field] = msg; break; }
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export const userValidators = {
  name: [(v) => required(v, "Name")],
  email: [(v) => required(v, "Email"), (v) => (v && !isEmail(v) ? "Invalid email address." : null)],
  roleId: [(v) => required(v, "Role")],
};
export const roleValidators = {
  name: [(v) => required(v, "Role name")],
  slug: [(v) => required(v, "Role slug")],
};
export const leadValidators = {
  name: [(v) => required(v, "Name")],
  phone: [(v) => required(v, "Phone"), (v) => (v && !isPhone(v) ? "Invalid phone number." : null)],
  email: [(v) => (v && !isEmail(v) ? "Invalid email address." : null)],
  leadSourceId: [(v) => required(v, "Lead source")],
  serviceId: [(v) => required(v, "Service")],
};