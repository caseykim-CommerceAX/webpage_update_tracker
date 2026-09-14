import Link from "next/link";
import { RunButton } from "@/components/run-button";
import { TargetTable } from "@/components/target-table";
import { runPill } from "@/components/status-pill";
import { formatDateTime } from "@/lib/format";
import { getRecentRuns, getTargets } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const targets = getTargets();
  const runs = getRecentRuns(5);
  const latestRun = runs[0] ?? null;
  const activeRun = runs.find((run) => run.status === "QUEUED" || run.status === "RUNNING") ?? null;
  const endpoints = targets.flatMap((target) => target.endpoints.filter((endpoint) => endpoint.enabled));
  const latestChecks = endpoints.map((endpoint) => endpoint.latest).filter(Boolean);
  const summary = {
    live: latestChecks.filter((item) => item?.availabilityStatus === "LIVE").length,
    changed: latestChecks.filter((item) => item?.changeStatus === "CHANGED").length,
    pending: latestChecks.filter((item) => item?.availabilityStatus === "PENDING").length,
    issues: latestChecks.filter((item) => item?.availabilityStatus === "ERROR" || item?.availabilityStatus === "UNAVAILABLE" || item?.failedRules).length,
  };

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-3xl bg-[#102b23] px-6 py-8 text-white shadow-xl shadow-emerald-950/10 sm:px-9 sm:py-10">
        <div className="absolute -right-24 -top-24 size-80 rounded-full border-[55px] border-white/5" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300">DAILY WEB MONITORING</p>
            <h1 className="mt-4 text-3xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">페이지의 작은 변화도<br className="hidden sm:block" /> 놓치지 않도록.</h1>
            <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-emerald-50/70">45개 PC·모바일 URL의 접속 상태, 업데이트 규칙, 의미 있는 콘텐츠 변경을 한 번에 확인합니다.</p>
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <RunButton initialRunId={activeRun?.id} />
            <p className="text-xs font-semibold text-emerald-100/60">다음 예약 검사 · 내일 오전 09:00</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["정상 접속", summary.live, "최근 검사에서 HTTP 200", "text-emerald-700"],
          ["변경 감지", summary.changed, "최근 검사 기준", "text-violet-700"],
          ["오픈 대기", summary.pending, "신규 URL 모니터링", "text-amber-700"],
          ["확인 필요", summary.issues, "접속 또는 규칙 실패", "text-rose-700"],
        ].map(([label, value, description, color]) => (
          <article key={label} className="panel p-5">
            <p className="text-xs font-extrabold text-slate-500">{label}</p>
            <p className={`mt-3 text-4xl font-black tracking-tight ${color}`}>{value}</p>
            <p className="mt-2 text-xs font-medium text-slate-400">{description}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <TargetTable targets={targets} runActive={Boolean(activeRun)} />
        <aside className="space-y-5">
          <section className="panel p-5">
            <div className="flex items-start justify-between gap-3">
              <div><p className="eyebrow">LATEST RUN</p><h2 className="mt-1 text-lg font-black text-slate-950">최근 실행</h2></div>
              {latestRun ? runPill(latestRun.status) : null}
            </div>
            {latestRun ? (
              <div className="mt-5 space-y-4">
                <div><p className="text-xs font-bold text-slate-400">시작 시각</p><p className="mt-1 text-sm font-extrabold text-slate-800">{formatDateTime(latestRun.startedAt ?? latestRun.createdAt)}</p></div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold text-slate-400">처리</p><p className="mt-1 font-black">{latestRun.processedCount}/{latestRun.totalCount}</p></div>
                  <div className="rounded-xl bg-violet-50 p-3"><p className="text-[10px] font-bold text-violet-500">변경</p><p className="mt-1 font-black text-violet-800">{latestRun.changedCount}</p></div>
                  <div className="rounded-xl bg-rose-50 p-3"><p className="text-[10px] font-bold text-rose-500">실패</p><p className="mt-1 font-black text-rose-800">{latestRun.failureCount}</p></div>
                </div>
                <Link href={`/runs/${latestRun.id}`} className="button-secondary w-full px-4 py-2.5 text-sm">실행 상세 보기</Link>
              </div>
            ) : <p className="mt-5 text-sm font-medium leading-6 text-slate-500">아직 실행 이력이 없습니다. 전체 검사를 시작해 기준선을 만들어 주세요.</p>}
          </section>
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-xs font-black uppercase tracking-wider text-amber-700">Schedule</p>
            <p className="mt-2 font-extrabold text-amber-950">매일 오전 09:00</p>
            <p className="mt-2 text-xs font-medium leading-5 text-amber-800/70">Windows 작업 스케줄러 등록은 <code className="rounded bg-white/70 px-1 py-0.5">npm run schedule:install</code>로 실행합니다.</p>
          </section>
        </aside>
      </section>
    </div>
  );
}
