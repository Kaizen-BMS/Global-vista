import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getUserById } from "@/lib/actions/users";
import SessionsPanel from "@/components/profile/SessionsPanel";
import EmployeeDocumentsPanel from "@/components/users/EmployeeDocumentsPanel";

export default async function ProfilePage() {
  const session = await getSession();
  const user = await getUserById(session, session.id);
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><div className="h-16 w-16 rounded-full bg-indigo-600/10 border border-indigo-600/30 flex items-center justify-center text-indigo-400 text-xl font-semibold">{user.name.charAt(0).toUpperCase()}</div><div><h1 className="text-xl font-semibold text-foreground">{user.name}</h1><p className="text-muted-foreground text-sm">{user.role_name} · {user.email}</p></div></div>

      <div className="max-w-2xl space-y-3">
        <div className="bg-card border border-border rounded-xl p-5"><SessionsPanel /></div>
        <Link href="/workspace/change-password" className="inline-block text-sm text-indigo-400 hover:text-indigo-300 transition-colors">Change Password</Link>
      </div>

      <div>
        <h2 className="text-foreground font-medium mb-3">My Documents</h2>
        <EmployeeDocumentsPanel userId={session.id} isSelf />
      </div>
    </div>
  );
}
