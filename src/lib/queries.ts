import { db } from "@/lib/db";
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
} from "@/lib/db-types";
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

export type EndpointView = {
  id: string;
  platform: Platform;
  url: string;
  referenceUrl: string | null;
  lifecycle: Lifecycle;
  launchedAt: string | null;
  liveCompletedAt: string | null;
  enabled: boolean;
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

export type RuleResultView = {
  ruleLabel: string;
  ruleType: RuleType;
  status: RuleResultStatus;
  actualValue: string | null;
  message: string | null;
  configJson: string;
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

type TargetRow = Omit<TargetView, "endpoints" | "rules" | "enabled"> & { enabled: number };
type EndpointRow = Omit<EndpointView, "latest" | "lastChangedAt" | "enabled"> & { targetId: string; enabled: number };
type LatestCheckRow = {
  endpointId: string;
  checkId: string;
  runId: string;
  httpStatus: number | null;
  availabilityStatus: AvailabilityStatus;
  liveStatus: LiveStatus;
  headLiveMarkerFound: number | null;
  bodyLiveMarkerFound: number | null;
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
};

type LatestFailureRow = RuleResultView & { checkId: string };

export function getTargets(): TargetView[] {
  const targetRows = db.prepare("SELECT id, displayOrder, name, category, monitorMode, enabled FROM Target ORDER BY displayOrder").all() as TargetRow[];
  const endpointRows = db.prepare(
    "SELECT id, targetId, platform, url, referenceUrl, lifecycle, launchedAt, liveCompletedAt, enabled FROM Endpoint WHERE retiredAt IS NULL ORDER BY platform",
  ).all() as EndpointRow[];
  const ruleRows = db.prepare(
    "SELECT id, targetId, type, label, selector, attribute, expectedValue, expectedStatuses, enabled, displayOrder FROM Rule ORDER BY targetId, displayOrder",
  ).all() as Array<Omit<RuleView, "enabled"> & { targetId: string; enabled: number }>;
  const latestRows = db.prepare(
    `SELECT c.endpointId, c.id AS checkId, c.runId, c.httpStatus, c.availabilityStatus, c.liveStatus,
            c.headLiveMarkerFound, c.bodyLiveMarkerFound, c.changeStatus,
            c.responseMs, c.errorMessage, c.createdAt, previous.createdAt AS comparedAt,
            c.headAddedCount, c.headRemovedCount, c.bodyAddedCount, c.bodyRemovedCount,
            SUM(CASE WHEN rr.status IN ('FAIL','ERROR') THEN 1 ELSE 0 END) AS failedRules
     FROM EndpointCheck c
     JOIN (SELECT endpointId, MAX(createdAt) AS maxCreatedAt FROM EndpointCheck GROUP BY endpointId) latest
       ON latest.endpointId = c.endpointId AND latest.maxCreatedAt = c.createdAt
     LEFT JOIN EndpointCheck previous ON previous.id = c.comparedCheckId
     LEFT JOIN RuleResult rr ON rr.checkId = c.id
     GROUP BY c.id`,
  ).all() as LatestCheckRow[];
  const changedRows = db.prepare(
    "SELECT endpointId, MAX(createdAt) AS lastChangedAt FROM EndpointCheck WHERE changeStatus = 'CHANGED' GROUP BY endpointId",
  ).all() as Array<{ endpointId: string; lastChangedAt: string }>;

  const latestCheckIds = latestRows.map((row) => row.checkId);
  const latestFailures = latestCheckIds.length
    ? db.prepare(
        `SELECT checkId, ruleLabel, ruleType, status, actualValue, message, configJson
         FROM RuleResult
         WHERE status IN ('FAIL','ERROR') AND checkId IN (${latestCheckIds.map(() => "?").join(",")})
         ORDER BY createdAt`,
      ).all(...latestCheckIds) as LatestFailureRow[]
    : [];
  const failuresByCheck = new Map<string, RuleResultView[]>();
  for (const failure of latestFailures) {
    const bucket = failuresByCheck.get(failure.checkId) ?? [];
    bucket.push(failure);
    failuresByCheck.set(failure.checkId, bucket);
  }

  const latestMap = new Map(latestRows.map((row) => [row.endpointId, row]));
  const changedMap = new Map(changedRows.map((row) => [row.endpointId, row.lastChangedAt]));
  const endpointsByTarget = new Map<string, EndpointView[]>();
  for (const row of endpointRows) {
    const latest = latestMap.get(row.id);
    const endpoint: EndpointView = {
      id: row.id,
      platform: row.platform,
      url: row.url,
      referenceUrl: row.referenceUrl,
      lifecycle: row.lifecycle,
      launchedAt: row.launchedAt,
      liveCompletedAt: row.liveCompletedAt,
      enabled: Boolean(row.enabled),
      latest: latest
        ? {
            checkId: latest.checkId,
            runId: latest.runId,
            httpStatus: latest.httpStatus,
            availabilityStatus: latest.availabilityStatus,
            liveStatus: latest.liveStatus,
            headLiveMarkerFound: latest.headLiveMarkerFound === null ? null : Boolean(latest.headLiveMarkerFound),
            bodyLiveMarkerFound: latest.bodyLiveMarkerFound === null ? null : Boolean(latest.bodyLiveMarkerFound),
            changeStatus: latest.changeStatus,
            responseMs: latest.responseMs,
            errorMessage: latest.errorMessage,
            createdAt: latest.createdAt,
            comparedAt: latest.comparedAt,
            headAddedCount: latest.headAddedCount,
            headRemovedCount: latest.headRemovedCount,
            bodyAddedCount: latest.bodyAddedCount,
            bodyRemovedCount: latest.bodyRemovedCount,
            failedRules: latest.failedRules,
            failureDetails: failuresByCheck.get(latest.checkId) ?? [],
          }
        : null,
      lastChangedAt: changedMap.get(row.id) ?? null,
    };
    const bucket = endpointsByTarget.get(row.targetId) ?? [];
    bucket.push(endpoint);
    endpointsByTarget.set(row.targetId, bucket);
  }

  const rulesByTarget = new Map<string, RuleView[]>();
  for (const row of ruleRows) {
    const bucket = rulesByTarget.get(row.targetId) ?? [];
    bucket.push({ ...row, enabled: Boolean(row.enabled) });
    rulesByTarget.set(row.targetId, bucket);
  }

  return targetRows.map((row) => ({
    ...row,
    enabled: Boolean(row.enabled),
    endpoints: endpointsByTarget.get(row.id) ?? [],
    rules: rulesByTarget.get(row.id) ?? [],
  }));
}

export function getRecentRuns(limit = 50) {
  return db.prepare("SELECT * FROM Run ORDER BY createdAt DESC LIMIT ?").all(limit) as RunRecord[];
}

export function getRun(runId: string) {
  const run = db.prepare("SELECT * FROM Run WHERE id = ?").get(runId) as RunRecord | undefined;
  if (!run) return null;
  const checks = db.prepare(
    `SELECT c.*, e.platform, e.url, t.name AS targetName, t.displayOrder, s.diffJson,
            previous.createdAt AS comparedAt
     FROM EndpointCheck c
     JOIN Endpoint e ON e.id = c.endpointId
     JOIN Target t ON t.id = e.targetId
     LEFT JOIN Snapshot s ON s.id = c.snapshotId
     LEFT JOIN EndpointCheck previous ON previous.id = c.comparedCheckId
     WHERE c.runId = ? ORDER BY t.displayOrder, e.platform`,
  ).all(runId) as Array<{
    id: string;
    endpointId: string;
    platform: Platform;
    url: string;
    targetName: string;
    displayOrder: number;
    requestedUrl: string;
    finalUrl: string | null;
    httpStatus: number | null;
    availabilityStatus: AvailabilityStatus;
    liveStatus: LiveStatus;
    headLiveMarkerFound: number | null;
    bodyLiveMarkerFound: number | null;
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
  }>;
  const checkIds = checks.map((check) => check.id);
  const results = checkIds.length
    ? (db.prepare(
        `SELECT checkId, ruleLabel, ruleType, status, actualValue, message, configJson
         FROM RuleResult WHERE checkId IN (${checkIds.map(() => "?").join(",")}) ORDER BY createdAt`,
      ).all(...checkIds) as Array<{
        checkId: string;
        ruleLabel: string;
        ruleType: RuleType;
        status: RuleResultStatus;
        actualValue: string | null;
        message: string | null;
        configJson: string;
      }>)
    : [];
  const byCheck = new Map<string, typeof results>();
  for (const result of results) {
    const bucket = byCheck.get(result.checkId) ?? [];
    bucket.push(result);
    byCheck.set(result.checkId, bucket);
  }
  return {
    run,
    checks: checks.map((check) => ({
      ...check,
      headLiveMarkerFound: check.headLiveMarkerFound === null ? null : Boolean(check.headLiveMarkerFound),
      bodyLiveMarkerFound: check.bodyLiveMarkerFound === null ? null : Boolean(check.bodyLiveMarkerFound),
      ruleResults: byCheck.get(check.id) ?? [],
    })),
  };
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

const CHECK_HISTORY_CTE = `WITH history AS (
  SELECT c.id AS checkId, c.runId, r.source AS runSource,
         c.endpointId, e.url AS endpointUrl, e.retiredAt,
         e.targetId, t.name AS targetName, t.displayOrder, e.platform,
         c.requestedUrl, c.finalUrl, c.httpStatus, c.availabilityStatus, c.liveStatus,
         LAG(c.liveStatus) OVER (
           PARTITION BY c.endpointId ORDER BY c.createdAt ASC, c.rowid ASC
         ) AS previousLiveStatus,
         c.headLiveMarkerFound, c.bodyLiveMarkerFound,
         c.headLiveMarkerHtml, c.bodyLiveMarkerHtml,
         c.changeStatus, c.headAddedCount, c.headRemovedCount,
         c.bodyAddedCount, c.bodyRemovedCount, c.responseMs, c.errorMessage, c.createdAt,
         (SELECT COUNT(*) FROM RuleResult result
          WHERE result.checkId = c.id AND result.status IN ('FAIL', 'ERROR')) AS failedRules
  FROM EndpointCheck c
  JOIN Endpoint e ON e.id = c.endpointId
  JOIN Target t ON t.id = e.targetId
  JOIN Run r ON r.id = c.runId
)`;

type RawCheckHistoryRow = Omit<CheckHistoryRow, "headLiveMarkerFound" | "bodyLiveMarkerFound"> & {
  headLiveMarkerFound: number | null;
  bodyLiveMarkerFound: number | null;
};

function checkHistoryFilter(filters: CheckHistoryFilters) {
  const conditions: string[] = [];
  const values: Array<string | number> = [];
  const query = filters.query?.trim();

  if (query) {
    conditions.push("(targetName LIKE ? OR requestedUrl LIKE ?)");
    const pattern = `%${query}%`;
    values.push(pattern, pattern);
  }
  if (filters.targetId) {
    conditions.push("targetId = ?");
    values.push(filters.targetId);
  }
  if (filters.platform) {
    conditions.push("platform = ?");
    values.push(filters.platform);
  }
  if (filters.liveStatus) {
    conditions.push("liveStatus = ?");
    values.push(filters.liveStatus);
  }
  if (filters.transitionsOnly) {
    conditions.push("(previousLiveStatus IS NULL OR previousLiveStatus <> liveStatus)");
  }

  return { conditions, values };
}

function normalizeCheckHistoryRow(row: RawCheckHistoryRow): CheckHistoryRow {
  return {
    ...row,
    headLiveMarkerFound: row.headLiveMarkerFound === null ? null : Boolean(row.headLiveMarkerFound),
    bodyLiveMarkerFound: row.bodyLiveMarkerFound === null ? null : Boolean(row.bodyLiveMarkerFound),
  };
}

export function getCheckHistory(filters: CheckHistoryFilters = {}) {
  const pageSize = Math.min(200, Math.max(1, filters.pageSize ?? 50));
  const page = Math.max(1, filters.page ?? 1);
  const { conditions, values } = checkHistoryFilter(filters);
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const total = (db.prepare(`${CHECK_HISTORY_CTE} SELECT COUNT(*) AS count FROM history ${where}`).get(...values) as { count: number }).count;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const rawRows = db.prepare(
    `${CHECK_HISTORY_CTE}
     SELECT * FROM history ${where}
     ORDER BY createdAt DESC, checkId DESC
     LIMIT ? OFFSET ?`,
  ).all(...values, pageSize, (currentPage - 1) * pageSize) as RawCheckHistoryRow[];

  return {
    rows: rawRows.map(normalizeCheckHistoryRow),
    total,
    page: currentPage,
    pageSize,
    pageCount,
  };
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
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 50));
  const page = Math.max(1, filters.page ?? 1);
  const { conditions, values } = checkHistoryFilter(filters);
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const totals = db.prepare(
    `${CHECK_HISTORY_CTE}
     SELECT COUNT(*) AS resultCount, COUNT(DISTINCT endpointId) AS endpointCount
     FROM history ${where}`,
  ).get(...values) as { resultCount: number; endpointCount: number };
  const pageCount = Math.max(1, Math.ceil(totals.endpointCount / pageSize));
  const currentPage = Math.min(page, pageCount);
  const endpointRows = db.prepare(
    `${CHECK_HISTORY_CTE}
     SELECT endpointId, targetId, targetName, displayOrder, platform,
            endpointUrl AS url, retiredAt, COUNT(*) AS resultCount
     FROM history ${where}
     GROUP BY endpointId, targetId, targetName, displayOrder, platform, endpointUrl, retiredAt
     ORDER BY displayOrder, platform, endpointUrl
     LIMIT ? OFFSET ?`,
  ).all(...values, pageSize, (currentPage - 1) * pageSize) as Array<Omit<CheckHistoryGroup, "checks">>;

  const endpointIds = endpointRows.map((row) => row.endpointId);
  const rawRows = endpointIds.length
    ? db.prepare(
        `${CHECK_HISTORY_CTE}
         SELECT * FROM history
         ${where ? `${where} AND` : "WHERE"} endpointId IN (${endpointIds.map(() => "?").join(",")})
         ORDER BY displayOrder, platform, endpointUrl, createdAt DESC, checkId DESC`,
      ).all(...values, ...endpointIds) as RawCheckHistoryRow[]
    : [];
  const groups = new Map(endpointRows.map((row) => [row.endpointId, { ...row, checks: [] as CheckHistoryRow[] }]));

  for (const rawRow of rawRows) {
    groups.get(rawRow.endpointId)?.checks.push(normalizeCheckHistoryRow(rawRow));
  }

  return {
    groups: [...groups.values()],
    total: totals.resultCount,
    endpointTotal: totals.endpointCount,
    page: currentPage,
    pageSize,
    pageCount,
  };
}

export function getCheckHistoryTargets() {
  return db.prepare(
    `SELECT DISTINCT target.id, target.displayOrder, target.name
     FROM Target target
     JOIN Endpoint endpoint ON endpoint.targetId = target.id
     JOIN EndpointCheck checkRow ON checkRow.endpointId = endpoint.id
     ORDER BY target.displayOrder`,
  ).all() as Array<{ id: string; displayOrder: number; name: string }>;
}

export function getCheckHistoryTotal() {
  return (db.prepare("SELECT COUNT(*) AS count FROM EndpointCheck").get() as { count: number }).count;
}

export type RunLiveSummary = {
  liveCompleteCount: number;
  checkRequiredCount: number;
  beforeLiveCount: number;
  unverifiedCount: number;
};

export function getRunLiveSummary(runId: string): RunLiveSummary {
  return db.prepare(
    `SELECT
       COALESCE(SUM(CASE WHEN liveStatus = 'LIVE_COMPLETE' THEN 1 ELSE 0 END), 0) AS liveCompleteCount,
       COALESCE(SUM(CASE WHEN liveStatus = 'CHECK_REQUIRED' THEN 1 ELSE 0 END), 0) AS checkRequiredCount,
       COALESCE(SUM(CASE WHEN liveStatus = 'BEFORE_LIVE' THEN 1 ELSE 0 END), 0) AS beforeLiveCount,
       COALESCE(SUM(CASE WHEN liveStatus = 'UNVERIFIED' THEN 1 ELSE 0 END), 0) AS unverifiedCount
     FROM EndpointCheck WHERE runId = ?`,
  ).get(runId) as RunLiveSummary;
}

export type RunTagSummary = {
  changedEndpoints: number;
  headAddedCount: number;
  headRemovedCount: number;
  bodyAddedCount: number;
  bodyRemovedCount: number;
};

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

export function getRunTagSummary(runId: string): RunTagSummary {
  return db.prepare(
    `SELECT
       COALESCE(SUM(CASE WHEN changeStatus = 'CHANGED' THEN 1 ELSE 0 END), 0) AS changedEndpoints,
       COALESCE(SUM(headAddedCount), 0) AS headAddedCount,
       COALESCE(SUM(headRemovedCount), 0) AS headRemovedCount,
       COALESCE(SUM(bodyAddedCount), 0) AS bodyAddedCount,
       COALESCE(SUM(bodyRemovedCount), 0) AS bodyRemovedCount
     FROM EndpointCheck WHERE runId = ?`,
  ).get(runId) as RunTagSummary;
}

export function getRunTagChanges(runId: string): RunTagChangeView[] {
  const rows = db.prepare(
    `SELECT c.id AS checkId, c.runId, t.name AS targetName, t.category, t.displayOrder,
            e.platform, e.url, c.createdAt, previous.createdAt AS comparedAt,
            c.headAddedCount, c.headRemovedCount, c.bodyAddedCount, c.bodyRemovedCount,
            snapshot.diffJson
     FROM EndpointCheck c
     JOIN Endpoint e ON e.id = c.endpointId
     JOIN Target t ON t.id = e.targetId
     JOIN Snapshot snapshot ON snapshot.id = c.snapshotId
     LEFT JOIN EndpointCheck previous ON previous.id = c.comparedCheckId
     WHERE c.runId = ? AND c.changeStatus = 'CHANGED'
     ORDER BY t.displayOrder, e.platform`,
  ).all(runId) as Array<Omit<RunTagChangeView, "diff"> & { diffJson: string | null }>;

  return rows.map(({ diffJson, ...row }) => ({
    ...row,
    diff: parseStructuredDiff(diffJson),
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

export function getRunProgress(runId: string) {
  return db.prepare(
    "SELECT id, status, totalCount, processedCount, changedCount, failureCount, pendingCount, errorMessage FROM Run WHERE id = ?",
  ).get(runId) as Pick<RunRecord, "id" | "status" | "totalCount" | "processedCount" | "changedCount" | "failureCount" | "pendingCount" | "errorMessage"> | undefined;
}
