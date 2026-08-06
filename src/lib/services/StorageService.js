import "server-only";
import { LocalProvider } from "@/lib/storage/LocalProvider";
import { S3Provider } from "@/lib/storage/S3Provider";
import { R2Provider } from "@/lib/storage/R2Provider";

/**
 * The ONLY entry point business code should use for file storage. Never
 * import a Provider class directly outside this file — this is what
 * lets STORAGE_DRIVER change (local → s3 → r2) without touching any
 * module's upload code, per the explicit "do not tightly couple
 * uploads" instruction.
 */
let cachedProvider = null;

function getProvider() {
  if (cachedProvider) return cachedProvider;
  const driver = process.env.STORAGE_DRIVER || "local";
  switch (driver) {
    case "s3": cachedProvider = new S3Provider(); break;
    case "r2": cachedProvider = new R2Provider(); break;
    case "local":
    default: cachedProvider = new LocalProvider(); break;
  }
  return cachedProvider;
}

function buildTenantKey(companyId, category, fileName) {
  // Every key is company-namespaced — this is tenant isolation applied
  // to storage, not just database rows. A signed URL for one company's
  // file can never resolve to another company's key by construction.
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `companies/${companyId}/${category}/${Date.now()}-${safeFileName}`;
}

export async function uploadFile({ companyId, category, buffer, fileName, mimeType, maxSizeBytes = 10 * 1024 * 1024 }) {
  if (buffer.length > maxSizeBytes) {
    const err = new Error(`File exceeds ${Math.round(maxSizeBytes / 1024 / 1024)}MB limit.`);
    err.status = 400;
    throw err;
  }
  const key = buildTenantKey(companyId, category, fileName);
  const result = await getProvider().upload(buffer, key, mimeType);
  return { ...result, fileName };
}

export async function deleteFile(key) {
  await getProvider().delete(key);
}

export async function getFileUrl(key, expiresInSeconds = 300) {
  return getProvider().getSignedUrl(key, expiresInSeconds);
}

export async function fileExists(key) {
  return getProvider().exists(key);
}