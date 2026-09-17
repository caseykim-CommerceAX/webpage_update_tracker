import { describe, expect, it } from "vitest";
import { getCheckHistoryAccent } from "@/lib/check-history-accent";

describe("getCheckHistoryAccent", () => {
  it("첫 판정부터 라이브 완료이면 초록색 완료 이정표로 표시한다", () => {
    expect(getCheckHistoryAccent({
      availabilityStatus: "LIVE",
      liveStatus: "LIVE_COMPLETE",
      previousLiveStatus: null,
    })).toBe("live-complete");
  });

  it("이전 상태에서 라이브 완료로 전환되면 초록색으로 표시한다", () => {
    expect(getCheckHistoryAccent({
      availabilityStatus: "LIVE",
      liveStatus: "LIVE_COMPLETE",
      previousLiveStatus: "BEFORE_LIVE",
    })).toBe("live-complete");
  });

  it("라이브 완료 상태가 유지되면 강조하지 않는다", () => {
    expect(getCheckHistoryAccent({
      availabilityStatus: "LIVE",
      liveStatus: "LIVE_COMPLETE",
      previousLiveStatus: "LIVE_COMPLETE",
    })).toBeNull();
  });

  it("라이브 완료가 아닌 첫 판정은 강조하지 않는다", () => {
    expect(getCheckHistoryAccent({
      availabilityStatus: "PENDING",
      liveStatus: "BEFORE_LIVE",
      previousLiveStatus: null,
    })).toBeNull();
  });

  it("라이브 완료 이외의 상태 전환은 주황색으로 표시한다", () => {
    expect(getCheckHistoryAccent({
      availabilityStatus: "LIVE",
      liveStatus: "CHECK_REQUIRED",
      previousLiveStatus: "LIVE_COMPLETE",
    })).toBe("status-change");
  });

  it("오류 표시는 다른 강조보다 우선한다", () => {
    expect(getCheckHistoryAccent({
      availabilityStatus: "ERROR",
      liveStatus: "LIVE_COMPLETE",
      previousLiveStatus: "BEFORE_LIVE",
    })).toBe("error");
    expect(getCheckHistoryAccent({
      availabilityStatus: "LIVE",
      liveStatus: "UNVERIFIED",
      previousLiveStatus: "LIVE_COMPLETE",
    })).toBe("error");
  });
});
