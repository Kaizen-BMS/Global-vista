import { getSession } from "@/lib/auth";
import { getUserById } from "@/lib/actions/users";
import SessionsPanel from "@/components/profile/SessionsPanel";

export default async function ProfilePage() {
  const session = await getSession();
  const user = await getUserById(session, session.id);
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4"><div className="h-16 w-16 rounded-full bg-indigo-600/10 border border-indigo-600/30 flex items-center justify-center text-indigo-400 text-xl font-semibold">{user.name.charAt(0).toUpperCase()}</div><div><h1 className="text-xl font-semibold text-white">{user.name}</h1><p className="text-neutral-500 text-sm">{user.role_name} · {user.email}</p></div></div>
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5"><SessionsPanel /></div>
      <a href="/workspace/change-password" className="inline-block text-sm text-indigo-400">Change Password</a>
    </div>
  );
}