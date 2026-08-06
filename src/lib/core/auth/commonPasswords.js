// Small blocklist of the most-guessed passwords/patterns. Not exhaustive —
// a real dictionary check belongs behind a service (e.g. HaveIBeenPwned's
// k-anonymity API) rather than a hardcoded list, but that's a new
// external dependency decision, not something to silently add.
export const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "12345678", "123456789",
  "qwerty123", "letmein", "welcome1", "admin123", "changeme",
  "globalvista", "globalvista1", "counsellor1", "crmadmin",
]);

export function isCommonPassword(password) {
  return COMMON_PASSWORDS.has(password.toLowerCase());
}