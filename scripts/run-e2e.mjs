import { spawn } from "node:child_process";
import { once } from "node:events";
import { join } from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

const root = process.cwd();
const nextCli = join(root, "node_modules", "next", "dist", "bin", "next");
const staticServer = join(root, "scripts", "serve-static.mjs");
const playwrightCli = join(root, "node_modules", "@playwright", "test", "cli.js");
const localBaseUrl = "http://127.0.0.1:3100";

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env,
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with code: ${code ?? signal ?? "unknown"}`));
    });
  });
}

async function waitForServer(server) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Test server exited early: ${server.exitCode}`);
    try {
      const response = await fetch(localBaseUrl, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
    } catch {
      // Keep checking until the server is ready.
    }
    await delay(250);
  }
  throw new Error("Test server did not become ready within 30 seconds.");
}

async function stopServer(server) {
  if (server.exitCode !== null || server.killed) return;
  server.kill();
  await Promise.race([once(server, "exit"), delay(5_000)]);
  if (server.exitCode !== null) return;

  server.kill("SIGKILL");
  await Promise.race([once(server, "exit"), delay(2_000)]);
}

async function main() {
  if (process.env.PLAYWRIGHT_BASE_URL) {
    await run(process.execPath, [playwrightCli, "test"]);
    return;
  }

  await run(process.execPath, [nextCli, "build"], {
    ...process.env,
    NEXT_PUBLIC_GITHUB_REPOSITORY_URL: "https://github.com/example/webpage-update-tracker",
  });
  const server = spawn(process.execPath, [staticServer, "--hostname", "127.0.0.1", "--port", "3100"], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
    windowsHide: true,
  });

  try {
    await waitForServer(server);
    await run(process.execPath, [playwrightCli, "test"], {
      ...process.env,
      PLAYWRIGHT_BASE_URL: localBaseUrl,
    });
  } finally {
    await stopServer(server);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
