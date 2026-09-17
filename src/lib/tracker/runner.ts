import pLimit from "p-limit";
import type { LiveStatus, RuleRecord, RunRecord, RunSource } from "@/lib/domain-types";
import {
  acquireRunLock,
  createId,
  emptyEndpointState,
  getRunIndex,
  getStateDocument,
  getTargetsDocument,
  nowIso,
  saveRunDocument,
  saveRunIndex,
  saveStateDocument,
} from "@/lib/json-store";
import type { EndpointState, JsonCheck, JsonEndpoint, JsonRuleResult, JsonTarget } from "@/lib/json-types";
import { canonicalizeHtml, createStructuredDiff, summarizeStructuredDiff } from "@/lib/tracker/canonicalize";
import { fetchPage, isSameDestination } from "@/lib/tracker/fetcher";
import { detectLiveMarkers } from "@/lib/tracker/live-status";
import { evaluateRule, skippedRule, type EvaluatedRule } from "@/lib/tracker/rules";
import type { EndpointScanOutcome } from "@/lib/tracker/types";

type EndpointForScan = {
  target: JsonTarget;
  endpoint: JsonEndpoint;
  rules: RuleRecord[];
};

type CheckValues = Pick<
  JsonCheck,
  | "finalUrl"
  | "httpStatus"
  | "availabilityStatus"
  | "liveStatus"
  | "headLiveMarkerFound"
  | "bodyLiveMarkerFound"
  | "headLiveMarkerHtml"
  | "bodyLiveMarkerHtml"
  | "changeStatus"
  | "responseMs"
  | "errorMessage"
  | "comparedCheckId"
  | "comparedAt"
  | "headAddedCount"
  | "headRemovedCount"
  | "bodyAddedCount"
  | "bodyRemovedCount"
  | "diffJson"
> & { ruleResults: EvaluatedRule[] };

function ruleResults(results: EvaluatedRule[]): JsonRuleResult[] {
  return results.map((result) => ({
    ruleType: result.ruleType,
    ruleLabel: result.ruleLabel,
    configJson: result.configJson,
    status: result.status,
    actualValue: result.actualValue,
    message: result.message,
  }));
}

function createCheck(item: EndpointForScan, runId: string, values: CheckValues): JsonCheck {
  return {
    id: createId(),
    runId,
    endpointId: item.endpoint.id,
    targetId: item.target.id,
    targetName: item.target.name,
    category: item.target.category,
    displayOrder: item.target.displayOrder,
    platform: item.endpoint.platform,
    url: item.endpoint.url,
    retiredAt: item.endpoint.retiredAt,
    requestedUrl: item.endpoint.url,
    ...values,
    createdAt: nowIso(),
    ruleResults: ruleResults(values.ruleResults),
  };
}

function emptyValues(overrides: Partial<CheckValues>): CheckValues {
  return {
    finalUrl: null,
    httpStatus: null,
    availabilityStatus: "ERROR",
    liveStatus: "UNVERIFIED",
    headLiveMarkerFound: null,
    bodyLiveMarkerFound: null,
    headLiveMarkerHtml: null,
    bodyLiveMarkerHtml: null,
    changeStatus: "NOT_APPLICABLE",
    responseMs: null,
    errorMessage: null,
    comparedCheckId: null,
    comparedAt: null,
    headAddedCount: 0,
    headRemovedCount: 0,
    bodyAddedCount: 0,
    bodyRemovedCount: 0,
    diffJson: null,
    ruleResults: [],
    ...overrides,
  };
}

function saveLatestState(state: EndpointState, check: JsonCheck) {
  state.latest = check;
  if (check.liveStatus === "LIVE_COMPLETE" && !state.liveCompletedAt) state.liveCompletedAt = check.createdAt;
  if (check.changeStatus === "CHANGED") state.lastChangedAt = check.createdAt;
}

