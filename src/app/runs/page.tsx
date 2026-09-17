import type { Metadata } from "next";
import Link from "next/link";
import { runPill } from "@/components/status-pill";
import { formatDateTime } from "@/lib/format";
import { getRecentRuns } from "@/lib/queries";

export const metadata: Metadata = {
  title: "실행 이력",
};

export default function RunsPage() {
  const runs = getRecentRuns(100);
  return (
    <div className="space-y-8">
      <header className="border-b border-neutral-950 pb-6">
        <p className="eyebrow">저장된 검사 기록</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-[-0.045em] text-neutral-950 sm:text-5xl">실행 이력</h1>
            <p className="mt-2 text-sm font-medium text-neutral-600">수동 검사와 예약 검사의 결과를 최근 순서로 확인합니다.</p>
          </div>
          <p className="tabular-nums text-sm font-black text-neutral-700">최근 {runs.length}건</p>
        </div>
      </header>

      <section className="panel overflow-hidden" aria-label="검사 실행 이력">
        <div className="hidden md:block">
          <table className="w-full table-fixed text-left">
            <caption className="sr-only">검사 실행 시각과 처리, 변경, 실패 결과</caption>
            <thead className="border-b border-neutral-300 bg-neutral-100 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-600">
              <tr>
                <th scope="col" className="w-[26%] px-5 py-3">실행 시각</th>
                <th scope="col" className="w-[10%] px-5 py-3">유형</th>
                <th scope="col" className="w-[14%] px-5 py-3">상태</th>
                <th scope="col" className="w-[12%] px-5 py-3">처리</th>
                <th scope="col" className="w-[10%] px-5 py-3">변경</th>
                <th scope="col" className="w-[10%] px-5 py-3">실패</th>
                <th scope="col" className="w-[18%] px-5 py-3 text-right">상세</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="content-auto border-b border-neutral-300 bg-white transition-colors duration-150 last:border-b-0 hover:bg-neutral-100">
                  <td className="tabular-nums px-5 py-4 text-sm font-bold text-neutral-950">{formatDateTime(run.startedAt ?? run.createdAt)}</td>
                  <td className="px-5 py-4 text-xs font-bold text-neutral-600">{run.source === "SCHEDULE" ? "예약" : "수동"}</td>
                  <td className="px-5 py-4">{runPill(run.status)}</td>
                  <td className="tabular-nums px-5 py-4 text-sm font-extrabold">{run.processedCount}/{run.totalCount}</td>
                  <td className="tabular-nums px-5 py-4 text-sm font-extrabold">{run.changedCount}</td>
                  <td className={`tabular-nums px-5 py-4 text-sm font-extrabold ${run.failureCount ? "text-[#e4002b]" : "text-neutral-950"}`}>{run.failureCount}</td>
                  <td className="px-5 py-4 text-right"><Link href={`/runs/${run.id}`} className="text-link text-xs">상세 보기</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-neutral-300 md:hidden">
          {runs.map((run) => (
            <article key={run.id} className="content-auto bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="tabular-nums text-sm font-black text-neutral-950">{formatDateTime(run.startedAt ?? run.createdAt)}</p>
                  <p className="mt-1 text-xs font-bold text-neutral-500">{run.source === "SCHEDULE" ? "예약 검사" : "수동 검사"}</p>
                </div>
                {runPill(run.status)}
              </div>
              <dl className="mt-5 grid grid-cols-3 border-y border-neutral-300">
                <div className="border-r border-neutral-300 py-3"><dt className="text-[10px] font-bold text-neutral-500">처리</dt><dd className="tabular-nums mt-1 font-black">{run.processedCount}/{run.totalCount}</dd></div>
                <div className="border-r border-neutral-300 px-3 py-3"><dt className="text-[10px] font-bold text-neutral-500">변경</dt><dd className="tabular-nums mt-1 font-black">{run.changedCount}</dd></div>
                <div className="px-3 py-3"><dt className="text-[10px] font-bold text-neutral-500">실패</dt><dd className={`tabular-nums mt-1 font-black ${run.failureCount ? "text-[#e4002b]" : ""}`}>{run.failureCount}</dd></div>
              </dl>
              <Link href={`/runs/${run.id}`} className="button-secondary mt-4 w-full px-4 py-2.5 text-sm">실행 상세 보기</Link>
            </article>
          ))}
        </div>

        {runs.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="font-black text-neutral-950">실행 이력이 없습니다.</p>
            <p className="mt-2 text-sm text-neutral-500">대시보드에서 검사를 시작해 주세요.</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
