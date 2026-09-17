export type Platform = "DESKTOP" | "MOBILE";
export type Lifecycle = "EXISTING" | "PRELAUNCH";
export type MonitorMode = "CONTENT" | "STATUS_ONLY";
export type RuleType = "HTTP_STATUS" | "META_ATTRIBUTE" | "TEXT_CONTAINS";
export type RunSource = "MANUAL" | "SCHEDULE";
export type RunStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "COMPLETED_WITH_ERRORS" | "FAILED";
export type AvailabilityStatus = "PENDING" | "LIVE" | "UNAVAILABLE" | "ERROR";
export type LiveStatus = "BEFORE_LIVE" | "CHECK_REQUIRED" | "LIVE_COMPLETE" | "UNVERIFIED";
export type ChangeStatus = "BASELINE" | "UNCHANGED" | "CHANGED" | "NOT_APPLICABLE";
export type RuleResultStatus = "PASS" | "FAIL" | "SKIPPED" | "ERROR";

export type RuleRecord = {
  id: string;
  targetId: string;
  type: RuleType;
  label: string;
  selector: string | null;
  attribute: string | null;
  expectedValue: string | null;
  expectedStatuses: string | null;
  enabled: boolean;
  displayOrder: number;
};

export type RunRecord = {
  id: string;
  source: RunSource;
  status: RunStatus;
  targetIdsJson: string | null;
  totalCount: number;
  processedCount: number;
  changedCount: number;
  failureCount: number;
  pendingCount: number;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};
