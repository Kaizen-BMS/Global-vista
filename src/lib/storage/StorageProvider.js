/**
 * Common interface every storage backend (Local, S3, R2) implements, so
 * StorageService can swap drivers via STORAGE_DRIVER without any caller
 * knowing which one is active.
 */
export class StorageProvider {
  async upload(_buffer, _key, _mimeType) { throw new Error("upload() not implemented"); }
  async delete(_key) { throw new Error("delete() not implemented"); }
  async getSignedUrl(_key, _expiresInSeconds) { throw new Error("getSignedUrl() not implemented"); }
  async exists(_key) { throw new Error("exists() not implemented"); }
}
