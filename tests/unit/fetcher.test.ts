import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPage, isSameDestination } from "@/lib/tracker/fetcher";

afterEach(() => vi.unstubAllGlobals());

describe("fetchPage", () => {
  it("일시적 5xx 응답을 재시도한다", async () => {
    const mockedFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("error", { status: 503, headers: { "content-type": "text/html" } }))
      .mockResolvedValueOnce(new Response("<html><body>ok</body></html>", { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }));
    vi.stubGlobal("fetch", mockedFetch);
    const result = await fetchPage("https://example.com/page", "DESKTOP", { retries: 1, timeoutMs: 1000 });
    expect(mockedFetch).toHaveBeenCalledTimes(2);
    expect(result.status).toBe(200);
    expect(result.html).toContain("ok");
  });
});

describe("isSameDestination", () => {
  it("쿼리와 끝 슬래시는 허용하고 다른 경로는 거부한다", () => {
    expect(isSameDestination("https://example.com/page", "https://example.com/page/?a=1")).toBe(true);
    expect(isSameDestination("https://example.com/new", "https://example.com/old")).toBe(false);
  });
});
