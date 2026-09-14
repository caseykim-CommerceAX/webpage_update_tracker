import Link from "next/link";
import { runPill } from "@/components/status-pill";
import { formatDateTime } from "@/lib/format";
import { getRecentRuns } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default function RunsPage() {
  const runs = getRecentRuns(100);
  return (
    <div className="space-y-6">
      <header><p className="eyebrow">RUN HISTORY</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">실행 이력</h1><p className="mt-2 text-sm font-medium text-slate-500">수동 검사와 매일 예약 검사의 결과를 확인합니다.</p></header>
      <section className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">실행 시각</th><th className="px-5 py-3">유형</th><th className="px-5 py-3">상태</th><th className="px-5 py-3">처리</th><th className="px-5 py-3">변경</th><th className="px-5 py-3">실패</th><th className="px-5 py-3"></th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {runs.map((run) => <tr key={run.id} className="hover:bg-slate-50"><td className="px-5 py-4 text-sm font-bold">{formatDateTime(run.startedAt ?? run.createdAt)}</td><td className="px-5 py-4 text-xs font-bold text-slate-500">{run.source === "SCHEDULE" ? "예약" : "수동"}</td><td className="px-5 py-4">{runPill(run.status)}</td><td className="px-5 py-4 text-sm font-extrabold">{run.processedCount}/{run.totalCount}</td><td className="px-5 py-4 text-sm font-extrabold text-violet-700">{run.changedCount}</td><td className="px-5 py-4 text-sm font-extrabold text-rose-700">{run.failureCount}</td><td className="px-5 py-4 text-right"><Link href={`/runs/${run.id}`} className="text-xs font-black text-sky-700 hover:underline">상세 보기</Link></td></tr>)}
            </tbody>
          </table>
        </div>
        {runs.length === 0 ? <div className="py-20 text-center text-sm font-semibold text-slate-500">실행 이력이 없습니다.</div> : null}
      </section>
    </div>
  );
}
