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

  database.exec(`
    INSERT INTO Target (id, displayOrder, name, category, monitorMode, updatedAt)
    VALUES ('target', 1, '카드', '신용카드', 'CONTENT', CURRENT_TIMESTAMP);
    INSERT INTO Endpoint (id, targetId, platform, url, lifecycle, updatedAt)
    VALUES ('endpoint', 'target', 'DESKTOP', 'https://example.com', 'EXISTING', CURRENT_TIMESTAMP);
    INSERT INTO Run (id, source, status, totalCount, processedCount, failureCount)
    VALUES ('run', 'MANUAL', 'COMPLETED_WITH_ERRORS', 1, 1, 1);
    INSERT INTO EndpointCheck (
      id, runId, endpointId, requestedUrl, httpStatus, availabilityStatus, changeStatus, responseMs
    ) VALUES ('check', 'run', 'endpoint', 'https://example.com', 200, 'LIVE', 'BASELINE', 10);
    INSERT INTO Rule (
      id, targetId, type, label, selector, attribute, expectedValue, enabled, displayOrder, updatedAt
    ) VALUES
      ('http', 'target', 'HTTP_STATUS', 'HTTP 200', NULL, NULL, NULL, 1, 0, CURRENT_TIMESTAMP),
      ('meta', 'target', 'META_ATTRIBUTE', 'KB국민카드 OG 태그', 'meta[property="og:site_name"]', 'content', 'KB국민카드', 1, 1, CURRENT_TIMESTAMP),
      ('text', 'target', 'TEXT_CONTAINS', '추천 문구', 'h2', NULL, '이런 분께 추천드려요', 1, 2, CURRENT_TIMESTAMP);
    INSERT INTO RuleResult (
      id, checkId, ruleId, ruleType, ruleLabel, configJson, status
    ) VALUES
      ('http-result', 'check', 'http', 'HTTP_STATUS', 'HTTP 200', '{}', 'PASS'),
      ('meta-result', 'check', 'meta', 'META_ATTRIBUTE', 'KB국민카드 OG 태그', '{}', 'FAIL'),
      ('text-result', 'check', 'text', 'TEXT_CONTAINS', '추천 문구', '{}', 'FAIL');
  `);

  database.exec(migration("202609140003_remove_seed_content_rules"));
});

afterAll(() => database.close());

describe("잘못 생성한 정적 콘텐츠 규칙 마이그레이션", () => {
  it("HTTP 규칙과 결과는 보존하고 OG·추천 문구 정적 판정만 제거한다", () => {
    expect(database.prepare("SELECT type FROM Rule ORDER BY displayOrder").all()).toEqual([{ type: "HTTP_STATUS" }]);
    expect(database.prepare("SELECT ruleType FROM RuleResult").all()).toEqual([{ ruleType: "HTTP_STATUS" }]);
    expect(database.prepare("SELECT status, failureCount FROM Run WHERE id = 'run'").get()).toEqual({
      status: "COMPLETED",
      failureCount: 0,
    });
  });
});
