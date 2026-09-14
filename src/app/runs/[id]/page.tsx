import Link from "next/link";
import { notFound } from "next/navigation";
import { availabilityPill, changePill, runPill, StatusPill } from "@/components/status-pill";
import { formatDateTime, formatDuration } from "@/lib/format";
import { getRun } from "@/lib/queries";
import type { StructuredDiff, CanonicalToken } from "@/lib/tracker/types";

export const dynamic = "force-dynamic";

const tokenLabels: Record<CanonicalToken["kind"], string> = { title: "제목", meta: "Meta", heading: "제목 문구", text: "본문", link: "링크", image: "이미지" };

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = getRun(id);
  if (!detail) notFound();
  const { run, checks } = detail;
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><Link href="/runs" className="text-xs font-black text-sky-700 hover:underline">← 실행 이력</Link><p className="eyebrow mt-4">RUN DETAIL</p><h1 className="mt-2 text-3xl font-black tracking-tight">{formatDateTime(run.startedAt ?? run.createdAt)} 검사</h1></div>
        {runPill(run.status)}
      </header>
      <section className="grid gap-3 sm:grid-cols-4">
        {[["처리", `${run.processedCount}/${run.totalCount}`], ["변경", run.changedCount], ["실패", run.failureCount], ["오픈 대기", run.pendingCount]].map(([label, value]) => <div key={label} className="panel p-4"><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>)}
      </section>
      <section className="space-y-3">
        {checks.map((check) => {
          const diff = check.diffJson ? JSON.parse(check.diffJson) as StructuredDiff : null;
          return <article key={check.id} className="panel overflow-hidden">
            <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0"><p className="text-xs font-black text-slate-400">{check.displayOrder}. {check.platform === "DESKTOP" ? "PC" : "MOBILE"}</p><h2 className="mt-1 font-black text-slate-950">{check.targetName}</h2><a href={check.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs font-semibold text-sky-700 hover:underline">{check.url}</a></div>
              <div className="flex flex-wrap items-center gap-2">{availabilityPill(check.availabilityStatus)}{changePill(check.changeStatus)}<StatusPill label={`HTTP ${check.httpStatus ?? "—"}`} tone={check.httpStatus === 200 ? "green" : "gray"} /><StatusPill label={formatDuration(check.responseMs)} /></div>
            </div>
            {check.errorMessage ? <p className="mx-5 mb-4 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{check.errorMessage}</p> : null}
            {check.ruleResults.length ? <div className="border-t border-slate-100 px-5 py-4"><p className="mb-3 text-xs font-black text-slate-500">규칙 결과</p><div className="grid gap-2 lg:grid-cols-3">{check.ruleResults.map((rule, index) => <div key={`${rule.ruleLabel}-${index}`} className="rounded-xl bg-slate-50 p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-extrabold">{rule.ruleLabel}</p><StatusPill label={rule.status === "PASS" ? "통과" : rule.status === "FAIL" ? "실패" : rule.status === "SKIPPED" ? "건너뜀" : "오류"} tone={rule.status === "PASS" ? "green" : rule.status === "SKIPPED" ? "gray" : "red"} /></div>{rule.message ? <p className="mt-2 text-[11px] leading-4 text-slate-500">{rule.message}</p> : null}</div>)}</div></div> : null}
            {diff && (diff.added.length || diff.removed.length) ? <details className="border-t border-slate-100 px-5 py-4"><summary className="cursor-pointer text-xs font-black text-violet-700">구조화 변경 상세 · 추가 {diff.added.length} / 삭제 {diff.removed.length}</summary><div className="mt-4 grid gap-4 lg:grid-cols-2"><DiffList title="삭제된 내용" items={diff.removed} tone="removed" /><DiffList title="추가된 내용" items={diff.added} tone="added" /></div></details> : null}
          </article>;
        })}
      </section>
    </div>
  );
}

function DiffList({ title, items, tone }: { title: string; items: CanonicalToken[]; tone: "added" | "removed" }) {
  return <section><h3 className={`text-xs font-black ${tone === "added" ? "text-emerald-700" : "text-rose-700"}`}>{title}</h3><div className="mt-2 max-h-80 space-y-1 overflow-auto">{items.length ? items.map((item, index) => <div key={`${item.kind}-${item.key}-${index}`} className={`rounded-lg px-3 py-2 text-xs ${tone === "added" ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}><span className="mr-2 font-black opacity-60">{tokenLabels[item.kind]}</span><span className="break-all">{item.key}: {item.value}</span></div>) : <p className="text-xs text-slate-400">없음</p>}</div></section>;
}
