import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { createNotification } from "@/lib/actions/notifications";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { uploadFile, getFileUrl } from "@/lib/services/StorageService";
import { hasMessageEditingSchema, hasBlockedUsersSchema, hasAnnouncementDismissalsSchema } from "@/lib/db/schemaFlags";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const EDIT_WINDOW_MS = 2 * 60 * 1000;

/** Every conversation lookup re-verifies both company_id AND that the
 * session user is actually a participant — company match alone isn't
 * enough (two employees in the same company must not read each other's
 * direct messages just because they share a tenant). This is the single
 * choke point every messaging action below goes through. */
async function assertParticipant(session, conversationId) {
  const [[row]] = await pool.query(
    `SELECT c.id, c.company_id, c.type, c.title, c.created_by, cp.last_read_at
     FROM conversations c JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = ?
     WHERE c.id = ? AND c.company_id = ?`,
    [session.id, conversationId, session.company_id]
  );
  if (!row) { const e = new Error("Conversation not found."); e.status = 404; throw e; }
  return row;
}

/** Whoever created a group is its admin — no separate role/column needed,
 * `conversations.created_by` already captures exactly this and is set once
 * at creation, never reassigned. Only the admin can rename the group or
 * add/remove members; everyone else can still view membership and leave
 * on their own (see leaveGroupConversation). */
async function assertGroupAdmin(session, conversationId) {
  const conversation = await assertParticipant(session, conversationId);
  if (conversation.type !== "group") { const e = new Error("Only group conversations have an admin."); e.status = 400; throw e; }
  if (conversation.created_by !== session.id) { const e = new Error("Only the group's creator can do this."); e.status = 403; throw e; }
  return conversation;
}

async function postSystemMessage(session, conversationId, body) {
  if (!(await hasMessageEditingSchema())) return; // message_type column lands in the same migration
  await pool.query(
    `INSERT INTO messages (company_id, conversation_id, sender_id, message_type, body) VALUES (?, ?, ?, 'system', ?)`,
    [session.company_id, conversationId, session.id, body]
  );
  await pool.query(`UPDATE conversations SET updated_at = NOW() WHERE id = ?`, [conversationId]);
}

async function assertSameCompanyUser(session, userId) {
  const [[u]] = await pool.query(`SELECT id, name FROM users WHERE id = ? AND company_id = ? AND is_deleted = 0 AND status = 'active'`, [userId, session.company_id]);
  if (!u) { const e = new Error("That employee was not found in your company."); e.status = 404; throw e; }
  return u;
}

/** Both directions count — once either side has blocked the other, the
 * conversation is frozen until whoever blocked unblocks. Silently returns
 * "not blocked" when the migration hasn't run yet, same degrade-gracefully
 * pattern as every other schema-gated feature in this app. */
async function isBlockedBetween(userA, userB) {
  if (!(await hasBlockedUsersSchema())) return false;
  const [[row]] = await pool.query(
    `SELECT id FROM blocked_users WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?) LIMIT 1`,
    [userA, userB, userB, userA]
  );
  return !!row;
}

/** The other participant in a direct conversation — null for group/broadcast. */
async function getOtherDirectParticipant(conversationId, type, selfId) {
  if (type !== "direct") return null;
  const [[row]] = await pool.query(`SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND user_id != ? LIMIT 1`, [conversationId, selfId]);
  return row?.user_id || null;
}

export async function blockUser(session, otherUserId) {
  if (!(await hasBlockedUsersSchema())) { const e = new Error("Blocking isn't available yet."); e.status = 400; throw e; }
  const other = await assertSameCompanyUser(session, otherUserId);
  if (other.id === session.id) { const e = new Error("You can't block yourself."); e.status = 400; throw e; }
  await pool.query(
    `INSERT INTO blocked_users (company_id, blocker_id, blocked_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE created_at = created_at`,
    [session.company_id, session.id, other.id]
  );
  await logActivity({ userId: session.id, module: "messaging", action: "user_blocked", entityType: "user", entityId: other.id, companyId: session.company_id, description: `Blocked ${other.name}` });
}

