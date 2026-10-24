import type { PoolClient } from "pg";

import { pool } from "@/db/client";

export async function GET() {
  let client: PoolClient | undefined;
  let healthyClient = false;

  try {
    client = await pool.connect();
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout = '2000ms'");
    await client.query("SELECT 1");
    await client.query("COMMIT");
    healthyClient = true;
    return Response.json({ status: "ok" }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ status: "unavailable" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  } finally {
    client?.release(!healthyClient);
  }
}
