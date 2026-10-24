import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const appRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
dotenv.config({ path: resolve(appRoot, ".env.local") });

const connectionString = process.env.MIGRATOR_DATABASE_URL;
if (!connectionString) {
  throw new Error("MIGRATOR_DATABASE_URL is required to apply schema migrations.");
}

const pool = new Pool({ connectionString });
try {
  await migrate(drizzle(pool), { migrationsFolder: resolve(appRoot, "drizzle") });
  console.log("Database migrations applied successfully.");
} finally {
  await pool.end();
}
