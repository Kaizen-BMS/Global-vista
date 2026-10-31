import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { forbidden, withErrorHandling } from "@/lib/helpers/response";
import { listLeadsForExport } from "@/lib/modules/crm/actions/leads";
import { getLeadPipelineStages } from "@/lib/modules/crm/actions/leadPipelineStages";
import { listLeadCustomFields } from "@/lib/modules/crm/actions/leadCustomFields";
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

// cf_<key> columns only exist on the row when listLeadsForExport ran its
// is_child_company branch — see that function. Labels match the Add
// Student form's labels exactly so a re-imported, lightly-edited copy of
// this export auto-maps back onto the same fields.
const SCHOOL_CUSTOM_FIELD_COLUMNS = [
  ["cf_stream", "Stream"], ["cf_district", "District"], ["cf_school_name", "School"],
  ["cf_academic_year", "Academic Year"], ["cf_class", "Class"], ["cf_subjects", "Subjects"],
  ["cf_parent_mobile", "Parent Mobile Number"], ["cf_parent_name", "Parent Name"], ["cf_registration_number", "Registration Number"],
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
    const optionsFor = (key) => customFields.find((f) => f.field_key === key)?.options || [];

    return buildStyledExportResponse(leads, [...COLUMNS, ...SCHOOL_CUSTOM_FIELD_COLUMNS], {
      blankColumns: [["note_input", "Note"], ["followup_type_input", "Follow-up Type"], ["followup_date_input", "Follow-up Date"]],
      unlockedKeys: new Set(["stage", ...SCHOOL_CUSTOM_FIELD_COLUMNS.map(([k]) => k), "note_input", "followup_type_input", "followup_date_input"]),
      dropdowns: {
        stage: stages, cf_stream: optionsFor("stream"), cf_district: optionsFor("district"),
        cf_school_name: optionsFor("school_name"), cf_class: optionsFor("class"), followup_type_input: FOLLOWUP_TYPES,
      },
      tintKey: "cf_school_name",
      filenameBase: "students-export", sheetName: "Students", timezone: systemSettings.timezone || "UTC",
    });
  }

  return buildExportResponse(leads, COLUMNS, { format, filenameBase: "leads-export", sheetName: "Leads", timezone: systemSettings.timezone || "UTC" });
});
