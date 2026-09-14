"use client";

import { useMemo, useState } from "react";
import type { TargetView } from "@/lib/queries";
import { formatDateTime, formatDuration } from "@/lib/format";
import { availabilityPill, changePill, StatusPill } from "@/components/status-pill";
import { RunButton } from "@/components/run-button";

function targetState(target: TargetView) {
  const checks = target.endpoints.map((endpoint) => endpoint.latest).filter(Boolean);
  if (checks.length === 0) return "UNSCANNED";
  if (checks.some((check) => check?.availabilityStatus === "ERROR" || check?.availabilityStatus === "UNAVAILABLE" || check?.failedRules)) return "ISSUE";
  if (checks.some((check) => check?.changeStatus === "CHANGED")) return "CHANGED";
  if (checks.some((check) => check?.availabilityStatus === "PENDING")) return "PENDING";
  return "HEALTHY";
}

export function TargetTable({ targets, runActive }: { targets: TargetView[]; runActive: boolean }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const categories = useMemo(() => [...new Set(targets.map((target) => target.category))], [targets]);
  const filtered = useMemo(() => {
    const needle = query.toLocaleLowerCase("ko-KR");
    return targets.filter((target) => {
      const matchesQuery = !needle || `${target.name} ${target.endpoints.map((item) => item.url).join(" ")}`.toLocaleLowerCase("ko-KR").includes(needle);
      return matchesQuery && (category === "ALL" || target.category === category) && (status === "ALL" || targetState(target) === status);
    });
  }, [category, query, status, targets]);

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">MONITORING TARGETS</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">페이지별 최신 상태</h2>
          <p className="mt-1 text-sm text-slate-500">{filtered.length}개 항목 표시 · PC와 모바일은 각각 검사됩니다.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="sr-only" htmlFor="target-search">대상 검색</label>
          <input id="target-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름 또는 URL 검색" className="form-input min-w-56" />
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="form-input" aria-label="카테고리 필터">
            <option value="ALL">모든 카테고리</option>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="form-input" aria-label="상태 필터">
            <option value="ALL">모든 상태</option>
            <option value="HEALTHY">정상</option>
            <option value="CHANGED">변경</option>
            <option value="PENDING">오픈 대기</option>
            <option value="ISSUE">확인 필요</option>
            <option value="UNSCANNED">미검사</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1060px] border-collapse text-left">
          <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-5 py-3">대상</th>
              <th className="px-5 py-3">채널 / URL</th>
              <th className="px-5 py-3">접속</th>
              <th className="px-5 py-3">규칙</th>
              <th className="px-5 py-3">콘텐츠</th>
              <th className="px-5 py-3">최근 검사</th>
              <th className="px-5 py-3 text-right">실행</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((target) => (
              <tr key={target.id} className="align-top transition hover:bg-emerald-50/30">
                <td className="px-5 py-5">
                  <div className="flex items-start gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-black text-slate-600">{target.displayOrder}</span>
                    <div>
                      <p className="font-extrabold text-slate-950">{target.name}</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">{target.category} · {target.monitorMode === "CONTENT" ? "콘텐츠 추적" : "상태 추적"}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-5">
                  <div className="space-y-3">
                    {target.endpoints.filter((endpoint) => endpoint.enabled).map((endpoint) => (
                      <div key={endpoint.id} className="flex items-start gap-2">
                        <span className="mt-0.5 w-12 shrink-0 text-[10px] font-black uppercase tracking-wider text-slate-400">{endpoint.platform === "DESKTOP" ? "PC" : "MOBILE"}</span>
                        <div className="min-w-0">
                          <a href={endpoint.url} target="_blank" rel="noreferrer" className="block max-w-96 truncate text-xs font-semibold text-sky-700 hover:underline" title={endpoint.url}>{endpoint.url}</a>
                          {endpoint.referenceUrl ? <a href={endpoint.referenceUrl} target="_blank" rel="noreferrer" className="mt-1 block text-[11px] text-slate-400 hover:underline">이전 URL 보기</a> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-5">
                  <div className="space-y-2">
                    {target.endpoints.filter((endpoint) => endpoint.enabled).map((endpoint) => <div key={endpoint.id}>{availabilityPill(endpoint.latest?.availabilityStatus)}</div>)}
                  </div>
                </td>
                <td className="px-5 py-5">
                  <div className="space-y-2">
                    {target.endpoints.filter((endpoint) => endpoint.enabled).map((endpoint) => (
                      <div key={endpoint.id}>{endpoint.latest?.failedRules ? <StatusPill label={`${endpoint.latest.failedRules}개 실패`} tone="red" /> : endpoint.latest ? <StatusPill label="통과" tone="green" /> : <StatusPill label="미검사" />}</div>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-5">
                  <div className="space-y-2">
                    {target.endpoints.filter((endpoint) => endpoint.enabled).map((endpoint) => <div key={endpoint.id}>{changePill(endpoint.latest?.changeStatus) ?? <StatusPill label="해당 없음" />}</div>)}
                  </div>
                </td>
                <td className="px-5 py-5">
                  <div className="space-y-2">
                    {target.endpoints.filter((endpoint) => endpoint.enabled).map((endpoint) => (
                      <div key={endpoint.id} className="text-xs text-slate-600">
                        <p className="font-semibold">{formatDateTime(endpoint.latest?.createdAt)}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">HTTP {endpoint.latest?.httpStatus ?? "—"} · {formatDuration(endpoint.latest?.responseMs)}</p>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-5 text-right">
                  {runActive ? <StatusPill label="다른 검사 진행 중" tone="blue" /> : <RunButton compact targetIds={[target.id]} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 ? <div className="px-5 py-16 text-center text-sm font-semibold text-slate-500">조건에 맞는 항목이 없습니다.</div> : null}
    </section>
  );
}
