import { describe, expect, it } from "vitest";
import { detectLiveMarkers } from "@/lib/tracker/live-status";

describe("detectLiveMarkers", () => {
  it("OG 태그와 추천 h2가 모두 있으면 라이브 완료로 판정한다", () => {
    const result = detectLiveMarkers(`
      <html>
        <head><meta content="KB국민카드" property="og:site_name"></head>
        <body><h2>ALL 카드, 이런 분께 추천드려요</h2></body>
      </html>
    `);

    expect(result).toMatchObject({
      headLiveMarkerFound: true,
      bodyLiveMarkerFound: true,
      liveStatus: "LIVE_COMPLETE",
    });
    expect(result.headLiveMarkerHtml).toBe('<meta content="KB국민카드" property="og:site_name">');
    expect(result.bodyLiveMarkerHtml).toBe("<h2>ALL 카드, 이런 분께 추천드려요</h2>");
  });

  it("추천 문구의 띄어쓰기 차이를 무시하고 h2 내부 포함 여부를 확인한다", () => {
    expect(detectLiveMarkers("<html><body><h2>이런 분께 추천 드려요!</h2></body></html>")).toMatchObject({
      headLiveMarkerFound: false,
      bodyLiveMarkerFound: true,
      headLiveMarkerHtml: null,
      bodyLiveMarkerHtml: "<h2>이런 분께 추천 드려요!</h2>",
      liveStatus: "CHECK_REQUIRED",
    });
    expect(detectLiveMarkers("<html><body><p>이런 분께 추천 드려요</p></body></html>").liveStatus).toBe("BEFORE_LIVE");
  });
});
