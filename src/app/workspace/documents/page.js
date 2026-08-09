import { getSession } from "@/lib/auth";
import EmployeeDocumentsPanel from "@/components/users/EmployeeDocumentsPanel";

export default async function DocumentsPage() {
  const session = await getSession();
  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-6">My Documents</h1>
      <EmployeeDocumentsPanel userId={session.id} isSelf />
    </div>
  );
}
