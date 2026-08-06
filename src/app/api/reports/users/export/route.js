import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { forbidden, withErrorHandling } from "@/lib/helpers/response";
import { listUsers } from "@/lib/actions/users";
import { buildExportResponse } from "@/lib/helpers/export";

const COLUMNS = [
  ["employee_id", "Employee ID"], ["name", "Name"], ["email", "Email"], ["phone", "Phone"],
  ["role_name", "Role"], ["branch_name", "Branch"], ["department_name", "Department"],
  ["designation_name", "Designation"], ["status", "Status"], ["last_login_at", "Last Login"], ["created_at", "Created At"],
];

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "users.view"))) return forbidden();
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const { users } = await listUsers(session, { status: searchParams.get("status") || null, pageSize: 5000 });
  return buildExportResponse(users, COLUMNS, { format, filenameBase: "users-export", sheetName: "Users" });
});
