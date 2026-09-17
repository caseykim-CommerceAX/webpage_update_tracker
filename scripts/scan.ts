import "dotenv/config";
import { executeRun } from "../src/lib/tracker/runner";

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const source = argument("source") === "schedule" ? "SCHEDULE" : "MANUAL";
  const targetIds = argument("target-ids")?.split(",").filter(Boolean);
  const completed = await executeRun(source, targetIds);
  console.log(
    JSON.stringify({
      runId: completed.id,
      status: completed.status,
      processed: completed.processedCount,
      changed: completed.changedCount,
      failures: completed.failureCount,
      pending: completed.pendingCount,
    }),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
