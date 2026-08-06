import "server-only";
import { pool } from "@/lib/db";

export async function generateLeadNumber() {
  const year = new Date().getFullYear();
  const [[{ count }]] = await pool.query(
    `SELECT COUNT(*) AS count FROM leads WHERE YEAR(created_at) = ?`,
    [year]
  );
  const seq = String(count + 1).padStart(6, "0");
  return `GV-${year}-${seq}`;
}