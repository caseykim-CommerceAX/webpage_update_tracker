"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LiveMarkerEvidence } from "@/components/live-marker-evidence";
import { availabilityPill, changePill, liveStatusPill, StatusPill } from "@/components/status-pill";
import { getCheckHistoryAccent } from "@/lib/check-history-accent";
import type { LiveStatus, Platform } from "@/lib/domain-types";
import { formatDateTime, formatDuration } from "@/lib/format";
import type { CheckHistoryGroup, CheckHistoryRow } from "@/lib/queries";

type HistoryTarget = { id: string; displayOrder: number; name: string };

function liveStatusLabel(status: LiveStatus) {
  if (status === "LIVE_COMPLETE") return "라이브 완료";
  if (status === "CHECK_REQUIRED") return "체크 필요";
  if (status === "BEFORE_LIVE") return "라이브 전";
  return "판정 불가";
}

function markerPill(found: boolean | null) {
  return (
    <StatusPill
      label={found === true ? "확인" : found === false ? "없음" : "미확인"}
      tone={found === true ? "green" : found === false ? "red" : "gray"}
    />
  );
}

function CheckResult({ check }: { check: CheckHistoryRow }) {
  const statusChanged = check.previousLiveStatus !== null && check.previousLiveStatus !== check.liveStatus;
  const firstStatus = check.previousLiveStatus === null;
  const hasMarkerData = check.headLiveMarkerFound !== null || check.bodyLiveMarkerFound !== null
    || check.headLiveMarkerHtml !== null || check.bodyLiveMarkerHtml !== null;
  const accent = getCheckHistoryAccent(check);
  const accentClass = accent === "error"
    ? "border-l-4 border-l-rose-500"
    : accent === "live-complete"
      ? "border-l-4 border-l-emerald-500"
      : accent === "status-change"
        ? "border-l-4 border-l-amber-500"
        : "";
  const transitionLabel = statusChanged && check.previousLiveStatus
    ? `상태 변경 · ${liveStatusLabel(check.previousLiveStatus)} → ${liveStatusLabel(check.liveStatus)}`
    : firstStatus
      ? `첫 판정 · ${liveStatusLabel(check.liveStatus)}`
      : `상태 유지 · ${liveStatusLabel(check.liveStatus)}`;

  return (
    <li id={`check-${check.checkId}`} className={`scroll-mt-6 ${accentClass}`}>
      <div className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <p className="tabular-nums text-sm font-black text-neutral-950">{formatDateTime(check.createdAt)}</p>
          <p className="mt-1 text-[11px] font-bold text-neutral-500">
            {check.runSource === "SCHEDULE" ? "예약 검사" : "수동 검사"} · {transitionLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:max-w-xl lg:justify-end">
          {liveStatusPill(check.liveStatus)}
          {availabilityPill(check.availabilityStatus)}
          {changePill(check.changeStatus)}
        </div>
      </div>
      <dl className="grid grid-cols-2 border-t border-neutral-200 bg-neutral-50 sm:grid-cols-3 xl:grid-cols-6">
        <div className="border-b border-r border-neutral-200 p-3"><dt className="text-[10px] font-bold text-neutral-500">HTTP</dt><dd className="tabular-nums mt-1 font-black">{check.httpStatus ?? "—"}</dd></div>
        <div className="border-b border-r border-neutral-200 p-3"><dt className="text-[10px] font-bold text-neutral-500">HEAD OG</dt><dd className="mt-1">{markerPill(check.headLiveMarkerFound)}</dd></div>
        <div className="border-b border-r border-neutral-200 p-3"><dt className="text-[10px] font-bold text-neutral-500">BODY 문구</dt><dd className="mt-1">{markerPill(check.bodyLiveMarkerFound)}</dd></div>
        <div className="border-b border-r border-neutral-200 p-3"><dt className="text-[10px] font-bold text-neutral-500">HEAD 변경</dt><dd className="tabular-nums mt-1 font-black">{check.headAddedCount + check.headRemovedCount}</dd></div>
        <div className="border-b border-r border-neutral-200 p-3"><dt className="text-[10px] font-bold text-neutral-500">BODY 변경</dt><dd className="tabular-nums mt-1 font-black">{check.bodyAddedCount + check.bodyRemovedCount}</dd></div>
        <div className="border-b border-r border-neutral-200 p-3"><dt className="text-[10px] font-bold text-neutral-500">응답 시간</dt><dd className="tabular-nums mt-1 font-black">{formatDuration(check.responseMs)}</dd></div>
      </dl>
      <details className="border-t border-neutral-200 px-4 py-3 sm:px-5">
        <summary className="cursor-pointer text-xs font-black text-neutral-800 underline decoration-neutral-400 underline-offset-4 hover:text-[#e4002b]">판정 근거와 상세 데이터</summary>
        <div className="mt-4 space-y-4">
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
          <Link href={`/runs/${check.runId}#check-${check.checkId}`} className="button-secondary inline-flex px-4 py-2.5 text-sm">해당 실행 상세 보기</Link>
        </div>
      </details>
    </li>
  );
}

export function CheckHistory({ groups, targets }: { groups: CheckHistoryGroup[]; targets: HistoryTarget[] }) {
  const [query, setQuery] = useState("");
  const [targetId, setTargetId] = useState("");
  const [platform, setPlatform] = useState<Platform | "">("");
  const [liveStatus, setLiveStatus] = useState<LiveStatus | "">("");
  const [transitionsOnly, setTransitionsOnly] = useState(false);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ko-KR");
    return groups.flatMap((group) => {
      if (needle && !`${group.targetName} ${group.url}`.toLocaleLowerCase("ko-KR").includes(needle)) return [];
      if (targetId && group.targetId !== targetId) return [];
      if (platform && group.platform !== platform) return [];
      const checks = group.checks.filter((check) => {
        if (liveStatus && check.liveStatus !== liveStatus) return false;
        if (transitionsOnly && check.previousLiveStatus === check.liveStatus) return false;
        return true;
      });
      return checks.length ? [{ ...group, checks, resultCount: checks.length }] : [];
    });
  }, [groups, liveStatus, platform, query, targetId, transitionsOnly]);
  const resultCount = filtered.reduce((total, group) => total + group.checks.length, 0);
  const filterActive = Boolean(query || targetId || platform || liveStatus || transitionsOnly);

  function reset() {
    setQuery("");
    setTargetId("");
    setPlatform("");
    setLiveStatus("");
    setTransitionsOnly(false);
  }

  return (
    <div className="space-y-8">
      <header className="border-b border-neutral-950 pb-6">
        <p className="eyebrow">JSON 저장 이력</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-[-0.045em] text-neutral-950 sm:text-5xl">URL별 진단 로그</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-neutral-600">진단 결과를 URL별로 묶고, 각 URL 안에서 최근 실행부터 시간순으로 표시합니다.</p>
          </div>
          <p aria-live="polite" className="tabular-nums shrink-0 text-sm font-black text-neutral-700">URL {filtered.length.toLocaleString("ko-KR")}개 · 실행 결과 {resultCount.toLocaleString("ko-KR")}건</p>
        </div>
      </header>

      <section className="panel p-5 sm:p-6" aria-labelledby="history-filter-title">
        <h2 id="history-filter-title" className="text-sm font-black text-neutral-950">URL 및 실행 결과 필터</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_220px_150px_170px_auto_auto] xl:items-end">
          <label><span className="form-label">대상 또는 URL</span><input className="form-input w-full" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름 또는 URL 검색…" /></label>
          <label><span className="form-label">대상</span><select className="form-input w-full" value={targetId} onChange={(event) => setTargetId(event.target.value)}><option value="">모든 대상</option>{targets.map((target) => <option key={target.id} value={target.id}>{target.displayOrder}. {target.name}</option>)}</select></label>
          <label><span className="form-label">채널</span><select className="form-input w-full" value={platform} onChange={(event) => setPlatform(event.target.value as Platform | "")}><option value="">전체 채널</option><option value="DESKTOP">PC</option><option value="MOBILE">Mobile</option></select></label>
          <label><span className="form-label">실행 결과 상태</span><select className="form-input w-full" value={liveStatus} onChange={(event) => setLiveStatus(event.target.value as LiveStatus | "")}><option value="">모든 상태</option><option value="LIVE_COMPLETE">라이브 완료</option><option value="CHECK_REQUIRED">체크 필요</option><option value="BEFORE_LIVE">라이브 전</option><option value="UNVERIFIED">판정 불가</option></select></label>
          <label className="flex min-h-10 items-center gap-2 border border-neutral-300 bg-white px-3 py-2 text-xs font-bold text-neutral-700"><input type="checkbox" checked={transitionsOnly} onChange={(event) => setTransitionsOnly(event.target.checked)} />첫 판정·상태 변경만</label>
          <button type="button" disabled={!filterActive} onClick={reset} className="button-secondary px-4 py-2.5 text-sm">초기화</button>
        </div>
      </section>

      <aside aria-label="진단 로그 하이라이트 기준" className="flex flex-wrap items-center gap-x-5 gap-y-2 border border-neutral-300 bg-white px-4 py-3 text-xs font-bold text-neutral-700 sm:px-5">
        <span className="font-black text-neutral-950">왼쪽 선 기준</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-1 bg-emerald-500" aria-hidden="true" />첫 라이브 완료·완료로 전환</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-1 bg-amber-500" aria-hidden="true" />그 밖의 상태 변경</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-1 bg-rose-500" aria-hidden="true" />판정 불가·검사 오류</span>
      </aside>

      <section aria-label="URL별 진단 실행 결과" className="space-y-5">
        {filtered.map((group) => (
          <article key={group.endpointId} className="panel content-auto overflow-hidden">
            <header className="grid gap-4 border-b border-neutral-300 bg-white p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500">{group.displayOrder}. {group.platform === "DESKTOP" ? "PC" : "Mobile"}</p><h2 className="mt-1 text-xl font-black text-neutral-950">{group.targetName}</h2><a href={group.url} target="_blank" rel="noreferrer" className="text-link mt-2 block max-w-full break-all text-xs">{group.url}</a></div>
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">{group.retiredAt ? <StatusPill label="이전 URL" tone="gray" /> : <StatusPill label="현재 URL" tone="blue" />}<StatusPill label={`실행 결과 ${group.resultCount.toLocaleString("ko-KR")}건`} /></div>
            </header>
            <ol className="divide-y divide-neutral-300">{group.checks.map((check) => <CheckResult key={check.checkId} check={check} />)}</ol>
          </article>
        ))}
        {filtered.length === 0 ? <div className="panel px-5 py-16 text-center"><p className="font-black text-neutral-950">조건에 맞는 URL 진단 로그가 없습니다.</p><p className="mt-2 text-sm text-neutral-500">검색 또는 실행 결과 필터 조건을 바꿔 주세요.</p></div> : null}
      </section>
    </div>
  );
}
