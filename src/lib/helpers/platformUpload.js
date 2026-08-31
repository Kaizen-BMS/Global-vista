import "server-only";
import fs from "fs/promises";
import path from "path";

/**
 * Platform-level marketing images (the pricing-page promo/festival banner,
 * and anything similar added later) — public by design, same reasoning as
 * brandingUpload.js, but NOT scoped to a company since these live on the
 * shared /platform-home page rather than any one tenant's branded pages.
 */
const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "platform");
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = {
  "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg", "image/gif": "gif",
};
const ALLOWED_CATEGORIES = new Set(["offer_banner"]);

export function isAllowedPlatformCategory(category) {
  return ALLOWED_CATEGORIES.has(category);
}

export async function savePlatformUpload({ category, file }) {
  if (!isAllowedPlatformCategory(category)) {
    const err = new Error("Invalid upload category."); err.status = 400; throw err;
  }
  const ext = ALLOWED_MIME[file.type];
  if (!ext) {
    const err = new Error("Unsupported file type. Use PNG, JPG, WEBP, GIF, or SVG."); err.status = 400; throw err;
  }
  if (file.size > MAX_SIZE_BYTES) {
    const err = new Error(`File exceeds ${MAX_SIZE_BYTES / 1024 / 1024}MB limit.`); err.status = 400; throw err;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dir = path.join(UPLOAD_ROOT, category);
  await fs.mkdir(dir, { recursive: true });
  const fileName = `${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  await fs.writeFile(path.join(dir, fileName), buffer);

  return `/uploads/platform/${category}/${fileName}`;
}
