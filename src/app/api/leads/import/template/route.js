import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { forbidden, withErrorHandling } from "@/lib/helpers/response";
import { buildLeadTemplateRow, CUSTOM_FIELD_IMPORT_KEYS } from "@/lib/modules/crm/actions/leadImport";
import { getLeadImportFields } from "@/lib/modules/crm/constants/leadImportFields";
import { getLeadPipelineStages } from "@/lib/modules/crm/actions/leadPipelineStages";
import { listLeadCustomFields, OPTION_TYPES } from "@/lib/modules/crm/actions/leadCustomFields";
import { listLeadSources, listServices } from "@/lib/actions/leadMeta";
import { getSettingsByGroup } from "@/lib/actions/settings";
import { LEAD_PRIORITIES, FOLLOWUP_TYPES } from "@/lib/modules/crm/constants/leadStages";
import { buildExportResponse } from "@/lib/helpers/export";
import { buildStyledExportResponse } from "@/lib/helpers/exportStyled";

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "leads.create"))) return forbidden();

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const [sources, services] = await Promise.all([listLeadSources(session), listServices(session)]);
  const columns = getLeadImportFields(session.is_child_company).map((f) => [f.key, f.label]);
  const exampleRow = buildLeadTemplateRow({ firstSourceName: sources[0]?.name, firstServiceName: services[0]?.name });

  if (session.is_child_company && format === "xlsx") {
    const [stages, customFields, systemSettings] = await Promise.all([
      getLeadPipelineStages(session),
      listLeadCustomFields(session, { activeOnly: true }),
      getSettingsByGroup(session, "system"),
    ]);
    const byFieldKey = new Map(customFields.map((f) => [f.field_key, f]));
    const dropdowns = {
      leadSourceName: sources.map((s) => s.name), serviceName: services.map((s) => s.name),
      priority: LEAD_PRIORITIES, stage: stages, followupType: FOLLOWUP_TYPES,
    };
    for (const [recordKey, fieldKey] of Object.entries(CUSTOM_FIELD_IMPORT_KEYS)) {
      const field = byFieldKey.get(fieldKey);
      if (field && OPTION_TYPES.has(field.field_type) && field.options?.length) dropdowns[recordKey] = field.options;
    }
    // A blank template is for typing in brand-new students, not re-importing
    // an edited export — there's no existing Lead/Student ID to protect, so
    // every column stays editable; only the header row (locked by
    // buildStyledExportResponse itself) is protected.
    return buildStyledExportResponse([exampleRow], columns, {
      unlockedKeys: new Set(columns.map(([key]) => key)),
      dropdowns,
      filenameBase: "leads-import-template", sheetName: "Leads", timezone: systemSettings.timezone || "UTC",
    });
  }

  return buildExportResponse([exampleRow], columns, { format, filenameBase: "leads-import-template", sheetName: "Leads" });
});
