import { getSession } from "@/lib/auth";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { withErrorHandling } from "@/lib/helpers/response";
import { listCompanies } from "@/lib/platform/actions/companies";
import { getPlatformTimezone } from "@/lib/platform/actions/settings";
import { buildExportResponse } from "@/lib/helpers/export";

const COLUMNS = [
  ["name", "Company"], ["slug", "Slug"], ["status", "Status"], ["country", "Country"],
  ["user_count", "Users"], ["enabled_module_count", "Enabled Modules"], ["created_at", "Created At", "datetime"],
];

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  assertPlatformOperator(session);
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const [companies, timezone] = await Promise.all([listCompanies(), getPlatformTimezone()]);
  return buildExportResponse(companies, COLUMNS, { format, filenameBase: "companies-export", sheetName: "Companies", timezone });
});
