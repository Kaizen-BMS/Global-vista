import { getSession } from "@/lib/auth";
import ForbiddenState from "@/components/shared/ForbiddenState";
import UserGuideClient from "@/components/guide/UserGuideClient";

export default async function UserGuidePage() {
  const session = await getSession();
  if (!session.is_child_company) return <ForbiddenState />;

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-1">User Guide</h1>
      <p className="text-muted-foreground text-sm mb-6">How things work in your Student Portal — pick a language above.</p>
      <UserGuideClient />
    </div>
  );
}
