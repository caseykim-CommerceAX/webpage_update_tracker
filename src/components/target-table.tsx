"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckDiagnostics, getCheckDiagnostics, hasCheckIssue } from "@/components/check-diagnostics";
import { availabilityPill, liveStatusPill, StatusPill } from "@/components/status-pill";
import { formatDateTime, formatDuration } from "@/lib/format";
import type { EndpointView, TargetView } from "@/lib/queries";

function enabledEndpoints(target: TargetView) {
  return target.endpoints.filter((endpoint) => endpoint.enabled);
}

function targetState(target: TargetView) {
  const checks = enabledEndpoints(target).map((endpoint) => endpoint.latest).filter(Boolean);
  if (checks.length === 0) return "UNSCANNED";
  if (checks.some((check) => check && (hasCheckIssue(check) || check.liveStatus === "CHECK_REQUIRED" || check.liveStatus === "UNVERIFIED"))) {
    return "CHECK_REQUIRED";
  }
  if (checks.every((check) => check?.liveStatus === "LIVE_COMPLETE")) return "LIVE_COMPLETE";
  return "BEFORE_LIVE";
}

function MarkerPill({ found }: { found: boolean | null | undefined }) {
  if (found === true) return <StatusPill label="확인" tone="green" />;
  if (found === false) return <StatusPill label="없음" tone="red" />;
  return <StatusPill label="미확인" />;
}

function liveStatusAccent(status: string | null | undefined) {
  if (status === "LIVE_COMPLETE") return "border-l-4 border-l-emerald-500";
  if (status === "CHECK_REQUIRED") return "border-l-4 border-l-amber-500";
  if (status === "BEFORE_LIVE") return "border-l-4 border-l-sky-500";
  return "border-l-4 border-l-slate-300";
}

function EndpointLiveSignals({ endpoint, tracked }: { endpoint: EndpointView; tracked: boolean }) {
  if (!tracked) {
    return <p className="text-xs font-medium leading-5 text-neutral-600">HTTP 200 응답으로 라이브를 판정합니다.</p>;
  }

  return (
    <dl className="grid grid-cols-2 gap-3">
      <div className="min-w-0">
        <dt className="mb-1 text-[10px] font-bold text-neutral-500"><code translate="no">HEAD</code> · OG</dt>
        <dd><MarkerPill found={endpoint.latest?.headLiveMarkerFound} /></dd>
      </div>
      <div className="min-w-0">
        <dt className="mb-1 text-[10px] font-bold text-neutral-500"><code translate="no">BODY</code> · 추천 문구</dt>
        <dd><MarkerPill found={endpoint.latest?.bodyLiveMarkerFound} /></dd>
      </div>
    </dl>
  );
}

function EndpointMeta({ endpoint }: { endpoint: EndpointView }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500">
          {endpoint.platform === "DESKTOP" ? "PC" : "Mobile"}
        </span>
        <a href={endpoint.url} target="_blank" rel="noreferrer" className="min-w-0 truncate text-xs font-bold text-neutral-950 underline decoration-neutral-300 underline-offset-4 hover:text-[#e4002b]" title={endpoint.url}>
          {endpoint.url}
        </a>
      </div>
      {endpoint.referenceUrl ? (
        <a href={endpoint.referenceUrl} target="_blank" rel="noreferrer" className="ml-16 mt-1 block w-fit text-[11px] font-medium text-neutral-500 underline underline-offset-4 hover:text-[#e4002b]">
          이전 URL 보기
        </a>
      ) : null}
    </div>
  );
}

