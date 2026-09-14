import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const databaseBase = resolve(process.cwd(), ".data/runner.test.db");
process.env.DATABASE_URL = "file:./.data/runner.test.db";
process.env.SCAN_RETRIES = "0";

let database: typeof import("@/lib/db");
let runner: typeof import("@/lib/tracker/runner");
let targetService: typeof import("@/lib/target-service");
let targetId: string;

function removeTestDatabase() {
  for (const suffix of ["", "-wal", "-shm"]) {
    const path = `${databaseBase}${suffix}`;
    if (existsSync(path)) rmSync(path);
  }
}

beforeAll(async () => {
  removeTestDatabase();
  database = await import("@/lib/db");
  runner = await import("@/lib/tracker/runner");
  targetService = await import("@/lib/target-service");
  targetId = database.createId();
  const endpointId = database.createId();
  const timestamp = database.nowIso();
  database.db.prepare("INSERT INTO Target (id, displayOrder, name, category, monitorMode, enabled, createdAt, updatedAt) VALUES (?, 1, '테스트 카드', '테스트', 'CONTENT', 1, ?, ?)").run(targetId, timestamp, timestamp);
  database.db.prepare("INSERT INTO Endpoint (id, targetId, platform, url, lifecycle, enabled, createdAt, updatedAt) VALUES (?, ?, 'DESKTOP', 'https://example.com/card', 'EXISTING', 1, ?, ?)").run(endpointId, targetId, timestamp, timestamp);
  database.db.prepare("INSERT INTO Rule (id, targetId, type, label, expectedStatuses, enabled, displayOrder, createdAt, updatedAt) VALUES (?, ?, 'HTTP_STATUS', 'HTTP 200', '[200]', 1, 0, ?, ?)").run(database.createId(), targetId, timestamp, timestamp);
});

afterAll(() => {
  vi.unstubAllGlobals();
  database.closeDb();
  removeTestDatabase();
});

describe("검사 실행 이력", () => {
  it("기준선, 무변경, 변경을 순서대로 기록한다", async () => {
    const html = (text: string) => `<html><head><title>카드</title></head><body><h2>${text}</h2></body></html>`;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(html("첫 혜택"), { status: 200, headers: { "content-type": "text/html" } }))));
    const first = runner.createQueuedRun("MANUAL", [targetId]);
    await runner.executeRun(first.id);
    expect((database.db.prepare("SELECT changeStatus FROM EndpointCheck WHERE runId = ?").get(first.id) as { changeStatus: string }).changeStatus).toBe("BASELINE");

    const second = runner.createQueuedRun("MANUAL", [targetId]);
    await runner.executeRun(second.id);
    const unchanged = database.db.prepare(
      "SELECT id, changeStatus, comparedCheckId FROM EndpointCheck WHERE runId = ?",
    ).get(second.id) as { id: string; changeStatus: string; comparedCheckId: string };
    expect(unchanged.changeStatus).toBe("UNCHANGED");
    expect(unchanged.comparedCheckId).toBeTruthy();

    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(html("새 혜택"), { status: 200, headers: { "content-type": "text/html" } }))));
    const third = runner.createQueuedRun("MANUAL", [targetId]);
    const completed = await runner.executeRun(third.id);
    expect(completed.changedCount).toBe(1);
    const changed = database.db.prepare(
      `SELECT changeStatus, snapshotId, comparedCheckId,
              headAddedCount, headRemovedCount, bodyAddedCount, bodyRemovedCount
       FROM EndpointCheck WHERE runId = ?`,
    ).get(third.id) as {
      changeStatus: string;
      snapshotId: string;
      comparedCheckId: string;
      headAddedCount: number;
      headRemovedCount: number;
      bodyAddedCount: number;
      bodyRemovedCount: number;
    };
    expect(changed.changeStatus).toBe("CHANGED");
    expect(changed.comparedCheckId).toBe(unchanged.id);
    expect(changed.headAddedCount + changed.headRemovedCount).toBe(0);
    expect(changed.bodyAddedCount).toBe(1);
    expect(changed.bodyRemovedCount).toBe(1);
    expect((database.db.prepare("SELECT diffJson FROM Snapshot WHERE id = ?").get(changed.snapshotId) as { diffJson: string }).diffJson).toContain("새 혜택");
  });

  it("URL 변경 시 이전 Endpoint와 스냅샷을 보존하고 새 기준선을 준비한다", () => {
    const previous = database.db.prepare("SELECT id FROM Endpoint WHERE targetId = ? AND retiredAt IS NULL").get(targetId) as { id: string };
    targetService.updateTarget(targetId, {
      name: "테스트 카드",
      category: "테스트",
      monitorMode: "CONTENT",
      enabled: true,
      endpoints: [{ platform: "DESKTOP", url: "https://example.com/card-v2", referenceUrl: "https://example.com/card", lifecycle: "PRELAUNCH" }],
      rules: [{ type: "HTTP_STATUS", label: "HTTP 200", expectedStatuses: [200], enabled: true }],
    });
    const retired = database.db.prepare("SELECT retiredAt, enabled FROM Endpoint WHERE id = ?").get(previous.id) as { retiredAt: string | null; enabled: number };
    const current = database.db.prepare("SELECT id, url FROM Endpoint WHERE targetId = ? AND retiredAt IS NULL").get(targetId) as { id: string; url: string };
    expect(retired.retiredAt).toBeTruthy();
    expect(retired.enabled).toBe(0);
    expect(current.url).toBe("https://example.com/card-v2");
    expect(current.id).not.toBe(previous.id);
    expect((database.db.prepare("SELECT COUNT(*) AS count FROM Snapshot WHERE endpointId = ?").get(previous.id) as { count: number }).count).toBe(2);
    expect((database.db.prepare("SELECT COUNT(*) AS count FROM Snapshot WHERE endpointId = ?").get(current.id) as { count: number }).count).toBe(0);
  });
});
