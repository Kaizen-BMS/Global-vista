import "server-only";
import mysql from "mysql2/promise";

const globalForPool = globalThis;

function createPool() {
  const pool = mysql.createPool({
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
    // 10 was too tight for this app's actual concurrency: pages like the
    // workspace dashboard fan out ~20 parallel queries on a single load,
    // and every authenticated request also does its own auth-check
    // queries — under a few concurrent tabs/pollers that exhausted the
    // pool, and mysql2 has no separate timeout for a request queued
    // waiting on a busy pool, so it can hang until something frees up
    // rather than failing fast. Raised the ceiling instead of adding an
    // artificial timeout that would just turn contention into more errors.
    connectionLimit: 25,
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