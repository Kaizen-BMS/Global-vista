import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { forbidden, withErrorHandling } from "@/lib/helpers/response";
import { listLeadsForExport } from "@/lib/modules/crm/actions/leads";
import { getLeadPipelineStages } from "@/lib/modules/crm/actions/leadPipelineStages";
import { listLeadCustomFields, OPTION_TYPES } from "@/lib/modules/crm/actions/leadCustomFields";
import { getSettingsByGroup } from "@/lib/actions/settings";
import { buildExportResponse } from "@/lib/helpers/export";
import { buildStyledExportResponse } from "@/lib/helpers/exportStyled";
import { FOLLOWUP_TYPES } from "@/lib/modules/crm/constants/leadStages";
import { assertImportExportAllowed } from "@/lib/platform/tenant";

const COLUMNS = [
  // Re-importing this exact export (e.g. after adding counselling notes
  // in the sheet) can match each row back to the right record by this ID
  // instead of guessing from phone/email — see leadImportFields.js.
  ["id", "Lead/Student ID"],
  ["lead_number", "Lead Number"], ["name", "Name"], ["email", "Email"], ["phone", "Phone"],
  ["whatsapp", "WhatsApp"], ["status", "Status"], ["stage", "Stage"], ["priority", "Priority"],
  ["source_name", "Source"], ["service_name", "Service"], ["assigned_name", "Assigned To"],
  ["country", "Country"], ["state", "State"], ["city", "City"],
  ["preferred_country", "Preferred Country"], ["preferred_university", "Preferred University"],
  ["passport_status", "Passport Status"], ["tags", "Tags"], ["created_at", "Created At", "datetime"],
];

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "leads.export"))) return forbidden();
  await assertImportExportAllowed(session.company_id);

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const systemSettings = await getSettingsByGroup(session, "system");
  const leads = await listLeadsForExport(session, {
    status: searchParams.get("status") || null,
    stage: searchParams.get("stage") || null,
    sourceId: searchParams.get("sourceId") || null,
    serviceId: searchParams.get("serviceId") || null,
    search: searchParams.get("search") || null,
    priority: searchParams.get("priority") || null,
    assignedTo: searchParams.get("assignedTo") || null,
    country: searchParams.get("country") || null,
    tag: searchParams.get("tag") || null,
    createdFrom: searchParams.get("createdFrom") || null,
    createdTo: searchParams.get("createdTo") || null,
  });

  if (session.is_child_company && format === "xlsx") {
    const [stages, customFields] = await Promise.all([
      getLeadPipelineStages(session),
      listLeadCustomFields(session, { activeOnly: true }),
    ]);

    // Built dynamically from this company's own custom-field configuration
    // (not a hardcoded list) — adding, renaming, or re-labeling a Student
    // Information field in Settings is reflected in the very next export
    // with no code change, and every option-type field (select/radio/
    // multiselect) automatically gets a dropdown, not just a hand-picked
    // subset of them.
    const schoolCustomFieldColumns = [];
    const dropdowns = { stage: stages, followup_type_input: FOLLOWUP_TYPES };
    const unlockedCustomKeys = [];
    for (const f of customFields) {
      const colKey = `cf_${f.field_key}`;
      schoolCustomFieldColumns.push([colKey, f.label]);
      unlockedCustomKeys.push(colKey);
      if (OPTION_TYPES.has(f.field_type) && f.options?.length) dropdowns[colKey] = f.options;
    }

    return buildStyledExportResponse(leads, [...COLUMNS, ...schoolCustomFieldColumns], {
      blankColumns: [["note_input", "Note"], ["note_date_input", "Note Date"], ["followup_type_input", "Follow-up Type"], ["followup_date_input", "Follow-up Date"]],
      unlockedKeys: new Set(["stage", ...unlockedCustomKeys, "note_input", "note_date_input", "followup_type_input", "followup_date_input"]),
      dropdowns,
      tintKey: "cf_school_name",
      filenameBase: "students-export", sheetName: "Students", timezone: systemSettings.timezone || "UTC",
    });
  }

  return buildExportResponse(leads, COLUMNS, { format, filenameBase: "leads-export", sheetName: "Leads", timezone: systemSettings.timezone || "UTC" });
});
