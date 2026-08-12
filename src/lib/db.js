import "server-only";
import mysql from "mysql2/promise";

const globalForPool = globalThis;

function createPool() {
  const pool = mysql.createPool({
    // Deliberately env-driven, never hardcoded: local development connects
    // to Hostinger's remote hostname (DB_HOST=srv1872.hstgr.io in
    // .env.local) since the app isn't running on the same box as the
    // database. If/when this app is actually deployed ON Hostinger
    // alongside the database, set DB_HOST=localhost in THAT environment's
    // .env only — a Unix-socket/localhost connection there is faster and
    // isn't subject to the same remote-connection accounting. Hardcoding
    // "localhost" here would break every local dev connection to the
    // remote DB, so it stays a config value, not a literal.
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    // Pins every connection's session to UTC ('+00:00', no named-zone tables
    // required) so NOW()/CURRENT_TIMESTAMP and JS Date <-> DATETIME
    // conversion are consistent regardless of the DB host's or app server's
    // own local OS timezone — display-time localization happens separately,
    // driven by the company's configured timezone setting.
    timezone: "Z",
    waitForConnections: true,
    // History: 25 originally (dashboard-fan-out contention) -> dropped to
    // 5 to minimize new-connection count while max_connections_per_hour
    // was throttled -> confirmed via a live test that the throttle has
    // now cleared (a single connection succeeds in <1s), and 5 was
    // provably too low: the Platform Dashboard alone fires 16 parallel
    // queries in one Promise.all, so 11 of them had to queue for one of
    // only 5 connections and one hit connectTimeout (ETIMEDOUT) waiting.
    // 20 comfortably covers that burst with margin. If the hourly-count
    // concern resurfaces, the real fix is reducing how many separate
    // queries getPlatformDashboard fires (several of those 16 could
    // combine into fewer round trips the way getStorageUsage already
    // does with subqueries) — not shrinking this below what a single
    // page load actually needs, which just turns "throttled" into
    // "broken" the way it did here.
    connectionLimit: 20,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 10000,
    idleTimeout: 30000,
    maxIdle: 10,
  });
  pool.on("error", (err) => console.error("MySQL pool error:", err.code, err.message));
  return pool;
}

export const pool = globalForPool.__gvPool || createPool();
if (process.env.NODE_ENV !== "production") globalForPool.__gvPool = pool;