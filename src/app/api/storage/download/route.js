import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { getSession } from "@/lib/auth";
import { forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";

const STORAGE_ROOT = process.env.LOCAL_STORAGE_PATH || path.join(process.cwd(), ".storage");

/**
 * Resolves LocalProvider signed URLs. Verifies the HMAC token AND that
 * the requesting session's company_id matches the key's embedded
 * company segment (companies/{id}/...) — belt-and-suspenders on top of
 * the signed token itself, since a leaked/forwarded signed URL should
 * still not cross a tenant boundary if the session checking it belongs
 * to a different company.
 */
export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!session) return forbidden("Sign in required.");

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const expires = Number(searchParams.get("expires"));
  const token = searchParams.get("token");
  if (!key || !expires || !token) return badRequest("Malformed download link.");
  if (Date.now() > expires) return forbidden("This download link has expired.");

  const expectedToken = crypto
    .createHmac("sha256", process.env.CRM_JWT_SECRET || "dev-secret")
    .update(`${key}:${expires}`)
    .digest("hex");
  if (token.length !== expectedToken.length || !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken))) {
    return forbidden("Invalid download token.");
  }

  const keyCompanySegment = key.match(/^companies\/(\d+)\//)?.[1];
  if (!keyCompanySegment || Number(keyCompanySegment) !== session.company_id) {
    return forbidden("This file does not belong to your company.");
  }

  const fullPath = path.resolve(STORAGE_ROOT, key);
  if (!fullPath.startsWith(STORAGE_ROOT)) return badRequest("Invalid file key.");

  const buffer = await fs.readFile(fullPath);
  return new Response(buffer, { headers: { "Content-Disposition": `attachment; filename="${path.basename(key)}"` } });
});