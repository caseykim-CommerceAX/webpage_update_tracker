import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const databaseBase = resolve(process.cwd(), ".data/runner.test.db");
process.env.DATABASE_URL = "file:./.data/runner.test.db";
process.env.SCAN_RETRIES = "0";

let database: typeof import("@/lib/db");
let runner: typeof import("@/lib/tracker/runner");
let targetService: typeof import("@/lib/target-service");
let queries: typeof import("@/lib/queries");
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
  queries = await import("@/lib/queries");
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
    const html = (recommendation?: string) => `<html><head><title>카드</title></head><body><p>기존 안내</p>${recommendation ? `<h2>${recommendation}</h2>` : ""}</body></html>`;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(html(), { status: 200, headers: { "content-type": "text/html" } }))));
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

    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(html("ALL 카드, 이런 분께 추천드려요"), { status: 200, headers: { "content-type": "text/html" } }))));
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
    expect(changed.bodyRemovedCount).toBe(0);
    expect((database.db.prepare("SELECT diffJson FROM Snapshot WHERE id = ?").get(changed.snapshotId) as { diffJson: string }).diffJson).toContain("이런 분께 추천드려요");
    expect((database.db.prepare("SELECT liveStatus, headLiveMarkerFound, bodyLiveMarkerFound FROM EndpointCheck WHERE runId = ?").get(third.id) as {
      liveStatus: string;
      headLiveMarkerFound: number;
      bodyLiveMarkerFound: number;
    })).toEqual({ liveStatus: "CHECK_REQUIRED", headLiveMarkerFound: 0, bodyLiveMarkerFound: 1 });

    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(
      `<html><head><title>카드</title><meta property="og:site_name" content="KB국민카드"></head><body><p>기존 안내</p><h2>ALL 카드, 이런 분께 추천 드려요</h2></body></html>`,
      { status: 200, headers: { "content-type": "text/html" } },
    ))));
    const fourth = runner.createQueuedRun("MANUAL", [targetId]);
    await runner.executeRun(fourth.id);
    expect((database.db.prepare(
      "SELECT liveStatus, headLiveMarkerHtml, bodyLiveMarkerHtml FROM EndpointCheck WHERE runId = ?",
    ).get(fourth.id) as { liveStatus: string; headLiveMarkerHtml: string; bodyLiveMarkerHtml: string })).toEqual({
      liveStatus: "LIVE_COMPLETE",
      headLiveMarkerHtml: '<meta property="og:site_name" content="KB국민카드">',
      bodyLiveMarkerHtml: "<h2>ALL 카드, 이런 분께 추천 드려요</h2>",
    });
    expect((database.db.prepare("SELECT liveCompletedAt FROM Endpoint WHERE targetId = ? AND retiredAt IS NULL").get(targetId) as { liveCompletedAt: string | null }).liveCompletedAt).toBeTruthy();

    const transitions = queries.getCheckHistory({ targetId, transitionsOnly: true, pageSize: 50 });
    expect(transitions.total).toBe(3);
    expect(transitions.rows.map((row) => row.liveStatus)).toEqual(["LIVE_COMPLETE", "CHECK_REQUIRED", "BEFORE_LIVE"]);

    const grouped = queries.getCheckHistoryByEndpoint({ targetId, pageSize: 50 });
    expect(grouped.endpointTotal).toBe(1);
    expect(grouped.total).toBe(4);
    expect(grouped.groups).toHaveLength(1);
    expect(grouped.groups[0].url).toBe("https://example.com/card");
    expect(grouped.groups[0].checks.map((row) => row.liveStatus)).toEqual([
      "LIVE_COMPLETE",
      "CHECK_REQUIRED",
      "BEFORE_LIVE",
      "BEFORE_LIVE",
    ]);

    const missing = queries.getCheckHistoryByEndpoint({ query: "존재하지 않는 URL" });
    expect(missing.endpointTotal).toBe(0);
    expect(missing.total).toBe(0);
    expect(missing.groups).toEqual([]);
  });

  it("URL 변경 시 이전 Endpoint를 계속 추적하고 새 기준선을 준비한다", async () => {
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
    expect(retired.enabled).toBe(1);
    expect(current.url).toBe("https://example.com/card-v2");
    expect(current.id).not.toBe(previous.id);
    expect((database.db.prepare("SELECT COUNT(*) AS count FROM Snapshot WHERE endpointId = ?").get(previous.id) as { count: number }).count).toBe(3);
    expect((database.db.prepare("SELECT COUNT(*) AS count FROM Snapshot WHERE endpointId = ?").get(current.id) as { count: number }).count).toBe(0);

    const target = queries.getTargets().find((item) => item.id === targetId);
    expect(target?.endpoints).toHaveLength(2);
    expect(target?.endpoints.map((endpoint) => ({ url: endpoint.url, previous: Boolean(endpoint.retiredAt) }))).toEqual([
      { url: "https://example.com/card-v2", previous: false },
      { url: "https://example.com/card", previous: true },
    ]);

    const requestedUrls: string[] = [];
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input: string | URL | Request) => {
      requestedUrls.push(String(input));
      return Promise.resolve(new Response("<html><body>tracked</body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }));
    }));
    const run = runner.createQueuedRun("MANUAL", [targetId]);
    await runner.executeRun(run.id);
    expect(requestedUrls).toEqual([
      "https://example.com/card-v2",
      "https://example.com/card",
    ]);
    expect((database.db.prepare("SELECT COUNT(*) AS count FROM EndpointCheck WHERE runId = ?").get(run.id) as { count: number }).count).toBe(2);
  });
});
