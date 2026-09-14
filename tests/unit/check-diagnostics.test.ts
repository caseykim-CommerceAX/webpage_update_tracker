import { describe, expect, it } from "vitest";
import { getCheckDiagnostics, hasCheckIssue } from "@/components/check-diagnostics";

describe("검사 실패 진단", () => {
  it("접속 실패와 규칙 실패 원인을 함께 만든다", () => {
    const check = {
      availabilityStatus: "UNAVAILABLE" as const,
      httpStatus: 503,
      errorMessage: null,
      failureDetails: [{
        ruleLabel: "HTTP 200",
        ruleType: "HTTP_STATUS" as const,
        status: "FAIL" as const,
        actualValue: "503",
        message: "기대 상태: 200",
        configJson: "{}",
      }],
    };

    expect(hasCheckIssue(check)).toBe(true);
    expect(getCheckDiagnostics(check)).toEqual([
      { title: "페이지 접속 실패", reason: "HTTP 503 응답입니다. 페이지 상태를 확인하세요." },
      { title: "HTTP 200", reason: "기대 상태: 200", actualValue: "503" },
    ]);
  });

  it("오픈 대기는 실패로 분류하지 않는다", () => {
    const check = {
      availabilityStatus: "PENDING" as const,
      httpStatus: 404,
      errorMessage: null,
      failureDetails: [],
    };

    expect(hasCheckIssue(check)).toBe(false);
    expect(getCheckDiagnostics(check)).toEqual([]);
  });
});
