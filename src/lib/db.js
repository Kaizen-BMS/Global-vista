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
    // Set per Hostinger support's explicit recommendation for this account's
    // max_connections_per_hour: 500 cap: a small, conservative connectionLimit
    // does NOT fix that cap (it's an hourly count of NEW connections opened,
    // not a concurrency limit) but it does reduce how many distinct
    // connections this process can ever open at once, which is the one lever
    // available on the app side. Known tradeoff, accepted deliberately: pages
    // that fire many parallel queries in one Promise.all (e.g. the Platform
    // Dashboard's ~16-query fan-out) will queue requests behind these 5
    // connections instead of running them all at once — waitForConnections:
    // true + queueLimit: 0 means they wait rather than error, just slower
    // under load. If that queuing becomes a real problem, fix it by reducing
    // the number of separate queries those pages fire (combine several into
    // fewer round trips, the way getStorageUsage already does with
    // subqueries) — do NOT raise connectionLimit to compensate; a bigger pool
    // opens more connections per hour, working against the actual constraint.
    connectionLimit: 5,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 10000,
    idleTimeout: 60000,
    maxIdle: 5,
  });
  pool.on("error", (err) => console.error("MySQL pool error:", err.code, err.message));
  return pool;
}

export const pool = globalForPool.__gvPool || createPool();
if (process.env.NODE_ENV !== "production") globalForPool.__gvPool = pool;