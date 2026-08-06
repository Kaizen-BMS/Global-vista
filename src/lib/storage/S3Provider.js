import "server-only";
import { StorageProvider } from "@/lib/storage/StorageProvider";

/**
 * NOT FUNCTIONAL — this is the documented shape for future S3
 * integration, not a working implementation. Throws clearly rather than
 * silently pretending to work, per this project's own repeated
 * principle against faking integrations that need external credentials.
 * Implement once AWS_S3_BUCKET/AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY
 * are actually provisioned, using @aws-sdk/client-s3.
 */
export class S3Provider extends StorageProvider {
  constructor() {
    super();
    if (!process.env.AWS_S3_BUCKET) {
      throw new Error("S3Provider requires AWS_S3_BUCKET and AWS credentials — not configured.");
    }
  }
  async upload() { throw new Error("S3Provider not yet implemented — install @aws-sdk/client-s3 and implement upload()."); }
  async delete() { throw new Error("S3Provider not yet implemented."); }
  async getSignedUrl() { throw new Error("S3Provider not yet implemented."); }
  async exists() { throw new Error("S3Provider not yet implemented."); }
}