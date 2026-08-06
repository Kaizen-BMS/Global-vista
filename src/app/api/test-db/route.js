// app/api/test-db/route.js
export const runtime = "nodejs";

import db from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await db.query("SELECT NOW() AS server_time");

    return Response.json({
      success: true,
      message: "Database Connected Successfully",
      database: process.env.DB_NAME,
      serverTime: rows[0].server_time,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        message: "Database Connection Failed",
        error: error.message,
      },
      { status: 500 }
    );
  }
}