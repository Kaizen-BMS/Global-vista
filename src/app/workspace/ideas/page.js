import { getSession } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { listIdeas, getIdeaStats, IDEA_CATEGORIES } from "@/lib/actions/ideas";
import { hasIdeasSchema } from "@/lib/db/schemaFlags";
import IdeasWorkspace from "@/components/workspace/ideas/IdeasWorkspace";

export default async function IdeasPage() {
  const session = await getSession();
  const schemaReady = await hasIdeasSchema();
  const admin = isSuperAdmin(session);

  const [ideas, stats] = schemaReady
    ? await Promise.all([listIdeas(session, { scope: "company" }), admin ? getIdeaStats(session) : null])
    : [[], null];

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-1">{admin ? "Ideas Evaluation" : "Ideas & Suggestions"}</h1>
      <p className="text-muted-foreground text-sm mb-6">
        {admin ? "Review, plan, and track every idea submitted by your team." : "Share a suggestion — track its journey from idea to reality."}
      </p>
      {!schemaReady ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm">
          The ideas feature is being set up for your workspace. Check back shortly.
        </div>
      ) : (
        <IdeasWorkspace initialIdeas={ideas} initialStats={stats} isSuperAdmin={admin} categories={IDEA_CATEGORIES} />
      )}
    </div>
  );
}