export function TargetTable({ targets }: { targets: TargetView[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const categories = useMemo(
    () => Array.from(new Set(targets.map((target) => target.category))).toSorted((a, b) => a.localeCompare(b, "ko-KR")),
    [targets],
  );
  const filtered = useMemo(() => {
    const needle = query.toLocaleLowerCase("ko-KR");
    return targets.filter((target) => {
      const matchesQuery = !needle || `${target.name} ${target.endpoints.map((item) => item.url).join(" ")}`.toLocaleLowerCase("ko-KR").includes(needle);
      return matchesQuery && (category === "ALL" || target.category === category) && (status === "ALL" || targetState(target) === status);
    });
  }, [category, query, status, targets]);
  const endpointCount = filtered.reduce((count, target) => count + enabledEndpoints(target).length, 0);
  const filteredActive = Boolean(query || category !== "ALL" || status !== "ALL");

  return (
    <section className="panel overflow-hidden" aria-labelledby="target-table-title">
      <div className="border-b border-neutral-300 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="eyebrow">라이브 모니터링</p>
            <h2 id="target-table-title" className="mt-2 text-2xl font-black tracking-tight text-neutral-950">페이지별 라이브 현황</h2>
            <p aria-live="polite" className="mt-1 text-sm text-neutral-600">대상 {filtered.length}개 · URL {endpointCount}개 표시</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_180px_160px_auto]">
            <label className="sm:col-span-2 xl:col-span-1">
              <span className="sr-only">대상 검색</span>
              <input
                type="search"
                name="target-search"
                autoComplete="off"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="이름 또는 URL 검색…"
                className="form-input w-full"
              />
            </label>
            <label>
              <span className="sr-only">카테고리 필터</span>
              <select name="target-category" value={category} onChange={(event) => setCategory(event.target.value)} className="form-input w-full">
                <option value="ALL">모든 카테고리</option>
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">상태 필터</span>
              <select name="target-status" value={status} onChange={(event) => setStatus(event.target.value)} className="form-input w-full">
                <option value="ALL">모든 상태</option>
                <option value="LIVE_COMPLETE">라이브 완료</option>
                <option value="CHECK_REQUIRED">체크 필요</option>
                <option value="BEFORE_LIVE">라이브 전</option>
                <option value="UNSCANNED">미검사</option>
              </select>
            </label>
            <button
              type="button"
              className="button-secondary px-3 py-2 text-xs"
              disabled={!filteredActive}
              onClick={() => { setQuery(""); setCategory("ALL"); setStatus("ALL"); }}
            >
              필터 초기화
            </button>
          </div>
        </div>
      </div>

      <div className="hidden lg:block">
        <table className="w-full table-fixed border-collapse text-left">
          <caption className="sr-only">대상별 PC·모바일 최신 라이브 상태</caption>
          <colgroup>
            <col className="w-[21%]" />
            <col className="w-[31%]" />
            <col className="w-[20%]" />
            <col className="w-[28%]" />
          </colgroup>
          <thead className="border-b border-neutral-300 bg-neutral-100 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-600">
            <tr>
              <th scope="col" className="px-5 py-3">대상</th>
              <th scope="col" className="px-5 py-3">채널 / URL</th>
              <th scope="col" className="px-5 py-3">라이브 신호</th>
              <th scope="col" className="px-5 py-3">라이브 상태 / 일자</th>
            </tr>
          </thead>
          <tbody>
            {filtered.flatMap((target) => {
              const endpoints = enabledEndpoints(target);
              return endpoints.map((endpoint, index) => {
                const diagnosticIssue = endpoint.latest ? hasCheckIssue(endpoint.latest) : false;
                const needsAttention = diagnosticIssue
                  || endpoint.latest?.liveStatus === "CHECK_REQUIRED"
                  || endpoint.latest?.liveStatus === "UNVERIFIED";
                return (
                  <tr key={endpoint.id} className={`border-b border-neutral-300 align-top ${liveStatusAccent(endpoint.latest?.liveStatus)} ${needsAttention ? "bg-neutral-50" : "bg-white hover:bg-neutral-100"}`}>
                    {index === 0 ? (
                      <th scope="rowgroup" rowSpan={endpoints.length} className="border-r border-neutral-300 px-5 py-5 font-normal">
                        <div className="flex items-start gap-3">
                          <span className="tabular-nums grid size-9 shrink-0 place-items-center border border-neutral-400 text-xs font-black text-neutral-700">{target.displayOrder}</span>
                          <div className="min-w-0">
                            <p className="font-black text-neutral-950">{target.name}</p>
                            <p className="mt-1 text-xs font-medium text-neutral-500">{target.category} · {target.monitorMode === "CONTENT" ? "태그 판정" : "HTTP 판정"}</p>
                          </div>
                        </div>
                      </th>
                    ) : null}
                    <td className="px-5 py-5"><EndpointMeta endpoint={endpoint} /></td>
                    <td className="px-5 py-5"><EndpointLiveSignals endpoint={endpoint} tracked={target.monitorMode === "CONTENT"} /></td>
                    <td className="px-5 py-5">
                      <div className="flex flex-wrap gap-2">
                        {liveStatusPill(endpoint.latest?.liveStatus)}
                        {availabilityPill(endpoint.latest?.availabilityStatus)}
                      </div>
                      <p className="tabular-nums mt-3 text-xs font-bold text-neutral-700">라이브 일자 · {formatDateTime(endpoint.liveCompletedAt)}</p>
                      <p className="tabular-nums mt-1 text-[11px] text-neutral-500">최근 검사 {formatDateTime(endpoint.latest?.createdAt)} · HTTP {endpoint.latest?.httpStatus ?? "—"} · {formatDuration(endpoint.latest?.responseMs)}</p>
                      {endpoint.latest && diagnosticIssue ? (
                        <details className="mt-3 border border-neutral-300 bg-white">
                          <summary className="cursor-pointer px-3 py-2 text-xs font-black text-[#e4002b] underline decoration-[#e4002b] underline-offset-4">
                            실패 원인 {getCheckDiagnostics(endpoint.latest).length}건 보기
                          </summary>
                          <div className="border-t border-neutral-300"><CheckDiagnostics check={endpoint.latest} compact /></div>
                          <Link href={`/runs/${endpoint.latest.runId}#check-${endpoint.latest.checkId}`} className="text-link mx-4 mb-3 mt-1 inline-block text-xs">실패 상세 보기</Link>
                        </details>
                      ) : endpoint.latest ? (
                        <Link href={`/runs/${endpoint.latest.runId}#check-${endpoint.latest.checkId}`} className="text-link mt-3 inline-block text-xs">검사 상세 보기</Link>
                      ) : null}
                    </td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-neutral-300 lg:hidden">
        {filtered.map((target) => {
          const endpoints = enabledEndpoints(target);
          return (
            <article key={target.id} className="bg-white p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="tabular-nums grid size-9 shrink-0 place-items-center border border-neutral-400 text-xs font-black text-neutral-700">{target.displayOrder}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-black text-neutral-950">{target.name}</h3>
                  <p className="mt-1 text-xs font-medium text-neutral-500">{target.category} · {target.monitorMode === "CONTENT" ? "태그 판정" : "HTTP 판정"}</p>
                </div>
              </div>
              <div className="mt-5 divide-y divide-neutral-300 border-y border-neutral-300">
                {endpoints.map((endpoint) => {
                  const diagnosticIssue = endpoint.latest ? hasCheckIssue(endpoint.latest) : false;
                  return (
                    <section key={endpoint.id} className={`my-2 py-4 pl-3 ${liveStatusAccent(endpoint.latest?.liveStatus)}`}>
                      <EndpointMeta endpoint={endpoint} />
                      <div className="mt-4"><EndpointLiveSignals endpoint={endpoint} tracked={target.monitorMode === "CONTENT"} /></div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {liveStatusPill(endpoint.latest?.liveStatus)}
                        {availabilityPill(endpoint.latest?.availabilityStatus)}
                      </div>
                      <p className="tabular-nums mt-4 text-xs font-bold text-neutral-700">라이브 일자 · {formatDateTime(endpoint.liveCompletedAt)}</p>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="tabular-nums font-bold text-neutral-600">최근 검사 {formatDateTime(endpoint.latest?.createdAt)} · HTTP {endpoint.latest?.httpStatus ?? "—"} · {formatDuration(endpoint.latest?.responseMs)}</span>
                        {endpoint.latest ? <Link href={`/runs/${endpoint.latest.runId}#check-${endpoint.latest.checkId}`} className="text-link">{diagnosticIssue ? "실패 상세 보기" : "검사 상세 보기"}</Link> : null}
                      </div>
                      {endpoint.latest && diagnosticIssue ? (
                        <details className="mt-3 border border-neutral-300 bg-white">
                          <summary className="cursor-pointer px-3 py-2 text-xs font-black text-[#e4002b] underline decoration-[#e4002b] underline-offset-4">
                            실패 원인 {getCheckDiagnostics(endpoint.latest).length}건 보기
                          </summary>
                          <div className="border-t border-neutral-300"><CheckDiagnostics check={endpoint.latest} compact /></div>
                        </details>
                      ) : null}
                    </section>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="px-5 py-16 text-center">
          <p className="font-black text-neutral-950">조건에 맞는 항목이 없습니다.</p>
          <p className="mt-2 text-sm text-neutral-500">검색어나 필터 조건을 바꿔 주세요.</p>
        </div>
      ) : null}
    </section>
  );
}
