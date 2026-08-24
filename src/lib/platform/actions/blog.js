import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { hasBlogSchema } from "@/lib/db/schemaFlags";

function assertSchemaReady() {
  const e = new Error("The blog schema hasn't been applied to this database yet."); e.status = 503; throw e;
}

function slugify(title) {
  return title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 200);
}

async function uniqueSlug(baseTitle, excludeId = null) {
  const base = slugify(baseTitle) || "post";
  let slug = base;
  let n = 1;
  for (;;) {
    const [[row]] = await pool.query(
      `SELECT id FROM blog_posts WHERE slug = ? ${excludeId ? "AND id != ?" : ""} LIMIT 1`,
      excludeId ? [slug, excludeId] : [slug]
    );
    if (!row) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

// ---------------------------------------------------------------------------
// Platform Operator — full CRUD
// ---------------------------------------------------------------------------

export async function listBlogPostsForAdmin() {
  if (!(await hasBlogSchema())) return [];
  const [rows] = await pool.query(`SELECT * FROM blog_posts ORDER BY created_at DESC`);
  return rows;
}

export async function getBlogPostForAdmin(id) {
  if (!(await hasBlogSchema())) return null;
  const [[row]] = await pool.query(`SELECT * FROM blog_posts WHERE id = ?`, [id]);
  return row || null;
}

export async function createBlogPost(session, data) {
  assertPlatformOperator(session);
  if (!(await hasBlogSchema())) assertSchemaReady();
  if (!data.title || !data.title.trim()) { const e = new Error("Title is required."); e.status = 400; throw e; }
  if (!data.content || !data.content.trim()) { const e = new Error("Content is required."); e.status = 400; throw e; }

  const slug = await uniqueSlug(data.title);
  const status = data.status === "published" ? "published" : "draft";
  const [result] = await pool.query(
    `INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, status, published_at, created_by)
     VALUES (?,?,?,?,?,?,?,?)`,
    [data.title.trim(), slug, data.excerpt || null, data.content, data.coverImageUrl || null, status, status === "published" ? new Date() : null, session.id]
  );
  await logActivity({ userId: session.id, module: "platform", action: "blog_post_created", entityType: "blog_post", entityId: result.insertId, description: `Created blog post "${data.title.trim()}"` }).catch(() => {});
  return { id: result.insertId, slug };
}

export async function updateBlogPost(session, id, data) {
  assertPlatformOperator(session);
  if (!(await hasBlogSchema())) assertSchemaReady();
  const [[existing]] = await pool.query(`SELECT * FROM blog_posts WHERE id = ?`, [id]);
  if (!existing) { const e = new Error("Post not found."); e.status = 404; throw e; }
  if (!data.title || !data.title.trim()) { const e = new Error("Title is required."); e.status = 400; throw e; }
  if (!data.content || !data.content.trim()) { const e = new Error("Content is required."); e.status = 400; throw e; }

  // Slug is only ever regenerated from the title if the title actually
  // changed — a published post's URL must not silently move under anyone
  // who has already linked to it just because they tweaked a typo.
  const slug = data.title.trim() !== existing.title ? await uniqueSlug(data.title, id) : existing.slug;
  const status = data.status === "published" ? "published" : "draft";
  const nowPublishing = status === "published" && existing.status !== "published";

  await pool.query(
    `UPDATE blog_posts SET title=?, slug=?, excerpt=?, content=?, cover_image_url=?, status=?, published_at=? WHERE id=?`,
    [
      data.title.trim(), slug, data.excerpt || null, data.content, data.coverImageUrl || null, status,
      nowPublishing ? new Date() : existing.published_at,
      id,
    ]
  );
  await logActivity({ userId: session.id, module: "platform", action: "blog_post_updated", entityType: "blog_post", entityId: id, description: `Updated blog post "${data.title.trim()}"` }).catch(() => {});
  return { id, slug };
}

export async function deleteBlogPost(session, id) {
  assertPlatformOperator(session);
  if (!(await hasBlogSchema())) assertSchemaReady();
  const [[existing]] = await pool.query(`SELECT title FROM blog_posts WHERE id = ?`, [id]);
  if (!existing) { const e = new Error("Post not found."); e.status = 404; throw e; }
  await pool.query(`DELETE FROM blog_posts WHERE id = ?`, [id]);
  await logActivity({ userId: session.id, module: "platform", action: "blog_post_deleted", entityType: "blog_post", entityId: id, description: `Deleted blog post "${existing.title}"` }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Public — published only
// ---------------------------------------------------------------------------

/** Real read-time estimate from the post's own content (~200 wpm), not a
 * fabricated number — strips basic HTML tags before counting words. */
export function estimateReadMinutes(content) {
  const text = (content || "").replace(/<[^>]+>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export async function listPublishedBlogPosts(limit = null) {
  if (!(await hasBlogSchema())) return [];
  const [rows] = await pool.query(
    `SELECT id, title, slug, excerpt, content, cover_image_url, published_at FROM blog_posts
     WHERE status = 'published' ORDER BY published_at DESC ${limit ? "LIMIT ?" : ""}`,
    limit ? [limit] : []
  );
  return rows;
}

export async function getPublishedBlogPostBySlug(slug) {
  if (!(await hasBlogSchema())) return null;
  const [[row]] = await pool.query(`SELECT * FROM blog_posts WHERE slug = ? AND status = 'published' LIMIT 1`, [slug]);
  return row || null;
}
