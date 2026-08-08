import "server-only";
import fs from "fs/promises";
import path from "path";

/**
 * Branding images (logos, favicon, watermark, background) are public by
 * design — they must render on the login page, public lead forms, and in
 * emails opened with no session at all. The existing StorageService /
 * /api/storage/download pipeline is session-gated and forces
 * Content-Disposition: attachment (built for private exports, e.g. failed
 * import rows), so it can't serve these. Branding assets instead go
 * straight into /public/uploads, which Next.js serves statically and
 * unauthenticated — the correct fit for public-by-design content.
 */
const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "branding");
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = {
  "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg",
};
const ALLOWED_CATEGORIES = new Set([
  "logo", "sidebar_logo", "favicon", "watermark", "login_logo", "email_logo", "website_logo", "background",
]);

export function isAllowedCategory(category) {
  return ALLOWED_CATEGORIES.has(category);
}

export async function saveBrandingUpload({ companyId, category, file }) {
  if (!isAllowedCategory(category)) {
    const err = new Error("Invalid upload category."); err.status = 400; throw err;
  }
  const ext = ALLOWED_MIME[file.type];
  if (!ext) {
    const err = new Error("Unsupported file type. Use PNG, JPG, WEBP, or SVG."); err.status = 400; throw err;
  }
  if (file.size > MAX_SIZE_BYTES) {
    const err = new Error(`File exceeds ${MAX_SIZE_BYTES / 1024 / 1024}MB limit.`); err.status = 400; throw err;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dir = path.join(UPLOAD_ROOT, String(companyId), category);
  await fs.mkdir(dir, { recursive: true });
  const fileName = `${Date.now()}.${ext}`;
  await fs.writeFile(path.join(dir, fileName), buffer);

  return `/uploads/branding/${companyId}/${category}/${fileName}`;
}
