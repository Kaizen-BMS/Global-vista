import { getSession } from "@/lib/auth";
import ForbiddenState from "@/components/shared/ForbiddenState";
import UserGuideClient from "@/components/guide/UserGuideClient";

export default async function UserGuidePage() {
  const session = await getSession();
  const isGveParent = !session.is_child_company && !!session.can_create_child_companies;
  if (!session.is_child_company && !isGveParent) return <ForbiddenState />;

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-1">User Guide</h1>
      <p className="text-muted-foreground text-sm mb-6">
        {isGveParent
          ? "How things work across your Global Vista Educators workspace — pick a language above."
          : "How things work in your Student Portal — pick a language above."}
      </p>
      <UserGuideClient audience={isGveParent ? "gve" : "school"} />
    </div>
  );
}
