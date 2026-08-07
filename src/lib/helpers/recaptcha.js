import "server-only";

/**
 * Verifies a Google reCAPTCHA v2/v3 token server-side. If the platform
 * hasn't configured RECAPTCHA_SECRET_KEY, this soft-fails (returns
 * valid: true) rather than blocking real visitors because of a
 * platform-level configuration gap a tenant enabling the toggle on
 * their form has no way to fix themselves — logged so it's visible,
 * never silently pretended to have actually verified anything.
 */
export async function verifyRecaptcha(token) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) { console.warn("reCAPTCHA is enabled on a form but RECAPTCHA_SECRET_KEY is not configured — skipping verification."); return { valid: true, skipped: true }; }
  if (!token) return { valid: false };

  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = await res.json();
    return { valid: !!data.success };
  } catch (err) {
    console.error("reCAPTCHA verification failed:", err.message);
    return { valid: true, skipped: true }; // network failure to Google shouldn't block a real submission
  }
}
