import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let database: Database.Database;

function migration(name: string) {
  return readFileSync(resolve(process.cwd(), `prisma/migrations/${name}/migration.sql`), "utf8");
}

beforeAll(() => {
  database = new Database(":memory:");
  database.pragma("foreign_keys = ON");
  database.exec(migration("202609140001_init"));
  database.exec(migration("202609140002_check_comparisons"));
  database.exec(migration("202609140003_remove_seed_content_rules"));
  database.exec(`
    INSERT INTO Target (id, displayOrder, name, category, monitorMode, updatedAt)
    VALUES ('target', 1, '카드', '신용카드', 'CONTENT', CURRENT_TIMESTAMP);
    INSERT INTO Endpoint (id, targetId, platform, url, lifecycle, updatedAt)
    VALUES ('endpoint', 'target', 'DESKTOP', 'https://example.com', 'EXISTING', CURRENT_TIMESTAMP);
    INSERT INTO Run (id, source, status, totalCount, processedCount)
    VALUES ('run', 'MANUAL', 'COMPLETED', 1, 1);
    INSERT INTO Snapshot (id, endpointId, hash, tokensJson)
    VALUES (
      'snapshot',
      'endpoint',
      'hash',
      '[{"kind":"meta","key":"og:site_name","value":"KB국민카드"},{"kind":"heading","key":"h2","value":"ALL 카드, 이런 분께 추천 드려요"}]'
    );
    INSERT INTO EndpointCheck (
      id, runId, endpointId, requestedUrl, httpStatus, availabilityStatus, changeStatus, snapshotId, createdAt
    ) VALUES (
      'check', 'run', 'endpoint', 'https://example.com', 200, 'LIVE', 'BASELINE', 'snapshot', '2026-09-14T01:00:00.000Z'
    );
  `);
  database.exec(migration("202609140004_live_status"));
});

afterAll(() => database.close());

describe("라이브 상태 마이그레이션", () => {
  it("기존 스냅샷에서 두 라이브 신호와 최초 완료 시각을 복구한다", () => {
    expect(database.prepare(
      "SELECT liveStatus, headLiveMarkerFound, bodyLiveMarkerFound FROM EndpointCheck WHERE id = 'check'",
    ).get()).toEqual({
      liveStatus: "LIVE_COMPLETE",
      headLiveMarkerFound: 1,
      bodyLiveMarkerFound: 1,
    });
    expect(database.prepare("SELECT liveCompletedAt FROM Endpoint WHERE id = 'endpoint'").get()).toEqual({
      liveCompletedAt: "2026-09-14T01:00:00.000Z",
    });
  });
});
