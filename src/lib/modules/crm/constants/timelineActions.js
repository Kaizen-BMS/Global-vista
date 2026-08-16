/**
 * One entry per `activity_logs.action` value that can appear on a lead's
 * timeline (see leadTimeline.js). `detailSource` tells ActivityTimeline.js
 * which already-fetched collection (followups/meetings/notes/documents/
 * payments — all passed as props from the same Promise.all the rest of the
 * page already does) to look the CURRENT row up in when a card is expanded,
 * keyed by `event.meta[<idKey>]`. Actions with no detailSource just expand
 * to show the plain description/actor/timestamp — nothing to look up.
 */
export const TIMELINE_ACTION_META = {
  create: { label: "Lead Created", icon: "Plus", color: "bg-emerald-500" },
  update: { label: "Lead Updated", icon: "Pencil", color: "bg-muted-foreground" },
  stage_change: { label: "Stage Changed", icon: "ArrowRightLeft", color: "bg-indigo-500" },
  status_change: { label: "Status Changed", icon: "Tag", color: "bg-amber-500" },
  assign: { label: "Lead Assigned", icon: "UserPlus", color: "bg-blue-500" },
  claim: { label: "Lead Claimed", icon: "UserCheck", color: "bg-blue-500" },
  release: { label: "Lead Released", icon: "UserMinus", color: "bg-slate-500" },
  merge: { label: "Lead Merged", icon: "GitMerge", color: "bg-pink-500" },
  delete: { label: "Lead Deleted", icon: "Trash2", color: "bg-red-500" },
  bulk_status_change: { label: "Status Changed", icon: "Tag", color: "bg-amber-500" },
  bulk_assign: { label: "Lead Assigned", icon: "Users", color: "bg-blue-500" },

  note_add: { label: "Note Added", icon: "StickyNote", color: "bg-yellow-500", detailSource: "notes", idKey: "noteId" },

  followup_scheduled: { label: "Follow-up Scheduled", icon: "CalendarClock", color: "bg-purple-500", detailSource: "followups", idKey: "followupId" },
  followup_rescheduled: { label: "Follow-up Rescheduled", icon: "CalendarClock", color: "bg-purple-500", detailSource: "followups", idKey: "followupId" },
  followup_completed: { label: "Follow-up Completed", icon: "CheckCircle2", color: "bg-green-500", detailSource: "followups", idKey: "followupId" },
  followup_cancelled: { label: "Follow-up Cancelled", icon: "XCircle", color: "bg-red-500", detailSource: "followups", idKey: "followupId" },

  meeting_scheduled: { label: "Meeting Scheduled", icon: "CalendarDays", color: "bg-fuchsia-500", detailSource: "meetings", idKey: "meetingId" },
  meeting_rescheduled: { label: "Meeting Rescheduled", icon: "CalendarDays", color: "bg-fuchsia-500", detailSource: "meetings", idKey: "meetingId" },
  meeting_completed: { label: "Meeting Completed", icon: "CheckCircle2", color: "bg-green-500", detailSource: "meetings", idKey: "meetingId" },
  meeting_cancelled: { label: "Meeting Cancelled", icon: "XCircle", color: "bg-red-500", detailSource: "meetings", idKey: "meetingId" },

  task_create: { label: "Task Added", icon: "ListChecks", color: "bg-cyan-500" },
  task_complete: { label: "Task Completed", icon: "CheckCircle2", color: "bg-green-500" },
  task_reopen: { label: "Task Reopened", icon: "RotateCcw", color: "bg-orange-500" },

  document_upload: { label: "Document Uploaded", icon: "FileUp", color: "bg-teal-500", detailSource: "documents", idKey: "documentId" },
  document_replace: { label: "Document Replaced", icon: "FileUp", color: "bg-teal-500" },
  document_delete: { label: "Document Deleted", icon: "FileX", color: "bg-red-500" },

  custom_fields_update: { label: "Custom Field Updated", icon: "SlidersHorizontal", color: "bg-violet-500" },
  custom_field_file_upload: { label: "Custom Field File Uploaded", icon: "FileUp", color: "bg-violet-500" },

  payment_plan_created: { label: "Payment Plan Created", icon: "Wallet", color: "bg-emerald-600" },
  payment_installment_created: { label: "Installment Added", icon: "Wallet", color: "bg-emerald-600" },
  payment_installment_updated: { label: "Installment Updated", icon: "Wallet", color: "bg-emerald-600" },
  payment_installment_removed: { label: "Installment Removed", icon: "Wallet", color: "bg-red-500" },
  payment_recorded: { label: "Payment Recorded", icon: "CircleDollarSign", color: "bg-emerald-600", detailSource: "payments", idKey: "paymentId" },
  payment_plan_cancelled: { label: "Payment Plan Cancelled", icon: "XCircle", color: "bg-red-500" },
  payment_plan_refunded: { label: "Payment Refunded", icon: "Undo2", color: "bg-amber-500" },
  payment_receipt_generated: { label: "Receipt Generated", icon: "Receipt", color: "bg-emerald-600" },

  form_submission: { label: "Lead Captured (Public Form)", icon: "FormInput", color: "bg-indigo-500" },
  form_resubmission: { label: "Form Resubmitted", icon: "FormInput", color: "bg-indigo-500" },
};

/** Timeline filter groups shown as chips — each maps to one or more raw actions. */
export const TIMELINE_FILTERS = [
  { key: "all", label: "All" },
  { key: "followups", label: "Follow-ups", actions: ["followup_scheduled", "followup_rescheduled", "followup_completed", "followup_cancelled"] },
  { key: "meetings", label: "Meetings", actions: ["meeting_scheduled", "meeting_rescheduled", "meeting_completed", "meeting_cancelled"] },
  { key: "notes", label: "Notes", actions: ["note_add"] },
  { key: "documents", label: "Documents", actions: ["document_upload", "document_replace", "document_delete"] },
  { key: "payments", label: "Payments", actions: ["payment_plan_created", "payment_installment_created", "payment_installment_updated", "payment_installment_removed", "payment_recorded", "payment_plan_cancelled", "payment_plan_refunded", "payment_receipt_generated"] },
  { key: "assignments", label: "Assignments", actions: ["assign", "claim", "release", "bulk_assign"] },
  { key: "status", label: "Status Changes", actions: ["stage_change", "status_change", "bulk_status_change"] },
];
