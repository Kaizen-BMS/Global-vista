import { getSession } from "@/lib/auth";
import { listEmployeeDocuments } from "@/lib/actions/employeeDocuments";

export default async function DocumentsPage() {
  const session = await getSession();
  const documents = await listEmployeeDocuments(session, session.id);
  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-6">My Documents</h1>
      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {documents.length === 0 && <p className="text-muted-foreground text-sm p-4">No documents uploaded.</p>}
        {documents.map((d) => <div key={d.id} className="px-4 py-3 flex justify-between"><span className="text-foreground text-sm">{d.file_name}</span><span className="text-muted-foreground text-xs">{d.type}</span></div>)}
      </div>
    </div>
  );
}