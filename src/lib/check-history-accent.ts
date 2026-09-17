import type { AvailabilityStatus, LiveStatus } from "@/lib/db-types";

export type CheckHistoryAccent = "error" | "live-complete" | "status-change" | null;

type CheckHistoryAccentInput = {
  availabilityStatus: AvailabilityStatus;
  liveStatus: LiveStatus;
  previousLiveStatus: LiveStatus | null;
};

export function getCheckHistoryAccent({
  availabilityStatus,
  liveStatus,
  previousLiveStatus,
}: CheckHistoryAccentInput): CheckHistoryAccent {
  if (
    liveStatus === "UNVERIFIED"
    || availabilityStatus === "ERROR"
    || availabilityStatus === "UNAVAILABLE"
  ) {
    return "error";
  }

  if (liveStatus === "LIVE_COMPLETE" && previousLiveStatus !== "LIVE_COMPLETE") {
    return "live-complete";
  }

  if (previousLiveStatus !== null && previousLiveStatus !== liveStatus) {
    return "status-change";
  }

  return null;
}
