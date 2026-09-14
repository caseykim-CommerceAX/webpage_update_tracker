import { db } from "@/lib/db";
import type {
  AvailabilityStatus,
  ChangeStatus,
  Lifecycle,
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
  enabled: boolean;
  latest: {
    checkId: string;
    runId: string;
    httpStatus: number | null;
    availabilityStatus: AvailabilityStatus;
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
    "SELECT id, targetId, platform, url, referenceUrl, lifecycle, launchedAt, enabled FROM Endpoint WHERE retiredAt IS NULL ORDER BY platform",
  ).all() as EndpointRow[];
  const ruleRows = db.prepare(
    "SELECT id, targetId, type, label, selector, attribute, expectedValue, expectedStatuses, enabled, displayOrder FROM Rule ORDER BY targetId, displayOrder",
  ).all() as Array<Omit<RuleView, "enabled"> & { targetId: string; enabled: number }>;
  const latestRows = db.prepare(
    `SELECT c.endpointId, c.id AS checkId, c.runId, c.httpStatus, c.availabilityStatus, c.changeStatus,
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
      enabled: Boolean(row.enabled),
      latest: latest
        ? {
            checkId: latest.checkId,
            runId: latest.runId,
            httpStatus: latest.httpStatus,
            availabilityStatus: latest.availabilityStatus,
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
  return { run, checks: checks.map((check) => ({ ...check, ruleResults: byCheck.get(check.id) ?? [] })) };
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
