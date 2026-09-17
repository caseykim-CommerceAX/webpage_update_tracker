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
  for (const name of [
    "202609140001_init",
    "202609140002_check_comparisons",
    "202609140003_remove_seed_content_rules",
    "202609140004_live_status",
    "202609140005_live_marker_evidence",
  ]) {
    database.exec(migration(name));
  }

  database.exec(`
    INSERT INTO Target (id, displayOrder, name, category, monitorMode, updatedAt)
    VALUES
      ('bev', 1, 'BeV Ⅲ 카드', '프리미엄카드', 'CONTENT', CURRENT_TIMESTAMP),
      ('event', 2, '이벤트', '이벤트', 'STATUS_ONLY', CURRENT_TIMESTAMP);

    INSERT INTO Endpoint (id, targetId, platform, url, referenceUrl, lifecycle, enabled, updatedAt)
    VALUES
      ('bev-current', 'bev', 'DESKTOP',
       'https://card.kbcard.com/cards/products/premium-cards/kb-bev3-card',
       'https://card.kbcard.com/cards/products/premium-cards/bev3-card',
       'PRELAUNCH', 1, CURRENT_TIMESTAMP),
      ('event-pc-september', 'event', 'DESKTOP',
       'https://card.kbcard.com/benefits/events/ongoing/kb-new-card-annual-fee-cashback-2026-09',
       NULL, 'PRELAUNCH', 1, CURRENT_TIMESTAMP),
      ('event-mobile-september', 'event', 'MOBILE',
       'https://m.kbcard.com/benefits/events/kb-new-card-annual-fee-cashback-2026-09',
       NULL, 'PRELAUNCH', 1, CURRENT_TIMESTAMP);

    INSERT INTO Rule (
      id, targetId, type, label, expectedStatuses, enabled, displayOrder, updatedAt
    ) VALUES (
      'event-http', 'event', 'HTTP_STATUS', 'HTTP 200', '[200]', 1, 0, CURRENT_TIMESTAMP
    );
  `);

  database.exec(migration("202609170001_track_previous_endpoints"));
  database.exec(migration("202609170002_split_monthly_events"));
});

afterAll(() => database.close());

describe("이전 URL 추적 마이그레이션", () => {
  it("참고 URL을 독립된 이전 Endpoint로 만든다", () => {
    expect(database.prepare(`
      SELECT url, lifecycle, enabled, retiredAt IS NOT NULL AS previous
      FROM Endpoint
      WHERE targetId = 'bev'
      ORDER BY retiredAt IS NOT NULL
    `).all()).toEqual([
      {
        url: "https://card.kbcard.com/cards/products/premium-cards/kb-bev3-card",
        lifecycle: "PRELAUNCH",
        enabled: 1,
        previous: 0,
      },
      {
        url: "https://card.kbcard.com/cards/products/premium-cards/bev3-card",
        lifecycle: "EXISTING",
        enabled: 1,
        previous: 1,
      },
    ]);
  });

  it("9월과 10월 이벤트를 각각 독립된 현재 대상으로 구성한다", () => {
    const rows = database.prepare(`
      SELECT target.name, endpoint.platform, endpoint.url, endpoint.referenceUrl,
             endpoint.lifecycle, endpoint.enabled,
             endpoint.retiredAt IS NOT NULL AS previous
      FROM Endpoint AS endpoint
      JOIN Target AS target ON target.id = endpoint.targetId
      WHERE target.name IN ('이벤트 9월', '이벤트 10월')
      ORDER BY target.displayOrder, endpoint.platform
    `).all();

    expect(rows).toHaveLength(4);
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: "이벤트 10월",
        platform: "DESKTOP",
        url: "https://card.kbcard.com/benefits/events/ongoing/kb-new-card-annual-fee-cashback-2026-10",
        lifecycle: "PRELAUNCH",
        previous: 0,
      }),
      expect.objectContaining({
        name: "이벤트 10월",
        platform: "MOBILE",
        url: "https://m.kbcard.com/benefits/events/kb-new-card-annual-fee-cashback-2026-10",
        lifecycle: "PRELAUNCH",
        previous: 0,
      }),
      expect.objectContaining({
        name: "이벤트 9월",
        platform: "DESKTOP",
        url: "https://card.kbcard.com/benefits/events/ongoing/kb-new-card-annual-fee-cashback-2026-09",
        lifecycle: "PRELAUNCH",
        enabled: 1,
        previous: 0,
      }),
      expect.objectContaining({
        name: "이벤트 9월",
        platform: "MOBILE",
        url: "https://m.kbcard.com/benefits/events/kb-new-card-annual-fee-cashback-2026-09",
        lifecycle: "PRELAUNCH",
        enabled: 1,
        previous: 0,
      }),
    ]));
    expect(database.prepare(`
      SELECT COUNT(*) AS count
      FROM Rule AS rule
      JOIN Target AS target ON target.id = rule.targetId
      WHERE target.name = '이벤트 10월' AND rule.type = 'HTTP_STATUS'
    `).get()).toEqual({ count: 1 });
  });
});
