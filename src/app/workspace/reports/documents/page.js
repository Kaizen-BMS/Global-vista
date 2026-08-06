import { getSession } from "@/lib/auth";
import { canAny } from "@/lib/helpers/permissions";
import { listAllDocuments } from "@/lib/actions/documentsReport";
import ForbiddenState from "@/components/shared/ForbiddenState";
import ReportToolbar from "@/components/shared/ReportToolbar";
import ReportTable from "@/components/shared/ReportTable";
import ReportPrintHeader from "@/components/shared/ReportPrintHeader";

const COLUMNS = [
  ["source", "Type"], ["type", "Document Type"], ["file_name", "File Name"], ["related_to", "Related To"],
  ["uploaded_by_name", "Uploaded By"], ["created_at", "Uploaded At"],
];

export default async function DocumentsReportPage() {
  const session = await getSession();
  if (!(await canAny(session, ["employee_documents.manage", "leads.documents.manage"]))) return <ForbiddenState />;
  const docs = await listAllDocuments(session);

  return (
    <div>
      <ReportPrintHeader session={session} title="Documents Report" subtitle={`${docs.length} document${docs.length === 1 ? "" : "s"}`} />
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-white">Documents Report</h1>
          <p className="text-neutral-500 text-sm">{docs.length} document{docs.length === 1 ? "" : "s"}</p>
        </div>
        <ReportToolbar exportBase="/api/reports/documents/export" />
      </div>
      <ReportTable columns={COLUMNS} rows={docs} />
    </div>
  );
}
