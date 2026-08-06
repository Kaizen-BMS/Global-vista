import "server-only";
import mysql from "mysql2/promise";

// Server-only. Never import this file (directly or transitively) into a
// "use client" component.

const globalForPool = globalThis;

function createPool() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "u111637957_gv_crm",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 10000,
    // ROOT CAUSE FIX for ECONNRESET: Hostinger's MySQL enforces a
    // server-side wait_timeout (commonly 60s) that silently drops idle
    // connections. mysql2's pool has no way to know a pooled connection
    // died until it's reused, which surfaces as ECONNRESET on the next
    // query. idleTimeout proactively closes+replaces connections that
    // have been idle longer than this, before the server kills them —
    // set comfortably below the typical 60s server wait_timeout.
    idleTimeout: 30000,
    maxIdle: 10,
  });

  // Without this handler, an async pool-level error (e.g. a connection
  // dying while idle in the pool) is an unhandled 'error' event and can
  // crash the whole Node process. Log instead of dying.
  pool.on("error", (err) => {
    console.error("MySQL pool error:", err.code, err.message);
  });

  return pool;
}

export const pool = globalForPool.__gvCrmPool || createPool();

if (process.env.NODE_ENV !== "production") {
  globalForPool.__gvCrmPool = pool;
}

const TRANSIENT_CODES = new Set([
  "ECONNRESET",
  "PROTOCOL_CONNECTION_LOST",
  "ETIMEDOUT",
  "ECONNREFUSED",
]);

export async function withRetry(fn, retries = 1) {
  try {
    return await fn();
  } catch (err) {
    if (retries > 0 && TRANSIENT_CODES.has(err.code)) {
      await new Promise((r) => setTimeout(r, 150));
      return withRetry(fn, retries - 1);
    }
    throw err;
  }
}