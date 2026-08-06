import { listAcademicSessions } from "@/lib/actions/academicSessions";
import SettingsTabs from "@/components/crm/shared/SettingsTabs";
import AcademicSessionsEditor from "@/components/crm/forms/AcademicSessionsEditor";

export default async function AcademicSessionsPage() {
  const sessions = await listAcademicSessions();
  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-1">Settings</h1>
      <SettingsTabs />
      <AcademicSessionsEditor sessions={sessions} />
    </div>
  );
}