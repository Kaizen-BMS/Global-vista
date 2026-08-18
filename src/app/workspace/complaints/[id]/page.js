import { getSession } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { getComplaint, COMPLAINT_STATUSES } from "@/lib/actions/complaints";
import ForbiddenState from "@/components/shared/ForbiddenState";
import ComplaintDetail from "@/components/workspace/complaints/ComplaintDetail";
import { pool } from "@/lib/db";

export default async function ComplaintDetailPage({ params }) {
  const { id } = await params;
  const session = await getSession();
  const admin = isSuperAdmin(session);

  let complaint;
  try {
    complaint = await getComplaint(session, id);
  } catch (err) {
    if (err.status === 403 || err.status === 404) return <ForbiddenState />;
    throw err;
  }

  let reviewers = [];
  if (admin) {
    const [rows] = await pool.query(`SELECT id, name FROM users WHERE company_id=? AND is_deleted=0 AND status='active' ORDER BY name`, [session.company_id]);
    reviewers = rows;
  }

  return (
    <div>
      <ComplaintDetail initialComplaint={complaint} isSuperAdmin={admin} statuses={COMPLAINT_STATUSES} reviewers={reviewers} currentUserId={session.id} />
    </div>
  );
}
