import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const appRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const toolRoot = mkdtempSync(join(tmpdir(), "agent-collab-hub-drizzle-"));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, {
    cwd: appRoot,
    env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
  return result.status === 0;
}

try {
  const installed = run(npm, [
    "install",
    "--prefix",
    toolRoot,
    "--no-save",
    "--no-package-lock",
    "drizzle-kit@0.31.11",
    "drizzle-orm@0.45.4",
  ]);
  if (installed) {
    const bin = join(toolRoot, "node_modules", ".bin", "drizzle-kit");
    const env = {
      ...process.env,
      PATH: `${join(toolRoot, "node_modules", ".bin")}${delimiter}${process.env.PATH ?? ""}`,
    };
    run(bin, process.argv.slice(2), env);
  }
} finally {
  rmSync(toolRoot, { recursive: true, force: true });
}
