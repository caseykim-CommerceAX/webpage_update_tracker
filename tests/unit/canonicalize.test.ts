import { describe, expect, it } from "vitest";
import { canonicalizeHtml, createStructuredDiff, summarizeStructuredDiff } from "@/lib/tracker/canonicalize";

describe("canonicalizeHtml", () => {
  it("동적 스크립트와 추적 파라미터를 무시한다", () => {
    const first = canonicalizeHtml(
      `<html><head><title>카드</title><script>window.token='one'</script></head><body><h2>혜택</h2><a href="/go?utm_source=a&id=1">보기</a></body></html>`,
      "https://example.com/card",
    );
    const second = canonicalizeHtml(
      `<html><head><title>카드</title><script>window.token='two'</script></head><body><h2>혜택</h2><a href="/go?id=1&utm_source=b">보기</a></body></html>`,
      "https://example.com/card",
    );
    expect(first.hash).toBe(second.hash);
  });

  it("사용자에게 의미 있는 문구 변경을 구조화한다", () => {
    const before = canonicalizeHtml("<html><body><h2>기존 혜택</h2></body></html>", "https://example.com");
    const after = canonicalizeHtml("<html><body><h2>새로운 혜택</h2></body></html>", "https://example.com");
    const diff = createStructuredDiff(before.tokens, after.tokens);
    expect(diff.removed).toContainEqual(expect.objectContaining({ value: "기존 혜택" }));
    expect(diff.added).toContainEqual(expect.objectContaining({ value: "새로운 혜택" }));
  });

  it("변경 태그를 HEAD와 BODY 섹션으로 집계한다", () => {
    const before = canonicalizeHtml(
      '<html><head><title>이전 제목</title><meta name="description" content="이전 설명"></head><body><h2>이전 혜택</h2></body></html>',
      "https://example.com",
    );
    const after = canonicalizeHtml(
      '<html><head><title>새 제목</title><meta name="description" content="새 설명"></head><body><h2>새 혜택</h2></body></html>',
      "https://example.com",
    );

    expect(summarizeStructuredDiff(createStructuredDiff(before.tokens, after.tokens))).toEqual({
      HEAD: { added: 2, removed: 2 },
      BODY: { added: 1, removed: 1 },
    });
  });

  it("추천 문구의 현재 존재 여부가 아니라 전일 대비 추가를 변경으로 감지한다", () => {
    const yesterday = canonicalizeHtml(
      "<html><body><p>기존 안내</p></body></html>",
      "https://example.com/card",
    );
    const today = canonicalizeHtml(
      "<html><body><p>기존 안내</p><h2>ALL 카드, 이런 분께 추천드려요</h2></body></html>",
      "https://example.com/card",
    );
    const diff = createStructuredDiff(yesterday.tokens, today.tokens);

    expect(diff.added).toContainEqual({
      kind: "heading",
      key: "h2",
      value: "ALL 카드, 이런 분께 추천드려요",
    });
    expect(diff.removed).toEqual([]);
    expect(summarizeStructuredDiff(diff)).toEqual({
      HEAD: { added: 0, removed: 0 },
      BODY: { added: 1, removed: 0 },
    });
  });
});
