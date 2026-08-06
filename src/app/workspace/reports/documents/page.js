import { getSession } from "@/lib/auth";
import { canAny } from "@/lib/helpers/permissions";
import { listAllDocuments } from "@/lib/actions/documentsReport";
import ForbiddenState from "@/components/shared/ForbiddenState";
import ReportToolbar from "@/components/shared/ReportToolbar";
import ReportTable from "@/components/shared/ReportTable";

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
      <div className="flex items-center justify-between mb-6 print:mb-4">
        <div>
          <h1 className="text-xl font-semibold text-white print:text-black">Documents Report</h1>
          <p className="text-neutral-500 text-sm print:text-neutral-700">{docs.length} document{docs.length === 1 ? "" : "s"}</p>
        </div>
        <ReportToolbar exportBase="/api/reports/documents/export" />
      </div>
      <ReportTable columns={COLUMNS} rows={docs} />
    </div>
  );
}
