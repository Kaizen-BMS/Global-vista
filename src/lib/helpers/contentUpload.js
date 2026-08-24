import "server-only";
import fs from "fs/promises";
import path from "path";

/**
 * Blog cover images are public by design — they render on the
 * unauthenticated marketing homepage and public /blog pages. Same reasoning
 * as branding uploads (see brandingUpload.js): goes straight into
 * /public/uploads, which Next.js serves statically and unauthenticated,
 * rather than through the session-gated StorageService pipeline built for
 * private files.
 */
const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "content");
const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = {
  "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp",
};
const ALLOWED_CATEGORIES = new Set(["blog"]);

export async function saveContentUpload({ category, file }) {
  if (!ALLOWED_CATEGORIES.has(category)) {
    const err = new Error("Invalid upload category."); err.status = 400; throw err;
  }
  const ext = ALLOWED_MIME[file.type];
  if (!ext) {
    const err = new Error("Unsupported file type. Use PNG, JPG, or WEBP."); err.status = 400; throw err;
  }
  if (file.size > MAX_SIZE_BYTES) {
    const err = new Error(`File exceeds ${MAX_SIZE_BYTES / 1024 / 1024}MB limit.`); err.status = 400; throw err;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dir = path.join(UPLOAD_ROOT, category);
  await fs.mkdir(dir, { recursive: true });
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await fs.writeFile(path.join(dir, fileName), buffer);

  return `/uploads/content/${category}/${fileName}`;
}
