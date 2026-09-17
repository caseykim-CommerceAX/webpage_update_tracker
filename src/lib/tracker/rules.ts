import { load } from "cheerio";
import type { RuleRecord } from "@/lib/domain-types";
import { normalizeText } from "@/lib/tracker/canonicalize";

export type EvaluatedRule = {
  ruleId: string;
  ruleType: RuleRecord["type"];
  ruleLabel: string;
  configJson: string;
  status: "PASS" | "FAIL" | "SKIPPED" | "ERROR";
  actualValue: string | null;
  message: string | null;
};

function configFor(rule: RuleRecord) {
  return JSON.stringify({
    type: rule.type,
    selector: rule.selector,
    attribute: rule.attribute,
    expectedValue: rule.expectedValue,
    expectedStatuses: rule.expectedStatuses,
  });
}

export function skippedRule(rule: RuleRecord, message: string): EvaluatedRule {
  return {
    ruleId: rule.id,
    ruleType: rule.type,
    ruleLabel: rule.label,
    configJson: configFor(rule),
    status: "SKIPPED",
    actualValue: null,
    message,
  };
}

export function evaluateRule(rule: RuleRecord, status: number, html: string | null): EvaluatedRule {
  const base = {
    ruleId: rule.id,
    ruleType: rule.type,
    ruleLabel: rule.label,
    configJson: configFor(rule),
  };

  try {
    if (rule.type === "HTTP_STATUS") {
      const expected = JSON.parse(rule.expectedStatuses ?? "[200]") as number[];
      const passed = expected.includes(status);
      return {
        ...base,
        status: passed ? "PASS" : "FAIL",
        actualValue: String(status),
        message: passed ? null : `기대 상태: ${expected.join(", ")}`,
      };
    }

    if (!html) return skippedRule(rule, "HTML 응답이 없어 검사하지 못했습니다.");
    const $ = load(html);
    const selector = rule.selector?.trim();
    if (!selector) throw new Error("CSS 선택자가 비어 있습니다.");
    const matched = $(selector);

    if (rule.type === "META_ATTRIBUTE") {
      const attribute = rule.attribute?.trim() || "content";
      const actual = matched.first().attr(attribute) ?? null;
      const expected = rule.expectedValue;
      const passed = actual !== null && (expected === null || normalizeText(actual) === normalizeText(expected));
      return {
        ...base,
        status: passed ? "PASS" : "FAIL",
        actualValue: actual,
        message: passed ? null : expected ? `기대값: ${expected}` : "해당 meta 속성을 찾지 못했습니다.",
      };
    }

    const actual = normalizeText(matched.text());
    const expected = normalizeText(rule.expectedValue ?? "");
    const squash = (value: string) => value.replace(/\s/g, "");
    const passed = Boolean(expected) && squash(actual).includes(squash(expected));
    return {
      ...base,
      status: passed ? "PASS" : "FAIL",
      actualValue: actual.slice(0, 500) || null,
      message: passed ? null : `포함해야 할 문구: ${expected}`,
    };
  } catch (error) {
    return {
      ...base,
      status: "ERROR",
      actualValue: null,
      message: error instanceof Error ? error.message : "규칙 검사 오류",
    };
  }
}
