import { describe, expect, it } from "vitest";
import type { RuleRecord } from "@/lib/db-types";
import { evaluateRule } from "@/lib/tracker/rules";

function rule(patch: Partial<RuleRecord>): RuleRecord {
  return {
    id: "rule-1",
    targetId: "target-1",
    type: "HTTP_STATUS",
    label: "테스트",
    selector: null,
    attribute: null,
    expectedValue: null,
    expectedStatuses: "[200]",
    enabled: 1,
    displayOrder: 0,
    ...patch,
  };
}

describe("evaluateRule", () => {
  it("HTTP 상태를 판정한다", () => {
    expect(evaluateRule(rule({}), 200, null).status).toBe("PASS");
    expect(evaluateRule(rule({}), 404, null).status).toBe("FAIL");
  });

  it("meta 속성 순서와 관계없이 기대값을 찾는다", () => {
    const result = evaluateRule(
      rule({ type: "META_ATTRIBUTE", selector: 'meta[property="og:site_name"]', attribute: "content", expectedValue: "KB국민카드" }),
      200,
      '<html><head><meta content="KB국민카드" property="og:site_name"></head></html>',
    );
    expect(result.status).toBe("PASS");
  });

  it("추천 문구의 공백 차이를 무시한다", () => {
    const textRule = rule({ type: "TEXT_CONTAINS", selector: "h2", expectedValue: "이런 분께 추천드려요" });
    expect(evaluateRule(textRule, 200, "<h2>ALL 카드, 이런 분께 추천 드려요</h2>").status).toBe("PASS");
    expect(evaluateRule(textRule, 200, "<h2>다른 문구</h2>").status).toBe("FAIL");
  });
});
