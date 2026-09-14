import pLimit from "p-limit";
import { createId, db, nowIso } from "@/lib/db";
import type { Lifecycle, MonitorMode, Platform, RuleRecord, RunRecord, RunSource } from "@/lib/db-types";
import { canonicalizeHtml, createStructuredDiff, summarizeStructuredDiff } from "@/lib/tracker/canonicalize";
import { fetchPage, isSameDestination } from "@/lib/tracker/fetcher";
import { evaluateRule, skippedRule, type EvaluatedRule } from "@/lib/tracker/rules";
import type { CanonicalToken, EndpointScanOutcome } from "@/lib/tracker/types";

type EndpointForScan = {
  id: string;
  targetId: string;
  platform: Platform;
  url: string;
  referenceUrl: string | null;
  lifecycle: Lifecycle;
  launchedAt: string | null;
  targetName: string;
  monitorMode: MonitorMode;
  rules: RuleRecord[];
};

type PreviousCheckRow = {
  checkId: string;
  snapshotId: string;
  hash: string;
  tokensJson: string;
};

export class RunAlreadyActiveError extends Error {
  constructor() {
    super("이미 실행 중인 검사가 있습니다.");
  }
}

export function createQueuedRun(source: RunSource, targetIds?: string[]) {
  const create = db.transaction(() => {
    const staleBefore = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    db.prepare(
      "UPDATE Run SET status = 'FAILED', completedAt = ?, errorMessage = ? WHERE status IN ('QUEUED','RUNNING') AND createdAt < ?",
    ).run(nowIso(), "30분 이상 응답이 없어 중단된 실행입니다.", staleBefore);
    const active = db.prepare("SELECT COUNT(*) AS count FROM Run WHERE status IN ('QUEUED','RUNNING')").get() as { count: number };
    if (active.count > 0) throw new RunAlreadyActiveError();
    const id = createId();
    db.prepare("INSERT INTO Run (id, source, status, targetIdsJson, createdAt) VALUES (?, ?, 'QUEUED', ?, ?)").run(
      id,
      source,
      targetIds?.length ? JSON.stringify([...new Set(targetIds)]) : null,
      nowIso(),
    );
    return db.prepare("SELECT * FROM Run WHERE id = ?").get(id) as RunRecord;
  });
  return create();
}

