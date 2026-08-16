export const LEAD_STAGES = [
  "New Lead",
  "Contacted",
  "Interested",
  "Documents Pending",
  "Documents Received",
  "Application Started",
  "Application Submitted",
  "Offer Received",
  "Fees Paid",
  "CAS Received",
  "Visa Applied",
  "Visa Approved",
  "Travel Planning",
  "Completed",
];

export const LEAD_TERMINAL_STAGES = ["Lost", "Cancelled", "Duplicate"];

export const ALL_LEAD_STAGES = [...LEAD_STAGES, ...LEAD_TERMINAL_STAGES];

export const LEAD_PRIORITIES = ["Low", "Medium", "High", "Urgent"];

export const DOCUMENT_TYPES = ["Passport", "IELTS", "PTE", "Academic", "Visa", "Offer Letter", "Invoice", "Other"];

export const FOLLOWUP_TYPES = ["Phone Call", "WhatsApp", "Meeting", "Zoom", "Email", "Reminder", "SMS", "Custom"];

export const MEETING_TYPES = ["Online", "Phone", "In Person", "Other"];

export const FOLLOWUP_DISPOSITIONS = ["Interested", "Not Interested", "No Response", "Follow-up Needed"];

export const DISPOSITION_COLORS = {
  Interested: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  "Not Interested": "bg-red-500/10 text-red-400 border-red-500/30",
  "No Response": "bg-neutral-700/20 text-neutral-400 border-neutral-600/30",
  "Follow-up Needed": "bg-amber-500/10 text-amber-400 border-amber-500/30",
};

export const STAGE_COLORS = {
  "New Lead": "bg-blue-500/10 text-blue-400 border-blue-500/30",
  Contacted: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  Interested: "bg-teal-500/10 text-teal-400 border-teal-500/30",
  "Documents Pending": "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  "Documents Received": "bg-yellow-500/10 text-yellow-300 border-yellow-500/30",
  "Application Started": "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  "Application Submitted": "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
  "Offer Received": "bg-purple-500/10 text-purple-400 border-purple-500/30",
  "Fees Paid": "bg-purple-500/10 text-purple-300 border-purple-500/30",
  "CAS Received": "bg-pink-500/10 text-pink-400 border-pink-500/30",
  "Visa Applied": "bg-orange-500/10 text-orange-400 border-orange-500/30",
  "Visa Approved": "bg-green-500/10 text-green-400 border-green-500/30",
  "Travel Planning": "bg-green-500/10 text-green-300 border-green-500/30",
  Completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  Lost: "bg-red-500/10 text-red-400 border-red-500/30",
  Cancelled: "bg-neutral-700/20 text-neutral-400 border-neutral-600/30",
  Duplicate: "bg-orange-500/10 text-orange-400 border-orange-500/30",
};

export const PRIORITY_COLORS = {
  Low: "bg-neutral-700/20 text-neutral-400 border-neutral-600/30",
  Medium: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  High: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  Urgent: "bg-red-500/10 text-red-400 border-red-500/30",
};