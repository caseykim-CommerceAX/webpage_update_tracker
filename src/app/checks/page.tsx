import type { Metadata } from "next";
import Link from "next/link";
import { LiveMarkerEvidence } from "@/components/live-marker-evidence";
import { availabilityPill, changePill, liveStatusPill, StatusPill } from "@/components/status-pill";
import type { LiveStatus, Platform } from "@/lib/db-types";
import { formatDateTime, formatDuration } from "@/lib/format";
import { getCheckHistory, getCheckHistoryTargets } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "전체 진단 로그",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const LIVE_STATUSES: LiveStatus[] = ["LIVE_COMPLETE", "CHECK_REQUIRED", "BEFORE_LIVE", "UNVERIFIED"];
const PLATFORMS: Platform[] = ["DESKTOP", "MOBILE"];

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function liveStatusLabel(status: LiveStatus) {
  if (status === "LIVE_COMPLETE") return "라이브 완료";
  if (status === "CHECK_REQUIRED") return "체크 필요";
  if (status === "BEFORE_LIVE") return "라이브 전";
  return "판정 불가";
}

function pageHref({
  page,
  query,
  targetId,
  platform,
  liveStatus,
  transitionsOnly,
}: {
  page: number;
  query: string;
  targetId: string;
  platform?: Platform;
  liveStatus?: LiveStatus;
  transitionsOnly: boolean;
}) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (targetId) params.set("target", targetId);
  if (platform) params.set("platform", platform);
  if (liveStatus) params.set("status", liveStatus);
  if (transitionsOnly) params.set("transitions", "1");
  if (page > 1) params.set("page", String(page));
  const queryString = params.toString();
  return queryString ? `/checks?${queryString}` : "/checks";
}

