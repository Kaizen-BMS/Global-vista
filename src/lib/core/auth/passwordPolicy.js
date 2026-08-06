import { isCommonPassword } from "@/lib/helpers/commonPasswords";

export function checkPasswordComplexity(password) {
  const errors = [];
  if (!password || password.length < 8) errors.push("At least 8 characters.");
  if (!/[A-Z]/.test(password)) errors.push("At least one uppercase letter.");
  if (!/[a-z]/.test(password)) errors.push("At least one lowercase letter.");
  if (!/[0-9]/.test(password)) errors.push("At least one number.");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("At least one special character.");
  if (password && isCommonPassword(password)) errors.push("This password is too common — choose something less predictable.");
  return { valid: errors.length === 0, errors };
}