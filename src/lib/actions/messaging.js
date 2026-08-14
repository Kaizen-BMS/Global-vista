import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { createNotification } from "@/lib/actions/notifications";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { uploadFile, getFileUrl } from "@/lib/services/StorageService";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/** Every conversation lookup re-verifies both company_id AND that the
 * session user is actually a participant — company match alone isn't
 * enough (two employees in the same company must not read each other's
 * direct messages just because they share a tenant). This is the single
 * choke point every messaging action below goes through. */
async function assertParticipant(session, conversationId) {
  const [[row]] = await pool.query(
    `SELECT c.id, c.company_id, c.type, c.title, cp.last_read_at
     FROM conversations c JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = ?
     WHERE c.id = ? AND c.company_id = ?`,
    [session.id, conversationId, session.company_id]
  );
  if (!row) { const e = new Error("Conversation not found."); e.status = 404; throw e; }
  return row;
}

async function assertSameCompanyUser(session, userId) {
  const [[u]] = await pool.query(`SELECT id, name FROM users WHERE id = ? AND company_id = ? AND is_deleted = 0 AND status = 'active'`, [userId, session.company_id]);
  if (!u) { const e = new Error("That employee was not found in your company."); e.status = 404; throw e; }
  return u;
}

/** Employees available to start a new conversation with — same company,
 * active, excluding the caller. Powers the "New Conversation" picker. */
export async function listMessageableUsers(session) {
  const [rows] = await pool.query(
    `SELECT id, name, email, is_super_admin FROM users WHERE company_id = ? AND is_deleted = 0 AND status = 'active' AND id != ? ORDER BY name`,
    [session.company_id, session.id]
  );
  return rows;
}

/** One conversation per pair of users, reused across multiple "start chat"
 * clicks — matches how every real messaging product avoids spawning a new
 * thread every time you click someone's name. */
export async function getOrCreateDirectConversation(session, otherUserId) {
  const other = await assertSameCompanyUser(session, otherUserId);
  const [[existing]] = await pool.query(
    `SELECT c.id FROM conversations c
     JOIN conversation_participants a ON a.conversation_id = c.id AND a.user_id = ?
     JOIN conversation_participants b ON b.conversation_id = c.id AND b.user_id = ?
     WHERE c.company_id = ? AND c.type = 'direct'
     LIMIT 1`,
    [session.id, otherUserId, session.company_id]
  );
  if (existing) return existing.id;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(`INSERT INTO conversations (company_id, type, created_by) VALUES (?, 'direct', ?)`, [session.company_id, session.id]);
    const conversationId = result.insertId;
    await conn.query(`INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?), (?, ?)`, [conversationId, session.id, conversationId, otherUserId]);
    await conn.commit();
    return conversationId;
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
}

export async function createGroupConversation(session, participantIds, title) {
  const ids = [...new Set((participantIds || []).map(Number).filter((id) => id && id !== session.id))];
  if (ids.length < 2) { const e = new Error("Select at least 2 other people for a group."); e.status = 400; throw e; }
  for (const id of ids) await assertSameCompanyUser(session, id);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(`INSERT INTO conversations (company_id, type, title, created_by) VALUES (?, 'group', ?, ?)`, [session.company_id, title || null, session.id]);
    const conversationId = result.insertId;
    const values = [session.id, ...ids].map((id) => [conversationId, id]);
    await conn.query(`INSERT INTO conversation_participants (conversation_id, user_id) VALUES ?`, [values]);
    await conn.commit();
    return conversationId;
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
}

/**
 * Company-wide announcement channel — one persistent conversation per
 * company, found-or-created, with every currently-active employee kept in
 * sync as a participant on each use (so someone hired after the channel
 * was first created still gets folded in). Only a Super Admin may post
 * into it (enforced in sendMessage), so it stays a real broadcast, not a
 * free-for-all group chat under another name.
 */
export async function getOrCreateBroadcastConversation(session) {
  if (!isSuperAdmin(session)) { const e = new Error("Only a Super Admin can start a company-wide broadcast."); e.status = 403; throw e; }
  let conversationId;
  const [[existing]] = await pool.query(`SELECT id FROM conversations WHERE company_id = ? AND type = 'broadcast' LIMIT 1`, [session.company_id]);
  if (existing) {
    conversationId = existing.id;
  } else {
    const [result] = await pool.query(`INSERT INTO conversations (company_id, type, title, created_by) VALUES (?, 'broadcast', 'Company Announcements', ?)`, [session.company_id, session.id]);
    conversationId = result.insertId;
  }
  const [activeUsers] = await pool.query(`SELECT id FROM users WHERE company_id = ? AND is_deleted = 0 AND status = 'active'`, [session.company_id]);
  const [existingParticipants] = await pool.query(`SELECT user_id FROM conversation_participants WHERE conversation_id = ?`, [conversationId]);
  const already = new Set(existingParticipants.map((r) => r.user_id));
  const missing = activeUsers.filter((u) => !already.has(u.id));
  if (missing.length) {
    await pool.query(`INSERT INTO conversation_participants (conversation_id, user_id) VALUES ?`, [missing.map((u) => [conversationId, u.id])]);
  }
  return conversationId;
}

