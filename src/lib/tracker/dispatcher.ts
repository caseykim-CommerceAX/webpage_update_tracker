import { spawn } from "node:child_process";
import { join } from "node:path";
import { db, nowIso } from "@/lib/db";

export function dispatchLocalRun(runId: string) {
  const root = process.cwd();
  const child = spawn(
    process.execPath,
    ["--use-system-ca", "--import", "tsx", join(root, "scripts", "scan.ts"), "--run-id", runId],
    { cwd: root, detached: true, stdio: "ignore", windowsHide: true, env: process.env },
  );
  child.once("error", (error) => {
    db.prepare("UPDATE Run SET status = 'FAILED', completedAt = ?, errorMessage = ? WHERE id = ?").run(nowIso(), error.message, runId);
  });
  child.unref();
}
