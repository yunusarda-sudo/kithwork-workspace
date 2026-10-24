import { closeSync, chmodSync, mkdirSync, openSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

const appRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const projectRoot = resolve(appRoot, "../..");
dotenv.config({ path: resolve(appRoot, ".env.local") });

const connectionString = process.env.MIGRATOR_DATABASE_URL;
if (!connectionString) throw new Error("MIGRATOR_DATABASE_URL is required to create a backup.");
const connection = new URL(connectionString);
const database = decodeURIComponent(connection.pathname.slice(1));
if (!["localhost", "127.0.0.1", "::1"].includes(connection.hostname) || !database.startsWith("agent_collab_hub")) {
  throw new Error("Backups are limited to local agent_collab_hub databases.");
}

const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const output = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : resolve(projectRoot, "backups", `${database}-${timestamp}.dump`);
mkdirSync(dirname(output), { recursive: true, mode: 0o700 });
const file = openSync(output, "wx", 0o600);
closeSync(file);

const env = {
  PATH: process.env.PATH ?? "/usr/bin:/bin",
  HOME: process.env.HOME ?? "",
  PGHOST: connection.hostname,
  PGPORT: connection.port || "5432",
  PGUSER: decodeURIComponent(connection.username),
  PGPASSWORD: decodeURIComponent(connection.password),
  PGDATABASE: database,
};
const result = spawnSync("pg_dump", ["--format=custom", "--file", output], { env, stdio: "inherit" });
if (result.error || result.status !== 0) {
  unlinkSync(output);
  throw result.error ?? new Error(`pg_dump exited with status ${result.status}.`);
}

chmodSync(output, 0o600);
console.log(`Backup written with owner-only permissions: ${output}`);
