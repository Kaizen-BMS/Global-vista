import { getSession } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { getIdea, IDEA_STATUSES } from "@/lib/actions/ideas";
import ForbiddenState from "@/components/shared/ForbiddenState";
import IdeaDetail from "@/components/workspace/ideas/IdeaDetail";
import { pool } from "@/lib/db";

export default async function IdeaDetailPage({ params }) {
  const { id } = await params;
  const session = await getSession();
  const admin = isSuperAdmin(session);

  let idea;
  try {
    idea = await getIdea(session, id);
  } catch (err) {
    if (err.status === 403 || err.status === 404) return <ForbiddenState />;
    throw err;
  }

  let assignees = [];
  if (admin) {
    const [rows] = await pool.query(`SELECT id, name FROM users WHERE company_id=? AND is_deleted=0 AND status='active' ORDER BY name`, [session.company_id]);
    assignees = rows;
  }

  return (
    <div>
      <IdeaDetail initialIdea={idea} isSuperAdmin={admin} statuses={IDEA_STATUSES} assignees={assignees} currentUserId={session.id} />
    </div>
  );
}
