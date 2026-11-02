import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { createNotification } from "@/lib/actions/notifications";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { uploadFile, getFileUrl } from "@/lib/services/StorageService";
import { hasMessageEditingSchema, hasBlockedUsersSchema, hasAnnouncementDismissalsSchema, hasExternalMessagingSchema } from "@/lib/db/schemaFlags";
import { listChildCompanies } from "@/lib/actions/companySwitch";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const EDIT_WINDOW_MS = 2 * 60 * 1000;

/** Every conversation lookup re-verifies both company_id AND that the
 * session user is actually a participant — company match alone isn't
 * enough (two employees in the same company must not read each other's
 * direct messages just because they share a tenant). This is the single
 * choke point every messaging action below goes through. */
async function assertParticipant(session, conversationId) {
  const [[row]] = await pool.query(
    `SELECT c.id, c.company_id, c.counterparty_company_id, c.type, c.title, c.created_by, cp.last_read_at
     FROM conversations c JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = ?
     WHERE c.id = ? AND (c.company_id = ? OR c.counterparty_company_id = ?)`,
    [session.id, conversationId, session.company_id, session.company_id]
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

/**
 * GVE↔school external messaging — one shared thread per (GVE, school)
 * pair, found-or-created regardless of which side starts it, mirroring the
 * broadcast channel's "keep everyone synced" participant management. On
 * GVE's side every active employee is kept in sync as a participant (so
 * anyone can pick up a school's conversation); on the school's side only
 * whoever currently holds the `super-admin` (Owner/Principal) role is
 * synced in — found via user_roles/roles, the same join
 * switchIntoChildCompany already uses, never a live session's role_slug,
 * which only exists inside one signed-in session and isn't queryable
 * across users. Posting is further restricted to a GVE Super Admin in
 * sendMessage; this function only governs who can ever see the thread.
 */
export async function getOrCreateExternalConversation(session, { schoolCompanyId } = {}) {
  if (!(await hasExternalMessagingSchema())) { const e = new Error("External messaging isn't available yet."); e.status = 400; throw e; }

  let gveId, schoolId;
  if (session.is_child_company) {
    if (session.role_slug !== "super-admin") { const e = new Error("Only your school's Owner can message Global Vista Educators."); e.status = 403; throw e; }
    if (!session.parent_company_id) { const e = new Error("Your company has no parent to message."); e.status = 400; throw e; }
    gveId = session.parent_company_id;
    schoolId = session.company_id;
  } else {
    if (!session.can_create_child_companies) { const e = new Error("Your company can't message schools."); e.status = 403; throw e; }
    const children = await listChildCompanies(session);
    if (!children.some((c) => c.id === Number(schoolCompanyId))) { const e = new Error("That company is not one of your schools."); e.status = 403; throw e; }
    gveId = session.company_id;
    schoolId = Number(schoolCompanyId);
  }

  let conversationId;
  const [[existing]] = await pool.query(`SELECT id FROM conversations WHERE company_id = ? AND counterparty_company_id = ? AND type = 'external' LIMIT 1`, [gveId, schoolId]);
  if (existing) {
    conversationId = existing.id;
  } else {
    // ON DUPLICATE KEY UPDATE id=id turns a race between both sides
    // starting the same thread for the first time into a no-op on the
    // loser, instead of two rows — uq_external_pair is a no-op for every
    // other conversation type since MySQL treats NULL as distinct from
    // NULL there, so this only ever constrains `external` rows.
    const [result] = await pool.query(
      `INSERT INTO conversations (company_id, counterparty_company_id, type, created_by) VALUES (?, ?, 'external', ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
      [gveId, schoolId, session.id]
    );
    conversationId = result.insertId;
  }

  const [gveUsers] = await pool.query(`SELECT id FROM users WHERE company_id = ? AND is_deleted = 0 AND status = 'active'`, [gveId]);
  // Joined through users.role_id (the actual "current role" column — see
  // auth.js's own login query), NOT user_roles: that side table only holds
  // EXTRA grants for the multi-role switcher and is empty for most users,
  // who carry their one role solely on users.role_id (confirmed live —
  // most of this database's users have zero user_roles rows at all).
  const [schoolOwners] = await pool.query(
    `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.company_id = ? AND u.is_deleted = 0 AND u.status = 'active' AND r.company_id = ? AND r.slug = 'super-admin' AND r.is_deleted = 0 AND r.status = 'active'`,
    [schoolId, schoolId]
  );
  const [existingParticipants] = await pool.query(`SELECT user_id FROM conversation_participants WHERE conversation_id = ?`, [conversationId]);
  const already = new Set(existingParticipants.map((r) => r.user_id));
  const missing = [...gveUsers, ...schoolOwners].filter((u) => !already.has(u.id));
  if (missing.length) {
    await pool.query(`INSERT INTO conversation_participants (conversation_id, user_id) VALUES ?`, [missing.map((u) => [conversationId, u.id])]);
  }
  return conversationId;
}

export async function listConversations(session) {
  const [rows] = await pool.query(
    `SELECT c.id, c.type, c.title, c.created_by, c.updated_at, c.company_id, c.counterparty_company_id, cp.last_read_at,
            (SELECT m.body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
            (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
            (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01')) AS unread_count,
            (SELECT GROUP_CONCAT(u.name SEPARATOR ', ') FROM conversation_participants op JOIN users u ON u.id = op.user_id WHERE op.conversation_id = c.id AND op.user_id != ?) AS other_participant_names,
            (SELECT op3.user_id FROM conversation_participants op3 WHERE op3.conversation_id = c.id AND op3.user_id != ? AND c.type = 'direct' LIMIT 1) AS other_participant_id,
            (SELECT COUNT(*) FROM conversation_participants op2 WHERE op2.conversation_id = c.id) AS participant_count,
            (SELECT co.name FROM companies co WHERE co.id = (CASE WHEN c.company_id = ? THEN c.counterparty_company_id ELSE c.company_id END)) AS external_company_name
     FROM conversations c
     JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = ?
     WHERE (c.company_id = ? OR c.counterparty_company_id = ?)
     ORDER BY COALESCE(c.updated_at, c.created_at) DESC`,
    [session.id, session.id, session.company_id, session.id, session.company_id, session.company_id]
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
  // GVE side of an external thread: anyone can read, only a Super Admin can
  // speak "as GVE" to a school — same read-everyone/write-Super-Admin split
  // broadcast already uses. The school side has no equivalent restriction
  // here because only its Owner/Principal is ever synced in as a
  // participant in the first place (see getOrCreateExternalConversation).
  if (conversation.type === "external" && conversation.company_id === session.company_id && !isSuperAdmin(session)) {
    const e = new Error("Only a Super Admin can post in an external conversation."); e.status = 403; throw e;
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

  // Stamped with the CONVERSATION's own company_id (always GVE's id for an
  // external thread), not the sender's session.company_id — otherwise the
  // same thread would end up with two different company_id values on its
  // messages depending on which side sent them, which the unread-count and
  // search queries above are no longer written to tolerate.
  const [result] = await pool.query(
    `INSERT INTO messages (company_id, conversation_id, sender_id, body, file_name, file_url, file_size) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [conversation.company_id, conversationId, senderId, body?.trim() || "", fileMeta?.name || null, fileMeta?.key || null, fileMeta?.size || null]
  );
  await pool.query(`UPDATE conversations SET updated_at = NOW() WHERE id = ?`, [conversationId]);
  // Sending counts as having read up to your own message.
  await pool.query(`UPDATE conversation_participants SET last_read_at = NOW() WHERE conversation_id = ? AND user_id = ?`, [conversationId, senderId]);

  // Each recipient's notification is scoped to THEIR OWN company_id, not the
  // sender's — identical for every normal single-company conversation
  // (sender and recipient already share one company_id there), but for an
  // external thread the two sides genuinely differ, and getUserNotifications/
  // getSidebarBadgeCounts both filter notifications by the viewer's own
  // company_id.
  const [participants] = await pool.query(`SELECT cp.user_id, u.company_id FROM conversation_participants cp JOIN users u ON u.id = cp.user_id WHERE cp.conversation_id = ? AND cp.user_id != ?`, [conversationId, senderId]);
  const preview = body?.trim() ? (body.length > 80 ? `${body.slice(0, 80)}…` : body) : `Sent an attachment: ${fileMeta?.name || ""}`;
  for (const p of participants) {
    await createNotification(p.company_id, p.user_id, {
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

/**
 * Same contract as getLatestAnnouncement, but reads the PARENT company's
 * own broadcast conversation (e.g. Global Vista Educators posting into
 * ITS OWN "Company Announcements" channel) instead of this company's own
 * — lets a child company (a school) see its parent's broadcasts on its
 * own dashboard too, alongside (never instead of) its own company's
 * announcements. No new send-side UI needed: the parent's Super Admin
 * already posts into their own existing broadcast conversation exactly
 * as before; this just gives a child a second, read-only window into
 * that same conversation. Returns null for any company with no parent,
 * same "nothing to show" contract as getLatestAnnouncement.
 */
export async function getLatestParentAnnouncement(session) {
  if (!session.parent_company_id) return null;
  const [[conversation]] = await pool.query(
    `SELECT c.id, c.title, co.name AS company_name FROM conversations c JOIN companies co ON co.id = c.company_id WHERE c.company_id = ? AND c.type = 'broadcast' LIMIT 1`,
    [session.parent_company_id]
  );
  if (!conversation) return null;

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

  return { conversationId: conversation.id, messageId: message.id, title: conversation.title, companyName: conversation.company_name, body: message.body, senderName: message.sender_name, createdAt: message.created_at };
}

/** Marks the CURRENT latest message dismissed for this user — re-fetches
 * which message is actually latest rather than trusting a stale client
 * value, so a dismiss click can't accidentally suppress a newer
 * announcement that arrived after the page loaded. Checks BOTH this
 * session's own company and its parent (if any) — a child company's
 * user might be dismissing either their own company's announcement or
 * their parent's, and the conversation's real company_id tells us which. */
export async function dismissAnnouncement(session, conversationId) {
  if (!(await hasAnnouncementDismissalsSchema())) return;
  const [[conversation]] = await pool.query(
    `SELECT id FROM conversations WHERE id = ? AND type = 'broadcast' AND company_id IN (?, ?)`,
    [conversationId, session.company_id, session.parent_company_id || 0]
  );
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
     JOIN conversations c ON c.id = m.conversation_id
     WHERE (c.company_id = ? OR c.counterparty_company_id = ?) AND m.sender_id != ? AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01')`,
    [session.id, session.company_id, session.company_id, session.id]
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
     WHERE (c.company_id = ? OR c.counterparty_company_id = ?) AND MATCH(m.body) AGAINST (? IN NATURAL LANGUAGE MODE)
     ORDER BY m.created_at DESC LIMIT 30`,
    [session.id, session.company_id, session.company_id, q]
  );
  return rows;
}