async function scanEndpoint(
  item: EndpointForScan,
  runId: string,
  state: EndpointState,
): Promise<{ check: JsonCheck; outcome: EndpointScanOutcome }> {
  const result = await fetchPage(item.endpoint.url, item.endpoint.platform);

  if (result.error || result.status === null) {
    const check = createCheck(item, runId, emptyValues({
      finalUrl: result.finalUrl,
      httpStatus: result.status,
      responseMs: result.responseMs,
      errorMessage: result.error,
      ruleResults: item.rules.map((rule) => skippedRule(rule, "네트워크 오류로 검사하지 못했습니다.")),
    }));
    saveLatestState(state, check);
    return { check, outcome: { changed: false, failed: true, pending: false } };
  }

  const sameDestination = isSameDestination(item.endpoint.url, result.finalUrl);
  const successful = result.status === 200 && sameDestination;
  const waitingForLaunch = item.endpoint.lifecycle === "PRELAUNCH" && !state.launchedAt;

  if (waitingForLaunch && !successful) {
    const check = createCheck(item, runId, emptyValues({
      finalUrl: result.finalUrl,
      httpStatus: result.status,
      availabilityStatus: "PENDING",
      liveStatus: "BEFORE_LIVE",
      responseMs: result.responseMs,
      errorMessage: sameDestination ? null : "요청한 신규 경로와 다른 주소로 이동했습니다.",
      ruleResults: item.rules.map((rule) => skippedRule(rule, "페이지 오픈 대기 중입니다.")),
    }));
    saveLatestState(state, check);
    return { check, outcome: { changed: false, failed: false, pending: true } };
  }

  if (!successful) {
    const evaluated = item.rules.map((rule) =>
      rule.type === "HTTP_STATUS"
        ? evaluateRule(rule, result.status!, result.html)
        : skippedRule(rule, "정상 HTML 응답이 아닙니다."),
    );
    const check = createCheck(item, runId, emptyValues({
      finalUrl: result.finalUrl,
      httpStatus: result.status,
      availabilityStatus: "UNAVAILABLE",
      responseMs: result.responseMs,
      errorMessage: sameDestination ? null : "최종 주소가 요청한 경로와 다릅니다.",
      ruleResults: evaluated,
    }));
    saveLatestState(state, check);
    return { check, outcome: { changed: false, failed: true, pending: false } };
  }

  if (!state.launchedAt && item.endpoint.lifecycle === "PRELAUNCH") state.launchedAt = nowIso();

  const evaluated = item.rules.map((rule) => evaluateRule(rule, result.status!, result.html));
  const liveMarkers = item.target.monitorMode === "CONTENT" && result.html ? detectLiveMarkers(result.html) : null;
  const liveStatus: LiveStatus = item.target.monitorMode === "STATUS_ONLY"
    ? "LIVE_COMPLETE"
    : liveMarkers?.liveStatus ?? "UNVERIFIED";
  let changeStatus: JsonCheck["changeStatus"] = "NOT_APPLICABLE";
  let comparedCheckId: string | null = null;
  let comparedAt: string | null = null;
  let headAddedCount = 0;
  let headRemovedCount = 0;
  let bodyAddedCount = 0;
  let bodyRemovedCount = 0;
  let diffJson: string | null = null;
  let currentSnapshot: ReturnType<typeof canonicalizeHtml> | null = null;

  if (item.target.monitorMode === "CONTENT" && result.html) {
    currentSnapshot = canonicalizeHtml(result.html, result.finalUrl ?? item.endpoint.url);
    const previous = state.lastSuccessful;
    if (!previous) {
      changeStatus = "BASELINE";
    } else {
      comparedCheckId = previous.checkId;
      comparedAt = previous.createdAt;
      if (previous.hash === currentSnapshot.hash) {
        changeStatus = "UNCHANGED";
      } else {
        const diff = createStructuredDiff(previous.tokens, currentSnapshot.tokens);
        const summary = summarizeStructuredDiff(diff);
        changeStatus = "CHANGED";
        headAddedCount = summary.HEAD.added;
        headRemovedCount = summary.HEAD.removed;
        bodyAddedCount = summary.BODY.added;
        bodyRemovedCount = summary.BODY.removed;
        diffJson = JSON.stringify(diff);
      }
    }
  }

  const check = createCheck(item, runId, emptyValues({
    finalUrl: result.finalUrl,
    httpStatus: result.status,
    availabilityStatus: "LIVE",
    liveStatus,
    headLiveMarkerFound: liveMarkers?.headLiveMarkerFound ?? null,
    bodyLiveMarkerFound: liveMarkers?.bodyLiveMarkerFound ?? null,
    headLiveMarkerHtml: liveMarkers?.headLiveMarkerHtml ?? null,
    bodyLiveMarkerHtml: liveMarkers?.bodyLiveMarkerHtml ?? null,
    changeStatus,
    responseMs: result.responseMs,
    comparedCheckId,
    comparedAt,
    headAddedCount,
    headRemovedCount,
    bodyAddedCount,
    bodyRemovedCount,
    diffJson,
    ruleResults: evaluated,
  }));
  if (currentSnapshot) {
    state.lastSuccessful = {
      checkId: check.id,
      createdAt: check.createdAt,
      hash: currentSnapshot.hash,
      tokens: currentSnapshot.tokens,
    };
  }
  saveLatestState(state, check);
  const failed = evaluated.some((resultItem) => resultItem.status === "FAIL" || resultItem.status === "ERROR");
  return { check, outcome: { changed: changeStatus === "CHANGED", failed, pending: false } };
}