export default async function ChecksPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = firstValue(params.q)?.trim() ?? "";
  const targetId = firstValue(params.target) ?? "";
  const platformValue = firstValue(params.platform);
  const platform = PLATFORMS.includes(platformValue as Platform) ? platformValue as Platform : undefined;
  const statusValue = firstValue(params.status);
  const liveStatus = LIVE_STATUSES.includes(statusValue as LiveStatus) ? statusValue as LiveStatus : undefined;
  const transitionsOnly = firstValue(params.transitions) === "1";
  const page = Math.max(1, Number.parseInt(firstValue(params.page) ?? "1", 10) || 1);
  const targets = getCheckHistoryTargets();
  const history = getCheckHistory({ query, targetId, platform, liveStatus, transitionsOnly, page, pageSize: 50 });
  const hrefForPage = (nextPage: number) => pageHref({
    page: nextPage,
    query,
    targetId,
    platform,
    liveStatus,
    transitionsOnly,
  });

  return (
    <div className="space-y-8">
      <header className="border-b border-neutral-950 pb-6">
        <p className="eyebrow">DB 저장 이력</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-[-0.045em] text-neutral-950 sm:text-5xl">전체 진단 로그</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-neutral-600">
              모든 URL 진단을 시간 역순으로 확인합니다. 상태 변경만 모아보면 라이브 전 → 체크 필요 → 라이브 완료 시점을 추적할 수 있습니다.
            </p>
          </div>
          <p className="tabular-nums shrink-0 text-sm font-black text-neutral-700">총 {history.total.toLocaleString("ko-KR")}건</p>
        </div>
      </header>

      <section className="panel p-5 sm:p-6" aria-labelledby="history-filter-title">
        <h2 id="history-filter-title" className="text-sm font-black text-neutral-950">로그 검색 및 필터</h2>
        <form action="/checks" method="get" className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_220px_150px_170px_auto_auto] xl:items-end">
          <label>
            <span className="form-label">대상 또는 URL</span>
            <input className="form-input w-full" type="search" name="q" defaultValue={query} placeholder="이름 또는 URL 검색…" />
          </label>
          <label>
            <span className="form-label">대상</span>
            <select className="form-input w-full" name="target" defaultValue={targetId}>
              <option value="">모든 대상</option>
              {targets.map((target) => <option key={target.id} value={target.id}>{target.displayOrder}. {target.name}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">채널</span>
            <select className="form-input w-full" name="platform" defaultValue={platform ?? ""}>
              <option value="">전체 채널</option>
              <option value="DESKTOP">PC</option>
              <option value="MOBILE">Mobile</option>
            </select>
          </label>
          <label>
            <span className="form-label">라이브 상태</span>
            <select className="form-input w-full" name="status" defaultValue={liveStatus ?? ""}>
              <option value="">모든 상태</option>
              <option value="LIVE_COMPLETE">라이브 완료</option>
              <option value="CHECK_REQUIRED">체크 필요</option>
              <option value="BEFORE_LIVE">라이브 전</option>
              <option value="UNVERIFIED">판정 불가</option>
            </select>
          </label>
          <label className="flex min-h-10 items-center gap-2 border border-neutral-300 bg-white px-3 py-2 text-xs font-bold text-neutral-700">
            <input type="checkbox" name="transitions" value="1" defaultChecked={transitionsOnly} />
            상태 변경만
          </label>
          <div className="flex gap-2">
            <button type="submit" className="button-primary flex-1 px-4 py-2.5 text-sm">적용</button>
            <Link href="/checks" className="button-secondary px-4 py-2.5 text-sm">초기화</Link>
          </div>
        </form>
      </section>

      <section aria-label="저장된 URL 진단 로그" className="space-y-4">
        {history.rows.map((check) => {
          const statusChanged = check.previousLiveStatus !== null && check.previousLiveStatus !== check.liveStatus;
          const firstStatus = check.previousLiveStatus === null;
          const hasMarkerData = check.headLiveMarkerFound !== null || check.bodyLiveMarkerFound !== null
            || check.headLiveMarkerHtml !== null || check.bodyLiveMarkerHtml !== null;
          return (
            <article key={check.checkId} className={`panel content-auto overflow-hidden ${statusChanged ? "border-l-4 border-l-amber-500" : ""}`}>
              <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500">
                    {check.displayOrder}. {check.platform === "DESKTOP" ? "PC" : "Mobile"} · {check.runSource === "SCHEDULE" ? "예약 검사" : "수동 검사"}
                  </p>
                  <h2 className="mt-1 text-lg font-black text-neutral-950">{check.targetName}</h2>
                  <a href={check.requestedUrl} target="_blank" rel="noreferrer" className="text-link mt-2 block max-w-full break-all text-xs">{check.requestedUrl}</a>
                  <p className="tabular-nums mt-3 text-xs font-bold text-neutral-600">{formatDateTime(check.createdAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2 lg:max-w-lg lg:justify-end">
                  {liveStatusPill(check.liveStatus)}
                  {availabilityPill(check.availabilityStatus)}
                  {changePill(check.changeStatus)}
                </div>
              </div>

              <div className={`border-t px-5 py-3 text-xs font-black sm:px-6 ${statusChanged ? "border-amber-300 bg-amber-50 text-amber-950" : firstStatus ? "border-sky-200 bg-sky-50 text-sky-950" : "border-neutral-300 bg-neutral-50 text-neutral-600"}`}>
                {statusChanged && check.previousLiveStatus
                  ? `상태 변경 · ${liveStatusLabel(check.previousLiveStatus)} → ${liveStatusLabel(check.liveStatus)}`
                  : firstStatus
                    ? `첫 판정 · ${liveStatusLabel(check.liveStatus)}`
                    : `상태 유지 · ${liveStatusLabel(check.liveStatus)}`}
              </div>

              <dl className="grid grid-cols-2 border-t border-neutral-300 sm:grid-cols-3 xl:grid-cols-6">
                <div className="border-b border-r border-neutral-300 p-4"><dt className="text-[10px] font-bold text-neutral-500">HTTP</dt><dd className="tabular-nums mt-1 font-black">{check.httpStatus ?? "—"}</dd></div>
                <div className="border-b border-r border-neutral-300 p-4"><dt className="text-[10px] font-bold text-neutral-500">HEAD OG</dt><dd className="mt-1"><StatusPill label={check.headLiveMarkerFound === true ? "확인" : check.headLiveMarkerFound === false ? "없음" : "미확인"} tone={check.headLiveMarkerFound === true ? "green" : check.headLiveMarkerFound === false ? "red" : "gray"} /></dd></div>
                <div className="border-b border-r border-neutral-300 p-4"><dt className="text-[10px] font-bold text-neutral-500">BODY 문구</dt><dd className="mt-1"><StatusPill label={check.bodyLiveMarkerFound === true ? "확인" : check.bodyLiveMarkerFound === false ? "없음" : "미확인"} tone={check.bodyLiveMarkerFound === true ? "green" : check.bodyLiveMarkerFound === false ? "red" : "gray"} /></dd></div>
                <div className="border-b border-r border-neutral-300 p-4"><dt className="text-[10px] font-bold text-neutral-500">HEAD 변경</dt><dd className="tabular-nums mt-1 font-black">{check.headAddedCount + check.headRemovedCount}</dd></div>
                <div className="border-b border-r border-neutral-300 p-4"><dt className="text-[10px] font-bold text-neutral-500">BODY 변경</dt><dd className="tabular-nums mt-1 font-black">{check.bodyAddedCount + check.bodyRemovedCount}</dd></div>
                <div className="border-b border-r border-neutral-300 p-4"><dt className="text-[10px] font-bold text-neutral-500">응답 시간</dt><dd className="tabular-nums mt-1 font-black">{formatDuration(check.responseMs)}</dd></div>
              </dl>

              <details className="border-t border-neutral-300 p-5 sm:p-6">
                <summary className="cursor-pointer text-sm font-black text-neutral-950 underline decoration-neutral-400 underline-offset-4 hover:text-[#e4002b]">
                  저장된 진단 데이터 펼쳐보기
                </summary>
                <div className="mt-5 space-y-5">
                  {hasMarkerData ? (
                    <LiveMarkerEvidence
                      headFound={check.headLiveMarkerFound}
                      bodyFound={check.bodyLiveMarkerFound}
                      headHtml={check.headLiveMarkerHtml}
                      bodyHtml={check.bodyLiveMarkerHtml}
                    />
                  ) : (
                    <p className="border border-neutral-300 bg-neutral-100 px-3 py-2 text-xs text-neutral-600">이 진단은 HTML 라이브 신호를 검사하지 않았습니다.</p>
                  )}
                  {check.finalUrl && check.finalUrl !== check.requestedUrl ? <p className="break-all text-xs text-neutral-600"><span className="font-black">최종 주소:</span> {check.finalUrl}</p> : null}
                  {check.errorMessage ? <p className="break-words border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-950">{check.errorMessage}</p> : null}
                  {check.failedRules ? <p className="text-xs font-bold text-rose-900">보조 규칙 실패 {check.failedRules}건</p> : null}
                  <Link href={`/runs/${check.runId}#check-${check.checkId}`} className="button-secondary inline-flex px-4 py-2.5 text-sm">검사 상세 보기</Link>
                </div>
              </details>
            </article>
          );
        })}

        {history.rows.length === 0 ? (
          <div className="panel px-5 py-16 text-center">
            <p className="font-black text-neutral-950">조건에 맞는 진단 로그가 없습니다.</p>
            <p className="mt-2 text-sm text-neutral-500">검색 또는 필터 조건을 바꿔 주세요.</p>
          </div>
        ) : null}
      </section>

      <nav aria-label="진단 로그 페이지" className="flex items-center justify-between gap-4 border-t border-neutral-950 pt-5">
        {history.page > 1 ? <Link href={hrefForPage(history.page - 1)} className="button-secondary px-4 py-2.5 text-sm">이전 50건</Link> : <span />}
        <p className="tabular-nums text-sm font-black text-neutral-700">{history.page} / {history.pageCount} 페이지</p>
        {history.page < history.pageCount ? <Link href={hrefForPage(history.page + 1)} className="button-secondary px-4 py-2.5 text-sm">다음 50건</Link> : <span />}
      </nav>
    </div>
  );
}