export async function listConversations(session) {
  const [rows] = await pool.query(
    `SELECT c.id, c.type, c.title, c.updated_at, cp.last_read_at,
            (SELECT m.body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
            (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
            (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01')) AS unread_count,
            (SELECT GROUP_CONCAT(u.name SEPARATOR ', ') FROM conversation_participants op JOIN users u ON u.id = op.user_id WHERE op.conversation_id = c.id AND op.user_id != ?) AS other_participant_names,
            (SELECT COUNT(*) FROM conversation_participants op2 WHERE op2.conversation_id = c.id) AS participant_count
     FROM conversations c
     JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = ?
     WHERE c.company_id = ?
     ORDER BY COALESCE(c.updated_at, c.created_at) DESC`,
    [session.id, session.id, session.company_id]
  );
  return rows;
}

export async function getConversationMessages(session, conversationId, { limit = 50, beforeId = null } = {}) {
  await assertParticipant(session, conversationId);
  const params = [conversationId];
  let beforeClause = "";
  if (beforeId) { beforeClause = "AND m.id < ?"; params.push(beforeId); }
  params.push(limit);
  const [rows] = await pool.query(
    `SELECT m.*, u.name AS sender_name FROM messages m LEFT JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id = ? ${beforeClause} ORDER BY m.id DESC LIMIT ?`,
    params
  );
  const withUrls = await Promise.all(rows.map(async (m) => ({
    ...m,
    file_url: m.file_url ? await getFileUrl(m.file_url) : null,
  })));
  return withUrls.reverse();
}

export async function sendMessage(session, conversationId, { body, file } = {}, senderId) {
  const conversation = await assertParticipant(session, conversationId);
  if (conversation.type === "broadcast" && !isSuperAdmin(session)) {
    const e = new Error("Only a Super Admin can post in a company-wide broadcast."); e.status = 403; throw e;
  }
  if (!body?.trim() && !file) { const e = new Error("Message body or attachment is required."); e.status = 400; throw e; }

  let fileMeta = null;
  if (file) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { key } = await uploadFile({ companyId: session.company_id, category: "message-attachments", buffer, fileName: file.name, mimeType: file.type, maxSizeBytes: MAX_ATTACHMENT_BYTES });
    fileMeta = { key, name: file.name, size: file.size };
  }

  const [result] = await pool.query(
    `INSERT INTO messages (company_id, conversation_id, sender_id, body, file_name, file_url, file_size) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [session.company_id, conversationId, senderId, body?.trim() || "", fileMeta?.name || null, fileMeta?.key || null, fileMeta?.size || null]
  );
  await pool.query(`UPDATE conversations SET updated_at = NOW() WHERE id = ?`, [conversationId]);
  // Sending counts as having read up to your own message.
  await pool.query(`UPDATE conversation_participants SET last_read_at = NOW() WHERE conversation_id = ? AND user_id = ?`, [conversationId, senderId]);

  const [participants] = await pool.query(`SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND user_id != ?`, [conversationId, senderId]);
  const preview = body?.trim() ? (body.length > 80 ? `${body.slice(0, 80)}…` : body) : `Sent an attachment: ${fileMeta?.name || ""}`;
  for (const p of participants) {
    await createNotification(session.company_id, p.user_id, {
      title: conversation.type === "broadcast" ? `Announcement: ${conversation.title || "Company"}` : `New message from ${session.name}`,
      message: preview,
      type: "message_received",
      link: `/workspace/messages/${conversationId}`,
    });
  }

  await logActivity({ userId: senderId, module: "messaging", action: "message_sent", entityType: "conversation", entityId: conversationId, companyId: session.company_id, description: `Sent a message${fileMeta ? " with an attachment" : ""}` });
  return result.insertId;
}

export async function markConversationRead(session, conversationId) {
  await assertParticipant(session, conversationId);
  await pool.query(`UPDATE conversation_participants SET last_read_at = NOW() WHERE conversation_id = ? AND user_id = ?`, [conversationId, session.id]);
}

export async function getUnreadMessageCount(session) {
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS unread FROM messages m
     JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.user_id = ?
     WHERE m.company_id = ? AND m.sender_id != ? AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01')`,
    [session.id, session.company_id, session.id]
  );
  return Number(row.unread);
}

/** FULLTEXT search, scoped to conversations the caller actually participates
 * in — never searches across the whole company's messages regardless of
 * membership. */
export async function searchMessages(session, query) {
  const q = (query || "").trim();
  if (!q) return [];
  const [rows] = await pool.query(
    `SELECT m.id, m.conversation_id, m.body, m.created_at, u.name AS sender_name, c.title AS conversation_title, c.type AS conversation_type
     FROM messages m
     JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.user_id = ?
     JOIN conversations c ON c.id = m.conversation_id
     LEFT JOIN users u ON u.id = m.sender_id
     WHERE m.company_id = ? AND MATCH(m.body) AGAINST (? IN NATURAL LANGUAGE MODE)
     ORDER BY m.created_at DESC LIMIT 30`,
    [session.id, session.company_id, q]
  );
  return rows;
}
