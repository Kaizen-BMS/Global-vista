import "server-only";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { StorageProvider } from "@/lib/storage/StorageProvider";

// Deliberately writes outside /public — files must never be directly
// web-accessible by guessable path; access always goes through
// getSignedUrl(), which for Local means a short-lived signed download
// route (app/api/storage/download/[token]/route.js — not built in this
// batch, flagged as remaining work below), not a static file URL.
const STORAGE_ROOT = process.env.LOCAL_STORAGE_PATH || path.join(process.cwd(), ".storage");

function assertSafeKey(key) {
  // Prevent path traversal — a key containing ".." or an absolute path
  // must never resolve outside STORAGE_ROOT.
  const resolved = path.resolve(STORAGE_ROOT, key);
  if (!resolved.startsWith(STORAGE_ROOT)) {
    const err = new Error("Invalid storage key.");
    err.status = 400;
    throw err;
  }
  return resolved;
}

export class LocalProvider extends StorageProvider {
  async upload(buffer, key, _mimeType) {
    const fullPath = assertSafeKey(key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
    return { key, provider: "local" };
  }

  async delete(key) {
    const fullPath = assertSafeKey(key);
    try {
      await fs.unlink(fullPath);
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
  }

  async getSignedUrl(key, expiresInSeconds = 300) {
    // Local provider "signed URL" is a short-lived signed token
    // resolved by a dedicated download route — not a direct file path.
    const token = crypto
      .createHmac("sha256", process.env.CRM_JWT_SECRET || "dev-secret")
      .update(`${key}:${Date.now() + expiresInSeconds * 1000}`)
      .digest("hex");
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    return `/api/storage/download?key=${encodeURIComponent(key)}&expires=${expiresAt}&token=${token}`;
  }

  async exists(key) {
    const fullPath = assertSafeKey(key);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}