import { getSession } from "@/lib/auth";
import { listAcademicSessions } from "@/lib/actions/academicSessions";
import SettingsTabs from "@/components/shared/SettingsTabs";
import AcademicSessionsEditor from "@/components/forms/AcademicSessionsEditor";

export default async function AcademicSessionsPage() {
  const session = await getSession();
  return (<div><h1 className="text-xl font-semibold text-foreground mb-1">Settings</h1><SettingsTabs /><AcademicSessionsEditor sessions={await listAcademicSessions(session)} /></div>);
}