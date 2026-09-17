import type {
  AvailabilityStatus,
  ChangeStatus,
  Lifecycle,
  LiveStatus,
  MonitorMode,
  Platform,
  RuleResultStatus,
  RuleType,
  RunRecord,
} from "@/lib/domain-types";
import type { CanonicalToken } from "@/lib/tracker/types";

export type JsonRule = {
  id: string;
  type: RuleType;
  label: string;
  selector: string | null;
  attribute: string | null;
  expectedValue: string | null;
  expectedStatuses: string | null;
  enabled: boolean;
  displayOrder: number;
};

export type JsonEndpoint = {
  id: string;
  platform: Platform;
  url: string;
  referenceUrl: string | null;
  lifecycle: Lifecycle;
  enabled: boolean;
  retiredAt: string | null;
};

export type JsonTarget = {
  id: string;
  displayOrder: number;
  name: string;
  category: string;
  monitorMode: MonitorMode;
  enabled: boolean;
  endpoints: JsonEndpoint[];
  rules: JsonRule[];
};

export type TargetsDocument = {
  schemaVersion: 1;
  targets: JsonTarget[];
};

export type JsonRuleResult = {
  ruleLabel: string;
  ruleType: RuleType;
  status: RuleResultStatus;
  actualValue: string | null;
  message: string | null;
  configJson: string;
};

export type JsonCheck = {
  id: string;
  runId: string;
  endpointId: string;
  targetId: string;
  targetName: string;
  category: string;
  displayOrder: number;
  platform: Platform;
  url: string;
  retiredAt: string | null;
  requestedUrl: string;
  finalUrl: string | null;
  httpStatus: number | null;
  availabilityStatus: AvailabilityStatus;
  liveStatus: LiveStatus;
  headLiveMarkerFound: boolean | null;
  bodyLiveMarkerFound: boolean | null;
  headLiveMarkerHtml: string | null;
  bodyLiveMarkerHtml: string | null;
  changeStatus: ChangeStatus;
  responseMs: number | null;
  errorMessage: string | null;
  comparedCheckId: string | null;
  comparedAt: string | null;
  headAddedCount: number;
  headRemovedCount: number;
  bodyAddedCount: number;
  bodyRemovedCount: number;
  diffJson: string | null;
  createdAt: string;
  ruleResults: JsonRuleResult[];
};

export type RunDocument = {
  schemaVersion: 1;
  run: RunRecord;
  checks: JsonCheck[];
};

export type RunIndexDocument = {
  schemaVersion: 1;
  updatedAt: string;
  runs: RunRecord[];
};

export type SuccessfulSnapshot = {
  checkId: string;
  createdAt: string;
  hash: string;
  tokens: CanonicalToken[];
};

export type EndpointState = {
  launchedAt: string | null;
  liveCompletedAt: string | null;
  lastChangedAt: string | null;
  latest: JsonCheck | null;
  lastSuccessful: SuccessfulSnapshot | null;
};

export type StateDocument = {
  schemaVersion: 1;
  updatedAt: string;
  endpoints: Record<string, EndpointState>;
};
