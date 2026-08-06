import "server-only";
import mysql from "mysql2/promise";

const globalForPool = globalThis;

function createPool() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
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