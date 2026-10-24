import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as authSchema from "./auth-schema";
import * as appSchema from "./schema";

const globalForDb = globalThis as typeof globalThis & { dbPool?: Pool };
export const pool = globalForDb.dbPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 2_500,
});
if (process.env.NODE_ENV !== "production") globalForDb.dbPool = pool;

export const db = drizzle(pool, { schema: { ...authSchema, ...appSchema } });