export async function unblockUser(session, otherUserId) {
  if (!(await hasBlockedUsersSchema())) return;
  await pool.query(`DELETE FROM blocked_users WHERE company_id = ? AND blocker_id = ? AND blocked_id = ?`, [session.company_id, session.id, otherUserId]);
  await logActivity({ userId: session.id, module: "messaging", action: "user_unblocked", entityType: "user", entityId: otherUserId, companyId: session.company_id, description: `Unblocked employee #${otherUserId}` });
}

/** blockedByMe: I blocked them (I can unblock). blockedMe: they blocked me
 * (frozen either way, but only they can lift it). */
export async function getBlockStatus(session, otherUserId) {
  if (!(await hasBlockedUsersSchema())) return { blockedByMe: false, blockedMe: false };
  const [rows] = await pool.query(
    `SELECT blocker_id, blocked_id FROM blocked_users WHERE company_id = ? AND ((blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?))`,
    [session.company_id, session.id, otherUserId, otherUserId, session.id]
  );
  return {
    blockedByMe: rows.some((r) => r.blocker_id === session.id),
    blockedMe: rows.some((r) => r.blocker_id === otherUserId),
  };
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
    `SELECT c.id, c.type, c.title, c.created_by, c.updated_at, cp.last_read_at,
            (SELECT m.body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
            (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
            (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01')) AS unread_count,
            (SELECT GROUP_CONCAT(u.name SEPARATOR ', ') FROM conversation_participants op JOIN users u ON u.id = op.user_id WHERE op.conversation_id = c.id AND op.user_id != ?) AS other_participant_names,
            (SELECT op3.user_id FROM conversation_participants op3 WHERE op3.conversation_id = c.id AND op3.user_id != ? AND c.type = 'direct' LIMIT 1) AS other_participant_id,
            (SELECT COUNT(*) FROM conversation_participants op2 WHERE op2.conversation_id = c.id) AS participant_count
     FROM conversations c
     JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = ?
     WHERE c.company_id = ?
     ORDER BY COALESCE(c.updated_at, c.created_at) DESC`,
    [session.id, session.id, session.id, session.company_id]
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

  if (conversation.type === "direct") {
    const otherId = await getOtherDirectParticipant(conversationId, "direct", senderId);
    if (otherId && (await isBlockedBetween(senderId, otherId))) {
      const e = new Error("You can't send messages in this conversation — it's blocked."); e.status = 403; throw e;
    }
  }

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

/**
 * A sent message stays editable for EDIT_WINDOW_MS (2 minutes) — after that
 * it's final, same as most chat apps. Silently no-ops if the migration
 * hasn't landed yet (edited_at column missing) rather than corrupting data
 * with an UPDATE the schema can't support.
 */
export async function updateMessage(session, conversationId, messageId, body) {
  if (!(await hasMessageEditingSchema())) { const e = new Error("Message editing isn't available yet."); e.status = 400; throw e; }
  await assertParticipant(session, conversationId);
  const trimmed = (body || "").trim();
  if (!trimmed) { const e = new Error("Message can't be empty."); e.status = 400; throw e; }

  const [[message]] = await pool.query(
    `SELECT id, sender_id, created_at, message_type FROM messages WHERE id = ? AND conversation_id = ? LIMIT 1`,
    [messageId, conversationId]
  );
  if (!message) { const e = new Error("Message not found."); e.status = 404; throw e; }
  if (message.sender_id !== session.id) { const e = new Error("You can only edit your own messages."); e.status = 403; throw e; }
  if (message.message_type === "system") { const e = new Error("System messages can't be edited."); e.status = 400; throw e; }
  if (Date.now() - new Date(message.created_at).getTime() > EDIT_WINDOW_MS) {
    const e = new Error("This message can no longer be edited — the 2-minute window has passed."); e.status = 400; throw e;
  }

  await pool.query(`UPDATE messages SET body = ?, edited_at = NOW() WHERE id = ?`, [trimmed, messageId]);
  await logActivity({ userId: session.id, module: "messaging", action: "message_edited", entityType: "conversation", entityId: conversationId, companyId: session.company_id, description: "Edited a message" });
}

/** Everyone currently in the conversation — powers the "who's in this
 * group" panel. Direct/broadcast conversations can call this too, but the
 * UI only surfaces it for groups. */
export async function getConversationParticipants(session, conversationId) {
  await assertParticipant(session, conversationId);
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.is_super_admin
     FROM conversation_participants cp JOIN users u ON u.id = cp.user_id
     WHERE cp.conversation_id = ? ORDER BY u.name`,
    [conversationId]
  );
  return rows;
}

/** Only groups can be left — a direct conversation is just you and one
 * other person (leaving would just delete your own inbox entry, confusing),
 * and broadcast membership is company-managed, not something an individual
 * opts out of. Drops a visible "X left the group" system message so the
 * remaining members aren't left wondering where someone went. */
export async function leaveGroupConversation(session, conversationId) {
  const conversation = await assertParticipant(session, conversationId);
  if (conversation.type !== "group") { const e = new Error("Only group conversations can be left."); e.status = 400; throw e; }

  await pool.query(`DELETE FROM conversation_participants WHERE conversation_id = ? AND user_id = ?`, [conversationId, session.id]);
  await postSystemMessage(session, conversationId, `${session.name} left the group.`);
  await logActivity({ userId: session.id, module: "messaging", action: "group_left", entityType: "conversation", entityId: conversationId, companyId: session.company_id, description: "Left a group conversation" });
}

/** Admin-only. Renames the group — the title shown to every member. */
export async function renameGroupConversation(session, conversationId, title) {
  const conversation = await assertGroupAdmin(session, conversationId);
  const trimmed = (title || "").trim();
  if (!trimmed) { const e = new Error("Group name can't be empty."); e.status = 400; throw e; }
  if (trimmed === conversation.title) return;

  await pool.query(`UPDATE conversations SET title = ? WHERE id = ?`, [trimmed, conversationId]);
  await postSystemMessage(session, conversationId, `${session.name} changed the group name to "${trimmed}".`);
  await logActivity({ userId: session.id, module: "messaging", action: "group_renamed", entityType: "conversation", entityId: conversationId, companyId: session.company_id, description: `Renamed group to "${trimmed}"` });
}

/** Admin-only. Adds one or more employees who aren't already members. */
export async function addGroupParticipants(session, conversationId, userIds) {
  await assertGroupAdmin(session, conversationId);
  const ids = [...new Set((userIds || []).map(Number).filter((id) => id && id !== session.id))];
  if (!ids.length) { const e = new Error("Select at least one person to add."); e.status = 400; throw e; }

  const [existingRows] = await pool.query(`SELECT user_id FROM conversation_participants WHERE conversation_id = ?`, [conversationId]);
  const already = new Set(existingRows.map((r) => r.user_id));
  const toAdd = [];
  for (const id of ids) {
    if (already.has(id)) continue;
    const user = await assertSameCompanyUser(session, id);
    toAdd.push(user);
  }
  if (!toAdd.length) { const e = new Error("Everyone selected is already in the group."); e.status = 400; throw e; }

  await pool.query(`INSERT INTO conversation_participants (conversation_id, user_id) VALUES ?`, [toAdd.map((u) => [conversationId, u.id])]);
  const names = toAdd.map((u) => u.name).join(", ");
  await postSystemMessage(session, conversationId, `${session.name} added ${names} to the group.`);
  await logActivity({ userId: session.id, module: "messaging", action: "group_members_added", entityType: "conversation", entityId: conversationId, companyId: session.company_id, description: `Added ${names} to the group` });
}

/** Admin-only, and only for removing SOMEONE ELSE — the admin removes
 * themselves (if they ever want to) the same way anyone else does, via
 * leaveGroupConversation, so there's exactly one code path for "I'm out"
 * rather than two that could drift apart. */
export async function removeGroupParticipant(session, conversationId, userId) {
  await assertGroupAdmin(session, conversationId);
  const targetId = Number(userId);
  if (targetId === session.id) { const e = new Error("Use \"Leave Group\" to remove yourself."); e.status = 400; throw e; }

  const [[target]] = await pool.query(
    `SELECT u.id, u.name FROM conversation_participants cp JOIN users u ON u.id = cp.user_id WHERE cp.conversation_id = ? AND cp.user_id = ?`,
    [conversationId, targetId]
  );
  if (!target) { const e = new Error("That person isn't in this group."); e.status = 404; throw e; }

  await pool.query(`DELETE FROM conversation_participants WHERE conversation_id = ? AND user_id = ?`, [conversationId, targetId]);
  await postSystemMessage(session, conversationId, `${session.name} removed ${target.name} from the group.`);
  await logActivity({ userId: session.id, module: "messaging", action: "group_member_removed", entityType: "conversation", entityId: conversationId, companyId: session.company_id, description: `Removed ${target.name} from the group` });
}

/**
 * The dashboard banner's data source — the company's single broadcast
 * conversation's latest message, or null when there isn't one or the
 * caller has already dismissed THIS exact message.
 *
 * Deliberately its OWN dismissal record (announcement_dismissals), not
 * conversation_participants.last_read_at — that field is also touched by
 * two things that have nothing to do with the dashboard banner: sending the
 * message yourself (marks your own last_read_at immediately, so the person
 * who posted it could never see their own banner) and simply opening the
 * Messages page (auto-marks the thread read, silently dismissing the
 * banner without the explicit "I've seen this" click). Tying dismissal to
 * a specific message id also means a brand-new announcement is
 * automatically "unseen" again for everyone, regardless of old dismissals.
 */
export async function getLatestAnnouncement(session) {
  const [[conversation]] = await pool.query(`SELECT id, title FROM conversations WHERE company_id = ? AND type = 'broadcast' LIMIT 1`, [session.company_id]);
  if (!conversation) return null;

  // message_type lands in the same migration as edited_at — filter out
  // "X left the group" system messages once it exists, fall back to no
  // filter (nothing but real messages exist pre-migration anyway) otherwise.
  const typeFilter = (await hasMessageEditingSchema()) ? `AND m.message_type != 'system'` : "";
  const [[message]] = await pool.query(
    `SELECT m.id, m.body, m.created_at, u.name AS sender_name
     FROM messages m LEFT JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id = ? ${typeFilter} ORDER BY m.created_at DESC LIMIT 1`,
    [conversation.id]
  );
  if (!message) return null;

  if (await hasAnnouncementDismissalsSchema()) {
    const [[dismissal]] = await pool.query(
      `SELECT id FROM announcement_dismissals WHERE conversation_id = ? AND user_id = ? AND message_id = ?`,
      [conversation.id, session.id, message.id]
    );
    if (dismissal) return null;
  }

  return { conversationId: conversation.id, messageId: message.id, title: conversation.title, body: message.body, senderName: message.sender_name, createdAt: message.created_at };
}

/** Marks the CURRENT latest message dismissed for this user — re-fetches
 * which message is actually latest rather than trusting a stale client
 * value, so a dismiss click can't accidentally suppress a newer
 * announcement that arrived after the page loaded. */
export async function dismissAnnouncement(session, conversationId) {
  if (!(await hasAnnouncementDismissalsSchema())) return;
  const [[conversation]] = await pool.query(`SELECT id FROM conversations WHERE id = ? AND company_id = ? AND type = 'broadcast'`, [conversationId, session.company_id]);
  if (!conversation) return;
  const [[message]] = await pool.query(`SELECT id FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1`, [conversation.id]);
  if (!message) return;
  await pool.query(
    `INSERT INTO announcement_dismissals (conversation_id, user_id, message_id) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE message_id = VALUES(message_id), dismissed_at = NOW()`,
    [conversation.id, session.id, message.id]
  );
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
