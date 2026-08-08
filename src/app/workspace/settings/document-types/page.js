import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { listEmployeeDocumentTypes } from "@/lib/actions/employeeDocumentTypes";
import ForbiddenState from "@/components/shared/ForbiddenState";
import SettingsTabs from "@/components/shared/SettingsTabs";
import DocumentTypeManager from "@/components/settings/DocumentTypeManager";

export default async function DocumentTypesSettingsPage() {
  const session = await getSession();
  if (!(await can(session, "employee_documents.manage"))) return <ForbiddenState />;
  const types = await listEmployeeDocumentTypes(session);
  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-1">Settings</h1>
      <SettingsTabs />
      <DocumentTypeManager initialTypes={types} />
    </div>
  );
}
