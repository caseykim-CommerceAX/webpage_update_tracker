import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckDiagnostics, hasCheckIssue } from "@/components/check-diagnostics";
import { LiveMarkerEvidence } from "@/components/live-marker-evidence";
import { availabilityPill, changePill, liveStatusPill, runPill, StatusPill } from "@/components/status-pill";
import { TagDiff } from "@/components/tag-diff";
import { formatDateTime, formatDuration } from "@/lib/format";
import { getRun } from "@/lib/queries";
import type { StructuredDiff } from "@/lib/tracker/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "실행 상세",
};

const statusPriority = { ERROR: 0, FAIL: 1, SKIPPED: 2, PASS: 3 } as const;

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = getRun(id);
  if (!detail) notFound();
  const { run, checks } = detail;
  const checkViews = checks.map((check) => {
    const failureDetails = check.ruleResults.filter((rule) => rule.status === "FAIL" || rule.status === "ERROR");
    const diagnostic = { ...check, failureDetails };
    const diagnosticIssue = hasCheckIssue(diagnostic);
    const liveCheckIssue = check.liveStatus === "CHECK_REQUIRED" || check.liveStatus === "UNVERIFIED";
    return { check, diagnostic, diagnosticIssue, issue: diagnosticIssue || liveCheckIssue };
  });
  const issueChecks = checkViews.filter((item) => item.issue);
  const changedChecks = checks.filter((check) => check.changeStatus === "CHANGED");
  const liveCompleteCount = checks.filter((check) => check.liveStatus === "LIVE_COMPLETE").length;
  const checkRequiredCount = checks.filter((check) => check.liveStatus === "CHECK_REQUIRED").length;
  const beforeLiveCount = checks.filter((check) => check.liveStatus === "BEFORE_LIVE").length;
  const unverifiedCount = checks.filter((check) => check.liveStatus === "UNVERIFIED").length;

  return (
    <div className="space-y-8">
      <header className="border-b border-neutral-950 pb-6">
        <Link href="/runs" className="text-link text-xs">실행 이력으로</Link>
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">검사 실행 상세</p>
            <h1 className="mt-2 text-pretty text-3xl font-black tracking-[-0.04em] text-neutral-950 sm:text-5xl">
              {formatDateTime(run.startedAt ?? run.createdAt)} 검사
            </h1>
          </div>
          {runPill(run.status)}
        </div>
      </header>

      {run.errorMessage ? (
        <section className="border border-[#e4002b] bg-white p-5" aria-labelledby="run-error-title">
          <h2 id="run-error-title" className="font-black text-[#e4002b]">실행을 완료하지 못했습니다.</h2>
          <p className="mt-2 break-words text-sm text-neutral-700">{run.errorMessage}</p>
        </section>
      ) : null}

      <section aria-label="실행 결과 요약" className="grid border-l border-t border-neutral-300 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["라이브 완료", liveCompleteCount],
          ["체크 필요", checkRequiredCount],
          ["라이브 전", beforeLiveCount],
          ["판정 불가", unverifiedCount],
        ].map(([label, value]) => (
          <div key={label} className="border-b border-r border-neutral-300 bg-white p-5">
            <p className="text-xs font-bold text-neutral-500">{label}</p>
            <p className="tabular-nums mt-3 text-3xl font-black text-neutral-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="panel" aria-labelledby="change-index-title">
        <div className="border-b border-neutral-300 p-5 sm:p-6">
          <p className="eyebrow">직전 저장 진단 대비</p>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="change-index-title" className="text-2xl font-black text-neutral-950">태그 변경 URL {changedChecks.length}개</h2>
            <p className="text-sm text-neutral-600">HEAD와 BODY 변경 건수를 나눠 표시합니다.</p>
          </div>
        </div>
        {changedChecks.length ? (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3">
            {changedChecks.map((check) => (
              <a key={check.id} href={`#check-${check.id}`} className="border-b border-r border-neutral-300 p-5 transition-colors duration-150 hover:bg-neutral-100">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500">{check.platform === "DESKTOP" ? "PC" : "Mobile"}</p>
                <p className="mt-1 font-black text-neutral-950">{check.targetName}</p>
                <p className="tabular-nums mt-3 text-xs font-bold text-neutral-700">
                  HEAD {check.headAddedCount + check.headRemovedCount} · BODY {check.bodyAddedCount + check.bodyRemovedCount}
                </p>
                <p className="tabular-nums mt-1 text-[11px] text-neutral-500">{formatDateTime(check.comparedAt)} 대비</p>
              </a>
            ))}
          </div>
        ) : (
          <div className="p-5 sm:p-6"><p className="font-black text-neutral-950">이 실행에서 변경된 태그가 없습니다.</p></div>
        )}
      </section>

      <section className="panel" aria-labelledby="issue-index-title">
        <div className="border-b border-neutral-300 p-5 sm:p-6">
          <p className="eyebrow">우선 확인</p>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="issue-index-title" className="text-2xl font-black text-neutral-950">체크 필요 항목 {issueChecks.length}개</h2>
            <p className="text-sm text-neutral-600">라이브 신호가 일부만 확인되거나 접속·규칙 판정에 문제가 있는 URL입니다.</p>
          </div>
        </div>
        {issueChecks.length ? (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3">
            {issueChecks.map(({ check, diagnostic }) => (
              <a key={check.id} href={`#check-${check.id}`} className="border-b border-r border-neutral-300 p-5 transition-colors duration-150 hover:bg-neutral-100">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500">{check.platform === "DESKTOP" ? "PC" : "Mobile"}</p>
                <p className="mt-1 font-black text-neutral-950">{check.targetName}</p>
                <p className="mt-2 text-xs font-bold text-[#e4002b]">
                  {check.liveStatus === "CHECK_REQUIRED" ? "HEAD/BODY 라이브 신호 확인 필요" : `확인할 내용 ${diagnostic.failureDetails.length + (diagnostic.availabilityStatus === "ERROR" || diagnostic.availabilityStatus === "UNAVAILABLE" ? 1 : 0)}건`}
                </p>
              </a>
            ))}
          </div>
        ) : (
          <div className="p-5 sm:p-6">
            <p className="font-black text-neutral-950">이 실행에는 체크 필요 항목이 없습니다.</p>
          </div>
        )}
      </section>

      <section aria-label="URL별 검사 결과" className="space-y-4">
        {checkViews.map(({ check, diagnostic, diagnosticIssue, issue }) => {
          const diff = parseDiff(check.diffJson);
          const sortedRules = check.ruleResults.toSorted((a, b) => statusPriority[a.status] - statusPriority[b.status]);
          return (
            <article id={`check-${check.id}`} key={check.id} className={`panel scroll-mt-6 ${issue ? "border-l-4 border-l-[#e4002b]" : ""}`}>
              <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500">{check.displayOrder}. {check.platform === "DESKTOP" ? "PC" : "Mobile"}</p>
                    <StatusPill label={check.retiredAt ? "이전 URL" : "현재 URL"} tone={check.retiredAt ? "gray" : "blue"} />
                  </div>
                  <h2 className="mt-1 text-xl font-black text-neutral-950">{check.targetName}</h2>
                  <a href={check.url} target="_blank" rel="noreferrer" className="text-link mt-2 block w-fit max-w-full break-all text-xs">{check.url}</a>
                  {check.finalUrl && check.finalUrl !== check.requestedUrl ? (
                    <p className="mt-2 break-all text-xs text-neutral-500">최종 이동 주소: {check.finalUrl}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:max-w-md lg:justify-end">
                  {liveStatusPill(check.liveStatus)}
                  {availabilityPill(check.availabilityStatus)}
                  {changePill(check.changeStatus)}
                  <StatusPill
                    label={`HTTP ${check.httpStatus ?? "—"}`}
                    tone={check.httpStatus === 200 ? "green" : check.availabilityStatus === "PENDING" ? "amber" : "red"}
                  />
                  <StatusPill label={formatDuration(check.responseMs)} />
                </div>
              </div>

              {check.headLiveMarkerFound !== null || check.bodyLiveMarkerFound !== null ? (
                <div className="border-t border-neutral-300 p-5 sm:p-6">
                  <h3 className="mb-4 text-sm font-black text-neutral-950">라이브 판정 실제 태그</h3>
                  <LiveMarkerEvidence
                    headFound={check.headLiveMarkerFound}
                    bodyFound={check.bodyLiveMarkerFound}
                    headHtml={check.headLiveMarkerHtml}
                    bodyHtml={check.bodyLiveMarkerHtml}
                  />
                </div>
              ) : null}

              {diagnosticIssue ? (
                <div className="border-t border-neutral-300 bg-neutral-50 p-5 sm:p-6">
                  <CheckDiagnostics check={diagnostic} />
                </div>
              ) : check.errorMessage ? (
                <p className="mx-5 mb-5 border border-neutral-300 bg-neutral-100 px-3 py-2 text-xs font-bold text-neutral-700 sm:mx-6 sm:mb-6">{check.errorMessage}</p>
              ) : null}

              {sortedRules.length ? (
                <div className="border-t border-neutral-300">
                  <div className="px-5 py-4 sm:px-6"><h3 className="text-sm font-black text-neutral-950">접속 및 보조 정적 규칙</h3></div>
                  <div className="grid border-t border-neutral-300 lg:grid-cols-3">
                    {sortedRules.map((rule, index) => {
                      const failed = rule.status === "FAIL" || rule.status === "ERROR";
                      return (
                        <section key={`${rule.ruleLabel}-${index}`} className={`min-w-0 border-b border-r border-neutral-300 p-4 ${failed ? "bg-neutral-50" : "bg-white"}`}>
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="break-words text-xs font-extrabold text-neutral-950">{rule.ruleLabel}</h4>
                            <StatusPill label={ruleStatusLabel(rule.status)} tone={failed ? "red" : rule.status === "SKIPPED" ? "gray" : "green"} />
                          </div>
                          {rule.message ? <p className="mt-3 break-words text-xs leading-5 text-neutral-600"><span className="font-bold text-neutral-800">판정 이유:</span> {rule.message}</p> : null}
                          {rule.actualValue ? <p className="mt-2 max-h-32 overflow-auto break-all border-l border-neutral-300 pl-2 text-xs leading-5 text-neutral-500"><span className="font-bold text-neutral-700">실제 확인값:</span> {rule.actualValue}</p> : null}
                        </section>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {diff && (diff.added.length || diff.removed.length) ? (
                <details className="border-t border-neutral-300 p-5 sm:p-6">
                  <summary className="cursor-pointer text-sm font-black text-neutral-950 underline decoration-neutral-400 underline-offset-4 hover:text-[#e4002b]">
                    HEAD/BODY 태그 변경 상세 · 추가 {diff.added.length} / 삭제 {diff.removed.length}
                  </summary>
                  <div className="mt-5"><TagDiff diff={diff} /></div>
                </details>
              ) : null}
            </article>
          );
        })}
        {checks.length === 0 ? <div className="panel p-8"><p className="font-black">저장된 URL 검사 결과가 없습니다.</p></div> : null}
      </section>
    </div>
  );
}

function ruleStatusLabel(status: "PASS" | "FAIL" | "SKIPPED" | "ERROR") {
  if (status === "PASS") return "통과";
  if (status === "FAIL") return "실패";
  if (status === "SKIPPED") return "건너뜀";
  return "오류";
}

function parseDiff(value: string | null): StructuredDiff | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as StructuredDiff;
  } catch {
    return null;
  }
}
