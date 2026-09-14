import "dotenv/config";
import { closeDb } from "../src/lib/db";
import { createQueuedRun, executeRun } from "../src/lib/tracker/runner";

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const existingRunId = argument("run-id");
  const source = argument("source") === "schedule" ? "SCHEDULE" : "MANUAL";
  const targetIds = argument("target-ids")?.split(",").filter(Boolean);
  const run = existingRunId ? { id: existingRunId } : await createQueuedRun(source, targetIds);
  const completed = await executeRun(run.id);
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
  })
  .finally(() => {
    closeDb();
  });
