import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const testDataDirectory = resolve(process.cwd(), ".data", "runner-json-test");
process.env.TRACKER_DATA_DIR = testDataDirectory;
process.env.SCAN_RETRIES = "0";

let runner: typeof import("@/lib/tracker/runner");
let store: typeof import("@/lib/json-store");
let queries: typeof import("@/lib/queries");

const targetId = "target-1";
const endpointId = "endpoint-1";
const ruleId = "rule-1";

function targets(currentUrl = "https://example.com/card", includePrevious = false) {
  return {
    schemaVersion: 1,
    targets: [{
      id: targetId,
      displayOrder: 1,
      name: "테스트 카드",
      category: "테스트",
      monitorMode: "CONTENT",
      enabled: true,
      endpoints: [
        {
          id: includePrevious ? "endpoint-2" : endpointId,
          platform: "DESKTOP",
          url: currentUrl,
          referenceUrl: null,
          lifecycle: includePrevious ? "PRELAUNCH" : "EXISTING",
          enabled: true,
          retiredAt: null,
        },
        ...(includePrevious ? [{
          id: endpointId,
          platform: "DESKTOP",
          url: "https://example.com/card",
          referenceUrl: null,
          lifecycle: "EXISTING",
          enabled: true,
          retiredAt: "2026-09-17T00:00:00.000Z",
        }] : []),
      ],
      rules: [{
        id: ruleId,
        type: "HTTP_STATUS",
        label: "HTTP 200",
        selector: null,
        attribute: null,
        expectedValue: null,
        expectedStatuses: "[200]",
        enabled: true,
        displayOrder: 0,
      }],
    }],
  };
}

function writeTargets(value = targets()) {
  writeFileSync(resolve(testDataDirectory, "targets.json"), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

beforeAll(async () => {
  if (existsSync(testDataDirectory)) rmSync(testDataDirectory, { recursive: true });
  mkdirSync(testDataDirectory, { recursive: true });
  writeTargets();
  runner = await import("@/lib/tracker/runner");
  store = await import("@/lib/json-store");
  queries = await import("@/lib/queries");
});

afterAll(() => {
  vi.unstubAllGlobals();
  if (existsSync(testDataDirectory)) rmSync(testDataDirectory, { recursive: true });
});

describe("JSON 검사 실행 이력", () => {
  it("기준선, 무변경, 변경을 순서대로 기록한다", async () => {
    const html = (recommendation?: string) => `<html><head><title>카드</title></head><body><p>기존 안내</p>${recommendation ? `<h2>${recommendation}</h2>` : ""}</body></html>`;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(html(), { status: 200, headers: { "content-type": "text/html" } }))));

    const first = await runner.executeRun("MANUAL", [targetId]);
    const firstCheck = store.getRunDocument(first.id)!.checks[0];
    expect(firstCheck.changeStatus).toBe("BASELINE");

    const second = await runner.executeRun("MANUAL", [targetId]);
    const unchanged = store.getRunDocument(second.id)!.checks[0];
    expect(unchanged.changeStatus).toBe("UNCHANGED");
    expect(unchanged.comparedCheckId).toBe(firstCheck.id);

    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(html("ALL 카드, 이런 분께 추천드려요"), { status: 200, headers: { "content-type": "text/html" } }))));
    const third = await runner.executeRun("MANUAL", [targetId]);
    const changed = store.getRunDocument(third.id)!.checks[0];
    expect(third.changedCount).toBe(1);
    expect(changed.changeStatus).toBe("CHANGED");
    expect(changed.comparedCheckId).toBe(unchanged.id);
    expect(changed.headAddedCount + changed.headRemovedCount).toBe(0);
    expect(changed.bodyAddedCount).toBe(1);
    expect(changed.bodyRemovedCount).toBe(0);
    expect(changed.diffJson).toContain("이런 분께 추천드려요");
    expect({
      liveStatus: changed.liveStatus,
      headLiveMarkerFound: changed.headLiveMarkerFound,
      bodyLiveMarkerFound: changed.bodyLiveMarkerFound,
    }).toEqual({ liveStatus: "CHECK_REQUIRED", headLiveMarkerFound: false, bodyLiveMarkerFound: true });

    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(
      `<html><head><title>카드</title><meta property="og:site_name" content="KB국민카드"></head><body><p>기존 안내</p><h2>ALL 카드, 이런 분께 추천 드려요</h2></body></html>`,
      { status: 200, headers: { "content-type": "text/html" } },
    ))));
    const fourth = await runner.executeRun("MANUAL", [targetId]);
    const completed = store.getRunDocument(fourth.id)!.checks[0];
    expect({
      liveStatus: completed.liveStatus,
      headLiveMarkerHtml: completed.headLiveMarkerHtml,
      bodyLiveMarkerHtml: completed.bodyLiveMarkerHtml,
    }).toEqual({
      liveStatus: "LIVE_COMPLETE",
      headLiveMarkerHtml: '<meta property="og:site_name" content="KB국민카드">',
      bodyLiveMarkerHtml: "<h2>ALL 카드, 이런 분께 추천 드려요</h2>",
    });
    expect(store.getStateDocument().endpoints[endpointId].liveCompletedAt).toBeTruthy();

    const transitions = queries.getCheckHistoryByEndpoint({ targetId, transitionsOnly: true, pageSize: 50 });
    expect(transitions.total).toBe(3);
    expect(transitions.groups[0].checks.map((row) => row.liveStatus)).toEqual([
      "LIVE_COMPLETE",
      "CHECK_REQUIRED",
      "BEFORE_LIVE",
    ]);
  });

  it("현재 URL과 이전 URL을 각각 진단하고 새 URL은 별도 기준선을 만든다", async () => {
    writeTargets(targets("https://example.com/card-v2", true));
    const requestedUrls: string[] = [];
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input: string | URL | Request) => {
      requestedUrls.push(String(input));
      return Promise.resolve(new Response("<html><body>tracked</body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }));
    }));

    const run = await runner.executeRun("MANUAL", [targetId]);
    expect(requestedUrls).toEqual(["https://example.com/card-v2", "https://example.com/card"]);
    const checks = store.getRunDocument(run.id)!.checks;
    expect(checks).toHaveLength(2);
    expect(checks.find((check) => check.endpointId === "endpoint-2")?.changeStatus).toBe("BASELINE");
    expect(checks.find((check) => check.endpointId === endpointId)?.retiredAt).toBeTruthy();
  });
});