export async function executeRun(source: RunSource = "MANUAL", targetIds?: string[]) {
  const releaseLock = acquireRunLock();
  try {
    const id = createId();
  const createdAt = nowIso();
  const selectedTargetIds = targetIds?.length ? new Set(targetIds) : null;
  const targets = getTargetsDocument().targets
    .filter((target) => target.enabled && (!selectedTargetIds || selectedTargetIds.has(target.id)))
    .toSorted((a, b) => a.displayOrder - b.displayOrder);
  const endpoints: EndpointForScan[] = targets.flatMap((target) => {
    const rules: RuleRecord[] = target.rules
      .filter((rule) => rule.enabled)
      .map((rule) => ({ ...rule, targetId: target.id }));
    return target.endpoints
      .filter((endpoint) => endpoint.enabled)
      .toSorted((a, b) => a.platform.localeCompare(b.platform) || Number(Boolean(a.retiredAt)) - Number(Boolean(b.retiredAt)))
      .map((endpoint) => ({ target, endpoint, rules }));
  });
  let run: RunRecord = {
    id,
    source,
    status: "RUNNING",
    targetIdsJson: selectedTargetIds ? JSON.stringify([...selectedTargetIds]) : null,
    totalCount: endpoints.length,
    processedCount: 0,
    changedCount: 0,
    failureCount: 0,
    pendingCount: 0,
    errorMessage: null,
    createdAt,
    startedAt: nowIso(),
    completedAt: null,
  };
    const state = structuredClone(getStateDocument());
    const limit = pLimit(Math.max(1, Number(process.env.SCAN_CONCURRENCY ?? 4)));
    const results = await Promise.all(endpoints.map((item) => limit(async () => {
      const endpointState = state.endpoints[item.endpoint.id] ?? emptyEndpointState();
      state.endpoints[item.endpoint.id] = endpointState;
      try {
        return await scanEndpoint(item, id, endpointState);
      } catch (error) {
        const check = createCheck(item, id, emptyValues({
          errorMessage: error instanceof Error ? error.message : "검사 처리 오류",
        }));
        saveLatestState(endpointState, check);
        return { check, outcome: { changed: false, failed: true, pending: false } };
      }
    })));
    const completedAt = nowIso();
    run = {
      ...run,
      status: results.some((result) => result.outcome.failed) ? "COMPLETED_WITH_ERRORS" : "COMPLETED",
      processedCount: results.length,
      changedCount: results.filter((result) => result.outcome.changed).length,
      failureCount: results.filter((result) => result.outcome.failed).length,
      pendingCount: results.filter((result) => result.outcome.pending).length,
      completedAt,
    };
    state.updatedAt = completedAt;
    saveRunDocument({ schemaVersion: 1, run, checks: results.map((result) => result.check) });
    saveStateDocument(state);
    const index = getRunIndex();
    saveRunIndex({
      schemaVersion: 1,
      updatedAt: completedAt,
      runs: [run, ...index.runs.filter((existing) => existing.id !== run.id)],
    });
    return run;
  } finally {
    releaseLock();
  }
}
