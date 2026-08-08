import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { listUsers } from "@/lib/actions/users";
import { getSettingsByGroup } from "@/lib/actions/settings";
import ForbiddenState from "@/components/shared/ForbiddenState";
import ReportToolbar from "@/components/shared/ReportToolbar";
import ReportTable from "@/components/shared/ReportTable";
import ReportPrintHeader from "@/components/shared/ReportPrintHeader";

const COLUMNS = [
  ["employee_id", "Employee ID"], ["name", "Name"], ["email", "Email"], ["role_name", "Role"],
  ["branch_name", "Branch"], ["department_name", "Department"], ["designation_name", "Designation"],
  ["status", "Status"], ["last_login_at", "Last Login"],
];

export default async function UsersReportPage() {
  const session = await getSession();
  if (!(await can(session, "users.view"))) return <ForbiddenState />;
  const [{ users, total }, systemSettings] = await Promise.all([listUsers(session, { pageSize: 500 }), getSettingsByGroup(session, "system")]);
  const timezone = systemSettings.timezone || "UTC";

  return (
    <div>
      <ReportPrintHeader session={session} title="Users Report" subtitle={`${total} user${total === 1 ? "" : "s"}`} timezone={timezone} />
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Users Report</h1>
          <p className="text-muted-foreground text-sm">{total} user{total === 1 ? "" : "s"}</p>
        </div>
        <ReportToolbar exportBase="/api/reports/users/export" />
      </div>
      <ReportTable columns={COLUMNS} rows={users} timezone={timezone} />
    </div>
  );
}