function insertCheck(
  endpoint: EndpointForScan,
  runId: string,
  values: {
    finalUrl: string | null;
    httpStatus: number | null;
    availabilityStatus: "PENDING" | "LIVE" | "UNAVAILABLE" | "ERROR";
    changeStatus: "BASELINE" | "UNCHANGED" | "CHANGED" | "NOT_APPLICABLE";
    responseMs: number | null;
    errorMessage?: string | null;
    snapshotId?: string | null;
    comparedCheckId?: string | null;
    headAddedCount?: number;
    headRemovedCount?: number;
    bodyAddedCount?: number;
    bodyRemovedCount?: number;
    ruleResults?: EvaluatedRule[];
  },
) {
  const checkId = createId();
  const insert = db.transaction(() => {
    db.prepare(
      `INSERT INTO EndpointCheck
       (id, runId, endpointId, requestedUrl, finalUrl, httpStatus, availabilityStatus, changeStatus, responseMs,
        errorMessage, snapshotId, comparedCheckId, headAddedCount, headRemovedCount, bodyAddedCount, bodyRemovedCount, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      checkId, runId, endpoint.id, endpoint.url, values.finalUrl, values.httpStatus,
      values.availabilityStatus, values.changeStatus, values.responseMs, values.errorMessage ?? null,
      values.snapshotId ?? null, values.comparedCheckId ?? null,
      values.headAddedCount ?? 0, values.headRemovedCount ?? 0,
      values.bodyAddedCount ?? 0, values.bodyRemovedCount ?? 0, nowIso(),
    );
    const statement = db.prepare(
      `INSERT INTO RuleResult
       (id, checkId, ruleId, ruleType, ruleLabel, configJson, status, actualValue, message, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const result of values.ruleResults ?? []) {
      statement.run(
        createId(), checkId, result.ruleId, result.ruleType, result.ruleLabel, result.configJson,
        result.status, result.actualValue, result.message, nowIso(),
      );
    }
  });
  insert();
}

async function persistCheck(endpoint: EndpointForScan, runId: string): Promise<EndpointScanOutcome> {
  const result = await fetchPage(endpoint.url, endpoint.platform);
  const rules = endpoint.rules;

  if (result.error || result.status === null) {
    insertCheck(endpoint, runId, {
      finalUrl: result.finalUrl,
      httpStatus: result.status,
      availabilityStatus: "ERROR",
      changeStatus: "NOT_APPLICABLE",
      responseMs: result.responseMs,
      errorMessage: result.error,
      ruleResults: rules.map((rule) => skippedRule(rule, "네트워크 오류로 검사하지 못했습니다.")),
    });
    return { changed: false, failed: true, pending: false };
  }

  const sameDestination = isSameDestination(endpoint.url, result.finalUrl);
  const successful = result.status === 200 && sameDestination;
  const waitingForLaunch = endpoint.lifecycle === "PRELAUNCH" && !endpoint.launchedAt;

  if (waitingForLaunch && !successful) {
    insertCheck(endpoint, runId, {
      finalUrl: result.finalUrl,
      httpStatus: result.status,
      availabilityStatus: "PENDING",
      changeStatus: "NOT_APPLICABLE",
      responseMs: result.responseMs,
      errorMessage: sameDestination ? null : "요청한 신규 경로와 다른 주소로 이동했습니다.",
      ruleResults: rules.map((rule) => skippedRule(rule, "페이지 오픈 대기 중입니다.")),
    });
    return { changed: false, failed: false, pending: true };
  }

  if (!successful) {
    const evaluated = rules.map((rule) =>
      rule.type === "HTTP_STATUS" ? evaluateRule(rule, result.status!, result.html) : skippedRule(rule, "정상 HTML 응답이 아닙니다."),
    );
    insertCheck(endpoint, runId, {
      finalUrl: result.finalUrl,
      httpStatus: result.status,
      availabilityStatus: "UNAVAILABLE",
      changeStatus: "NOT_APPLICABLE",
      responseMs: result.responseMs,
      errorMessage: sameDestination ? null : "최종 주소가 요청한 경로와 다릅니다.",
      ruleResults: evaluated,
    });
    return { changed: false, failed: true, pending: false };
  }

  if (!endpoint.launchedAt && endpoint.lifecycle === "PRELAUNCH") {
    const timestamp = nowIso();
    db.prepare("UPDATE Endpoint SET launchedAt = ?, updatedAt = ? WHERE id = ?").run(timestamp, timestamp, endpoint.id);
  }

  const evaluated = rules.map((rule) => evaluateRule(rule, result.status!, result.html));
  let changeStatus: "BASELINE" | "UNCHANGED" | "CHANGED" | "NOT_APPLICABLE" = "NOT_APPLICABLE";
  let snapshotId: string | null = null;
  let comparedCheckId: string | null = null;
  let headAddedCount = 0;
  let headRemovedCount = 0;
  let bodyAddedCount = 0;
  let bodyRemovedCount = 0;

  if (endpoint.monitorMode === "CONTENT" && result.html) {
    const current = canonicalizeHtml(result.html, result.finalUrl ?? endpoint.url);
    const previous = db
      .prepare(
        `SELECT checkRow.id AS checkId, snapshot.id AS snapshotId, snapshot.hash, snapshot.tokensJson
         FROM EndpointCheck AS checkRow
         JOIN Snapshot AS snapshot ON snapshot.id = checkRow.snapshotId
         WHERE checkRow.endpointId = ? AND checkRow.availabilityStatus = 'LIVE'
         ORDER BY checkRow.createdAt DESC, checkRow.rowid DESC
         LIMIT 1`,
      )
      .get(endpoint.id) as PreviousCheckRow | undefined;

    if (!previous) {
      snapshotId = createId();
      db.prepare("INSERT INTO Snapshot (id, endpointId, hash, tokensJson, createdAt) VALUES (?, ?, ?, ?, ?)").run(
        snapshotId, endpoint.id, current.hash, current.serialized, nowIso(),
      );
      changeStatus = "BASELINE";
    } else if (previous.hash === current.hash) {
      snapshotId = previous.snapshotId;
      comparedCheckId = previous.checkId;
      changeStatus = "UNCHANGED";
    } else {
      const before = JSON.parse(previous.tokensJson) as CanonicalToken[];
      const diff = createStructuredDiff(before, current.tokens);
      const summary = summarizeStructuredDiff(diff);
      snapshotId = createId();
      db.prepare(
        "INSERT INTO Snapshot (id, endpointId, hash, tokensJson, diffJson, previousSnapshotId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ).run(
        snapshotId, endpoint.id, current.hash, current.serialized,
        JSON.stringify(diff), previous.snapshotId, nowIso(),
      );
      comparedCheckId = previous.checkId;
      headAddedCount = summary.HEAD.added;
      headRemovedCount = summary.HEAD.removed;
      bodyAddedCount = summary.BODY.added;
      bodyRemovedCount = summary.BODY.removed;
      changeStatus = "CHANGED";
    }
  }

  const failed = evaluated.some((item) => item.status === "FAIL" || item.status === "ERROR");
  insertCheck(endpoint, runId, {
    finalUrl: result.finalUrl,
    httpStatus: result.status,
    availabilityStatus: "LIVE",
    changeStatus,
    responseMs: result.responseMs,
    snapshotId,
    comparedCheckId,
    headAddedCount,
    headRemovedCount,
    bodyAddedCount,
    bodyRemovedCount,
    ruleResults: evaluated,
  });
  return { changed: changeStatus === "CHANGED", failed, pending: false };
}

export async function executeRun(runId: string) {
  const run = db.prepare("SELECT * FROM Run WHERE id = ?").get(runId) as RunRecord | undefined;
  if (!run) throw new Error(`실행을 찾을 수 없습니다: ${runId}`);
  if (run.status !== "QUEUED") throw new Error(`실행 상태가 QUEUED가 아닙니다: ${run.status}`);
  const targetIds = run.targetIdsJson ? new Set(JSON.parse(run.targetIdsJson) as string[]) : null;

  try {
    const endpointRows = db.prepare(
      `SELECT e.id, e.targetId, e.platform, e.url, e.referenceUrl, e.lifecycle, e.launchedAt,
              t.name AS targetName, t.monitorMode
       FROM Endpoint e JOIN Target t ON t.id = e.targetId
       WHERE e.enabled = 1 AND t.enabled = 1
       ORDER BY t.displayOrder ASC, e.platform ASC`,
    ).all() as Omit<EndpointForScan, "rules">[];
    const filtered = targetIds ? endpointRows.filter((item) => targetIds.has(item.targetId)) : endpointRows;
    const ruleRows = db.prepare("SELECT * FROM Rule WHERE enabled = 1 ORDER BY targetId, displayOrder").all() as RuleRecord[];
    const rulesByTarget = new Map<string, RuleRecord[]>();
    for (const rule of ruleRows) {
      const bucket = rulesByTarget.get(rule.targetId) ?? [];
      bucket.push(rule);
      rulesByTarget.set(rule.targetId, bucket);
    }
    const endpoints = filtered.map((item) => ({ ...item, rules: rulesByTarget.get(item.targetId) ?? [] }));
    db.prepare("UPDATE Run SET status = 'RUNNING', startedAt = ?, totalCount = ? WHERE id = ?").run(nowIso(), endpoints.length, runId);

    const limit = pLimit(Math.max(1, Number(process.env.SCAN_CONCURRENCY ?? 4)));
    const outcomes = await Promise.all(
      endpoints.map((endpoint) => limit(async () => {
        let outcome: EndpointScanOutcome;
        try {
          outcome = await persistCheck(endpoint, runId);
        } catch (error) {
          insertCheck(endpoint, runId, {
            finalUrl: null,
            httpStatus: null,
            availabilityStatus: "ERROR",
            changeStatus: "NOT_APPLICABLE",
            responseMs: null,
            errorMessage: error instanceof Error ? error.message : "검사 처리 오류",
          });
          outcome = { changed: false, failed: true, pending: false };
        }
        db.prepare("UPDATE Run SET processedCount = processedCount + 1 WHERE id = ?").run(runId);
        return outcome;
      })),
    );

    const changedCount = outcomes.filter((item) => item.changed).length;
    const failureCount = outcomes.filter((item) => item.failed).length;
    const pendingCount = outcomes.filter((item) => item.pending).length;
    db.prepare(
      "UPDATE Run SET status = ?, completedAt = ?, changedCount = ?, failureCount = ?, pendingCount = ? WHERE id = ?",
    ).run(failureCount > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED", nowIso(), changedCount, failureCount, pendingCount, runId);
    return db.prepare("SELECT * FROM Run WHERE id = ?").get(runId) as RunRecord;
  } catch (error) {
    db.prepare("UPDATE Run SET status = 'FAILED', completedAt = ?, errorMessage = ? WHERE id = ?").run(
      nowIso(), error instanceof Error ? error.message : "실행 오류", runId,
    );
    throw error;
  }
}
