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
import { emptyEndpointState, getRunDocument, getRunIndex, getStateDocument, getTargetsDocument } from "@/lib/json-store";
import type { JsonCheck } from "@/lib/json-types";
import type { StructuredDiff } from "@/lib/tracker/types";

export type RuleView = {
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

export type RuleResultView = {
  ruleLabel: string;
  ruleType: RuleType;
  status: RuleResultStatus;
  actualValue: string | null;
  message: string | null;
  configJson: string;
};

export type EndpointView = {
  id: string;
  platform: Platform;
  url: string;
  referenceUrl: string | null;
  lifecycle: Lifecycle;
  launchedAt: string | null;
  liveCompletedAt: string | null;
  enabled: boolean;
  retiredAt: string | null;
  latest: {
    checkId: string;
    runId: string;
    httpStatus: number | null;
    availabilityStatus: AvailabilityStatus;
    liveStatus: LiveStatus;
    headLiveMarkerFound: boolean | null;
    bodyLiveMarkerFound: boolean | null;
    changeStatus: ChangeStatus;
    responseMs: number | null;
    errorMessage: string | null;
    createdAt: string;
    comparedAt: string | null;
    headAddedCount: number;
    headRemovedCount: number;
    bodyAddedCount: number;
    bodyRemovedCount: number;
    failedRules: number;
    failureDetails: RuleResultView[];
  } | null;
  lastChangedAt: string | null;
};

export type TargetView = {
  id: string;
  displayOrder: number;
  name: string;
  category: string;
  monitorMode: MonitorMode;
  enabled: boolean;
  endpoints: EndpointView[];
  rules: RuleView[];
};

export function getTargets(): TargetView[] {
  const state = getStateDocument();
  return getTargetsDocument().targets.map((target) => ({
    id: target.id,
    displayOrder: target.displayOrder,
    name: target.name,
    category: target.category,
    monitorMode: target.monitorMode,
    enabled: target.enabled,
    rules: target.rules,
    endpoints: target.endpoints
      .filter((endpoint) => endpoint.enabled)
      .toSorted((a, b) => a.platform.localeCompare(b.platform) || Number(Boolean(a.retiredAt)) - Number(Boolean(b.retiredAt)))
      .map((endpoint) => {
        const endpointState = state.endpoints[endpoint.id] ?? emptyEndpointState();
        const latest = endpointState.latest;
        const failureDetails = latest?.ruleResults.filter((result) => result.status === "FAIL" || result.status === "ERROR") ?? [];
        return {
          ...endpoint,
          launchedAt: endpointState.launchedAt,
          liveCompletedAt: endpointState.liveCompletedAt,
          latest: latest
            ? {
                checkId: latest.id,
                runId: latest.runId,
                httpStatus: latest.httpStatus,
                availabilityStatus: latest.availabilityStatus,
                liveStatus: latest.liveStatus,
                headLiveMarkerFound: latest.headLiveMarkerFound,
                bodyLiveMarkerFound: latest.bodyLiveMarkerFound,
                changeStatus: latest.changeStatus,
                responseMs: latest.responseMs,
                errorMessage: latest.errorMessage,
                createdAt: latest.createdAt,
                comparedAt: latest.comparedAt,
                headAddedCount: latest.headAddedCount,
                headRemovedCount: latest.headRemovedCount,
                bodyAddedCount: latest.bodyAddedCount,
                bodyRemovedCount: latest.bodyRemovedCount,
                failedRules: failureDetails.length,
                failureDetails,
              }
            : null,
          lastChangedAt: endpointState.lastChangedAt,
        };
      }),
  }));
}

export function getRecentRuns(limit = 50) {
  return getRunIndex().runs.slice(0, limit);
}

export function getRun(runId: string) {
  const document = getRunDocument(runId);
  return document ? { run: document.run, checks: document.checks } : null;
}

export type CheckHistoryRow = {
  checkId: string;
  runId: string;
  runSource: RunRecord["source"];
  endpointId: string;
  endpointUrl: string;
  retiredAt: string | null;
  targetId: string;
  targetName: string;
  displayOrder: number;
  platform: Platform;
  requestedUrl: string;
  finalUrl: string | null;
  httpStatus: number | null;
  availabilityStatus: AvailabilityStatus;
  liveStatus: LiveStatus;
  previousLiveStatus: LiveStatus | null;
  headLiveMarkerFound: boolean | null;
  bodyLiveMarkerFound: boolean | null;
  headLiveMarkerHtml: string | null;
  bodyLiveMarkerHtml: string | null;
  changeStatus: ChangeStatus;
  headAddedCount: number;
  headRemovedCount: number;
  bodyAddedCount: number;
  bodyRemovedCount: number;
  failedRules: number;
  responseMs: number | null;
  errorMessage: string | null;
  createdAt: string;
};

export type CheckHistoryFilters = {
  query?: string;
  targetId?: string;
  platform?: Platform;
  liveStatus?: LiveStatus;
  transitionsOnly?: boolean;
  page?: number;
  pageSize?: number;
};

function getAllChecks() {
  const rows: Array<{ check: JsonCheck; run: RunRecord }> = [];
  for (const run of getRunIndex().runs) {
    const document = getRunDocument(run.id);
    if (!document) continue;
    for (const check of document.checks) rows.push({ check, run });
  }
  return rows;
}

function historyRows() {
  const rows = getAllChecks().toSorted((a, b) => a.check.createdAt.localeCompare(b.check.createdAt));
  const previousByEndpoint = new Map<string, LiveStatus>();
  return rows.map(({ check, run }): CheckHistoryRow => {
    const previousLiveStatus = previousByEndpoint.get(check.endpointId) ?? null;
    previousByEndpoint.set(check.endpointId, check.liveStatus);
    return {
      checkId: check.id,
      runId: check.runId,
      runSource: run.source,
      endpointId: check.endpointId,
      endpointUrl: check.url,
      retiredAt: check.retiredAt,
      targetId: check.targetId,
      targetName: check.targetName,
      displayOrder: check.displayOrder,
      platform: check.platform,
      requestedUrl: check.requestedUrl,
      finalUrl: check.finalUrl,
      httpStatus: check.httpStatus,
      availabilityStatus: check.availabilityStatus,
      liveStatus: check.liveStatus,
      previousLiveStatus,
      headLiveMarkerFound: check.headLiveMarkerFound,
      bodyLiveMarkerFound: check.bodyLiveMarkerFound,
      headLiveMarkerHtml: check.headLiveMarkerHtml,
      bodyLiveMarkerHtml: check.bodyLiveMarkerHtml,
      changeStatus: check.changeStatus,
      headAddedCount: check.headAddedCount,
      headRemovedCount: check.headRemovedCount,
      bodyAddedCount: check.bodyAddedCount,
      bodyRemovedCount: check.bodyRemovedCount,
      failedRules: check.ruleResults.filter((result) => result.status === "FAIL" || result.status === "ERROR").length,
      responseMs: check.responseMs,
      errorMessage: check.errorMessage,
      createdAt: check.createdAt,
    };
  });
}

function filteredHistory(filters: CheckHistoryFilters) {
  const query = filters.query?.trim().toLocaleLowerCase("ko-KR");
  return historyRows().filter((row) => {
    if (query && !`${row.targetName} ${row.requestedUrl}`.toLocaleLowerCase("ko-KR").includes(query)) return false;
    if (filters.targetId && row.targetId !== filters.targetId) return false;
    if (filters.platform && row.platform !== filters.platform) return false;
    if (filters.liveStatus && row.liveStatus !== filters.liveStatus) return false;
    if (filters.transitionsOnly && row.previousLiveStatus === row.liveStatus) return false;
    return true;
  });
}

export type CheckHistoryGroup = {
  endpointId: string;
  targetId: string;
  targetName: string;
  displayOrder: number;
  platform: Platform;
  url: string;
  retiredAt: string | null;
  resultCount: number;
  checks: CheckHistoryRow[];
};

export function getCheckHistoryByEndpoint(filters: CheckHistoryFilters = {}) {
  const pageSize = Math.min(500, Math.max(1, filters.pageSize ?? 50));
  const rows = filteredHistory(filters);
  const grouped = new Map<string, CheckHistoryGroup>();
  for (const row of rows) {
    const group = grouped.get(row.endpointId) ?? {
      endpointId: row.endpointId,
      targetId: row.targetId,
      targetName: row.targetName,
      displayOrder: row.displayOrder,
      platform: row.platform,
      url: row.endpointUrl,
      retiredAt: row.retiredAt,
      resultCount: 0,
      checks: [],
    };
    group.resultCount += 1;
    group.checks.push(row);
    grouped.set(row.endpointId, group);
  }
  const groups = [...grouped.values()]
    .map((group) => ({ ...group, checks: group.checks.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt)) }))
    .toSorted((a, b) => a.displayOrder - b.displayOrder || a.platform.localeCompare(b.platform) || a.url.localeCompare(b.url));
  const pageCount = Math.max(1, Math.ceil(groups.length / pageSize));
  const page = Math.min(Math.max(1, filters.page ?? 1), pageCount);
  return {
    groups: groups.slice((page - 1) * pageSize, page * pageSize),
    total: rows.length,
    endpointTotal: groups.length,
    page,
    pageSize,
    pageCount,
  };
}

