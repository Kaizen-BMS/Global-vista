import "server-only";
import { StorageProvider } from "@/lib/storage/StorageProvider";

/**
 * NOT FUNCTIONAL — same status as S3Provider. Cloudflare R2 is
 * S3-API-compatible, so this will likely reuse @aws-sdk/client-s3 with
 * a custom endpoint once implemented, but is not built here.
 */
export class R2Provider extends StorageProvider {
  constructor() {
    super();
    if (!process.env.R2_ACCOUNT_ID) {
      throw new Error("R2Provider requires R2_ACCOUNT_ID and R2 credentials — not configured.");
    }
  }
  async upload() { throw new Error("R2Provider not yet implemented."); }
  async delete() { throw new Error("R2Provider not yet implemented."); }
  async getSignedUrl() { throw new Error("R2Provider not yet implemented."); }
  async exists() { throw new Error("R2Provider not yet implemented."); }
}