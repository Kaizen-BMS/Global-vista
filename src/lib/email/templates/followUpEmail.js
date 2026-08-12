import "server-only";

// Every ENUM value lead_followups.type actually has today — kept as a map
// (not a passthrough) so a future ENUM addition degrades to its own raw
// value instead of `undefined` breaking the email.
const TYPE_LABELS = {
  "Phone Call": "Phone Call", WhatsApp: "WhatsApp", Meeting: "Meeting", Zoom: "Zoom Call",
  Email: "Email", Reminder: "Reminder", SMS: "SMS", Custom: "Follow-up",
};
export function followupTypeLabel(type) { return TYPE_LABELS[type] || type || "Follow-up"; }

const COPY = {
  created: {
    subject: (companyName) => `Follow-up Scheduled — ${companyName}`,
    heading: "Follow-up Scheduled",
    intro: (leadName, companyName) => `This is to confirm that a follow-up has been scheduled regarding your enquiry with ${companyName}.`,
    closing: "Our team will contact you around the scheduled time.",
  },
  rescheduled: {
    subject: (companyName) => `Follow-up Rescheduled — ${companyName}`,
    heading: "Follow-up Rescheduled",
    intro: (leadName, companyName) => `Your follow-up with ${companyName} has been rescheduled.`,
    closing: "Our team will contact you around the new scheduled time.",
  },
  cancelled: {
    subject: (companyName) => `Follow-up Cancelled — ${companyName}`,
    heading: "Follow-up Cancelled",
    intro: (leadName, companyName) => `Your previously scheduled follow-up with ${companyName} has been cancelled.`,
    closing: "If you'd still like to speak with us, please reach out using the details below.",
  },
  reminder: {
    subject: (companyName, dateLabel) => `Reminder: Follow-up with ${companyName} — ${dateLabel}`,
    heading: "Follow-up Reminder",
    intro: (leadName, companyName) => `This is a reminder that you have an upcoming follow-up scheduled with ${companyName}.`,
    closing: "Our team will contact you around the scheduled time.",
  },
};

/**
 * `action` selects the copy variant; everything else is data the caller
 * already resolved (never trust the caller passed the RIGHT company's
 * branding — that check happens before this function is ever called, see
 * followupNotifications.js). No internal staff notes are accepted here on
 * purpose — the schema's `notes` field is never wired into this template.
 */
export function renderFollowupEmail({
  action, // "created" | "rescheduled" | "cancelled" | "reminder"
  leadName,
  followupType,
  followupDateLabel, // pre-formatted in the company's reporting timezone
  followupTimeLabel,
  timezoneLabel, // e.g. "IST" or "Asia/Kolkata"
  previousDateLabel, // only for "rescheduled"
  previousTimeLabel,
  company, // { name, logoUrl, primaryColor, email, phone, website }
  platform, // { name, logoUrl }
}) {
  const copy = COPY[action] || COPY.created;
  const color = company.primaryColor || "#4f46e5";
  const companyName = company.name || platform.name;
  const subject = action === "reminder" ? copy.subject(companyName, followupDateLabel) : copy.subject(companyName);

  const logoBlock = company.logoUrl
    ? `<img src="${company.logoUrl}" alt="${companyName}" style="height:32px;object-fit:contain;" />`
    : platform.logoUrl
      ? `<img src="${platform.logoUrl}" alt="${platform.name}" style="height:32px;object-fit:contain;" />`
      : `<p style="color:#fff;font-weight:600;margin:0;font-size:16px;">${companyName}</p>`;

  const rescheduleBlock = action === "rescheduled" && previousDateLabel
    ? `<tr><td style="padding:4px 0;color:#a3a3a3;">Previous</td><td style="padding:4px 0;color:#a3a3a3;text-decoration:line-through;">${previousDateLabel} — ${previousTimeLabel}</td></tr>`
    : "";

  const contactLine = [company.email, company.phone].filter(Boolean).join(" · ");

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f4f5;padding:32px 0;">
  <div style="max-width:520px;margin:0 auto;background:#0a0a0a;border-radius:16px;overflow:hidden;">
    <div style="padding:24px 32px;background:#111827;">${logoBlock}</div>
    <div style="padding:32px;color:#e5e5e5;">
      <h2 style="color:#fff;margin:0 0 12px;">${copy.heading}</h2>
      <p style="margin:0 0 20px;line-height:1.6;">Hello ${leadName || "there"},</p>
      <p style="margin:0 0 20px;line-height:1.6;">${copy.intro(leadName, companyName)}</p>
      <table style="width:100%;border-collapse:collapse;background:#171717;border-radius:10px;padding:16px;margin:0 0 20px;font-size:14px;">
        <tbody>
          ${rescheduleBlock}
          <tr><td style="padding:4px 0;color:#a3a3a3;width:90px;">Date</td><td style="padding:4px 0;color:#fff;font-weight:600;">${followupDateLabel}</td></tr>
          <tr><td style="padding:4px 0;color:#a3a3a3;">Time</td><td style="padding:4px 0;color:#fff;font-weight:600;">${followupTimeLabel} ${timezoneLabel || ""}</td></tr>
          <tr><td style="padding:4px 0;color:#a3a3a3;">Type</td><td style="padding:4px 0;color:#fff;">${followupTypeLabel(followupType)}</td></tr>
        </tbody>
      </table>
      <p style="margin:0 0 20px;line-height:1.6;">${copy.closing}</p>
      ${contactLine ? `<p style="margin:0;color:#a3a3a3;font-size:13px;">Questions? Contact ${companyName}${contactLine ? ` — ${contactLine}` : ""}.</p>` : ""}
    </div>
    <div style="padding:16px 32px;border-top:1px solid #262626;color:#737373;font-size:11px;">
      ${companyName} · Powered by ${platform.name}
    </div>
  </div>
</div>`;

  return { subject, html };
}