export function getCheckHistoryTargets() {
  const seen = new Map<string, { id: string; displayOrder: number; name: string }>();
  for (const row of historyRows()) {
    seen.set(row.targetId, { id: row.targetId, displayOrder: row.displayOrder, name: row.targetName });
  }
  return [...seen.values()].toSorted((a, b) => a.displayOrder - b.displayOrder);
}

export function getCheckHistoryTotal() {
  return getRunIndex().runs.reduce((total, run) => total + run.processedCount, 0);
}

export type RunLiveSummary = {
  liveCompleteCount: number;
  checkRequiredCount: number;
  beforeLiveCount: number;
  unverifiedCount: number;
};

export function getRunLiveSummary(runId: string): RunLiveSummary {
  const checks = getRunDocument(runId)?.checks ?? [];
  return {
    liveCompleteCount: checks.filter((check) => check.liveStatus === "LIVE_COMPLETE").length,
    checkRequiredCount: checks.filter((check) => check.liveStatus === "CHECK_REQUIRED").length,
    beforeLiveCount: checks.filter((check) => check.liveStatus === "BEFORE_LIVE").length,
    unverifiedCount: checks.filter((check) => check.liveStatus === "UNVERIFIED").length,
  };
}

export type RunTagChangeView = {
  checkId: string;
  runId: string;
  targetName: string;
  category: string;
  displayOrder: number;
  platform: Platform;
  url: string;
  createdAt: string;
  comparedAt: string | null;
  headAddedCount: number;
  headRemovedCount: number;
  bodyAddedCount: number;
  bodyRemovedCount: number;
  diff: StructuredDiff;
};

export function getRunTagChanges(runId: string): RunTagChangeView[] {
  return (getRunDocument(runId)?.checks ?? [])
    .filter((check) => check.changeStatus === "CHANGED")
    .map((check) => ({
      checkId: check.id,
      runId: check.runId,
      targetName: check.targetName,
      category: check.category,
      displayOrder: check.displayOrder,
      platform: check.platform,
      url: check.url,
      createdAt: check.createdAt,
      comparedAt: check.comparedAt,
      headAddedCount: check.headAddedCount,
      headRemovedCount: check.headRemovedCount,
      bodyAddedCount: check.bodyAddedCount,
      bodyRemovedCount: check.bodyRemovedCount,
      diff: parseStructuredDiff(check.diffJson),
    }));
}

function parseStructuredDiff(value: string | null): StructuredDiff {
  if (!value) return { added: [], removed: [] };
  try {
    return JSON.parse(value) as StructuredDiff;
  } catch {
    return { added: [], removed: [] };
  }
}
