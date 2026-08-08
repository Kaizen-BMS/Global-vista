import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { listEmployeeDocumentsForReport } from "@/lib/actions/employeeDocuments";
import { getSettingsByGroup } from "@/lib/actions/settings";
import ForbiddenState from "@/components/shared/ForbiddenState";
import ReportToolbar from "@/components/shared/ReportToolbar";
import ReportTable from "@/components/shared/ReportTable";
import ReportPrintHeader from "@/components/shared/ReportPrintHeader";

const COLUMNS = [
  ["employee_name", "Employee"], ["employee_id", "Employee ID"], ["branch_name", "Branch"], ["department_name", "Department"],
  ["document_type", "Document Type"], ["status", "Status"], ["expiry_date", "Expiry Date"], ["created_at", "Uploaded Date"],
];

export default async function EmployeeDocumentsReportPage() {
  const session = await getSession();
  if (!(await can(session, "employee_documents.manage"))) return <ForbiddenState />;
  const [docs, systemSettings] = await Promise.all([listEmployeeDocumentsForReport(session), getSettingsByGroup(session, "system")]);
  const timezone = systemSettings.timezone || "UTC";

  return (
    <div>
      <ReportPrintHeader session={session} title="Employee Documents Report" subtitle={`${docs.length} document${docs.length === 1 ? "" : "s"}`} timezone={timezone} />
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Employee Documents Report</h1>
          <p className="text-muted-foreground text-sm">{docs.length} document{docs.length === 1 ? "" : "s"}</p>
        </div>
        <ReportToolbar exportBase="/api/reports/employee-documents/export" />
      </div>
      <ReportTable columns={COLUMNS} rows={docs} timezone={timezone} />
    </div>
  );
}
