import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { listAllTasks } from "@/lib/modules/crm/actions/leadTasks";
import ForbiddenState from "@/components/shared/ForbiddenState";
import ReportToolbar from "@/components/shared/ReportToolbar";
import ReportTable from "@/components/shared/ReportTable";

const COLUMNS = [
  ["title", "Title"], ["lead_name", "Lead"], ["lead_number", "Lead #"], ["assigned_name", "Assigned To"],
  ["priority", "Priority"], ["due_date", "Due Date"], ["is_completed", "Completed"],
];

export default async function TasksReportPage() {
  const session = await getSession();
  if (!(await can(session, "leads.tasks.manage"))) return <ForbiddenState />;
  const tasks = await listAllTasks(session);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 print:mb-4">
        <div>
          <h1 className="text-xl font-semibold text-white print:text-black">Tasks Report</h1>
          <p className="text-neutral-500 text-sm print:text-neutral-700">{tasks.length} task{tasks.length === 1 ? "" : "s"}</p>
        </div>
        <ReportToolbar exportBase="/api/reports/tasks/export" />
      </div>
      <ReportTable columns={COLUMNS} rows={tasks} />
    </div>
  );
}
