import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

function run(command, args, stdio = "inherit") {
  const result = spawnSync(command, args, { stdio });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}.`);
  return result.stdout?.toString().trim() ?? "";
}

const backup = process.argv[2];
if (!backup || !existsSync(backup)) {
  throw new Error("Usage: npm run db:restore -- /path/to/trusted-backup.dump");
}

const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 17);
const suffix = randomBytes(3).toString("hex");
const target = `agent_collab_hub_restore_${timestamp}_${suffix}`;
run("pg_restore", ["--list", backup], "ignore");

let created = false;
try {
  run("createdb", ["--owner=agent_hub_owner", "--template=template0", target]);
  created = true;
  const setupSql = [
    `GRANT CONNECT ON DATABASE ${target} TO agent_hub_runtime`,
    `ALTER ROLE agent_hub_migrator IN DATABASE ${target} SET role TO agent_hub_owner`,
    "GRANT USAGE ON SCHEMA public TO agent_hub_runtime",
    "ALTER DEFAULT PRIVILEGES FOR ROLE agent_hub_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO agent_hub_runtime",
    "ALTER DEFAULT PRIVILEGES FOR ROLE agent_hub_owner IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO agent_hub_runtime",
  ].join("; ");
  run("psql", ["--dbname", target, "--set", "ON_ERROR_STOP=1", "--command", setupSql]);
  run("pg_restore", ["--exit-on-error", "--role=agent_hub_owner", "--dbname", target, backup]);
} catch (error) {
  if (created) {
    const cleanup = spawnSync("dropdb", ["--if-exists", target], { stdio: "ignore" });
    if (cleanup.status !== 0) console.error(`Temporary restore database may need manual cleanup: ${target}`);
  }
  throw error;
}

console.log(`Restored into a new database: ${target}`);
console.log("The source database was not changed. To inspect the restore, point DATABASE_URL to this database using the existing runtime-role credentials.");
