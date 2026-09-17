import type { Metadata } from "next";
import { StatusPill } from "@/components/status-pill";
import { getTargets } from "@/lib/queries";

export const metadata: Metadata = {
  title: "진단 대상 설정",
};

export default function TargetsPage() {
  const targets = getTargets();
  return (
    <div className="space-y-8">
      <header className="border-b border-neutral-950 pb-6">
        <p className="eyebrow">JSON 모니터링 설정</p>
        <h1 className="mt-2 text-pretty text-4xl font-black tracking-[-0.045em] text-neutral-950 sm:text-5xl">진단 대상 설정</h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-neutral-600">
          정적 대시보드에서는 설정을 직접 변경하지 않습니다. GitHub의 <code translate="no">data/targets.json</code>을 수정하면 다음 빌드와 진단부터 반영됩니다.
        </p>
      </header>
      <section className="panel overflow-hidden" aria-label="JSON에 등록된 진단 대상">
        <div className="border-b border-neutral-300 bg-neutral-100 px-5 py-4 sm:px-6"><p className="text-sm font-black text-neutral-950">등록 대상 {targets.length}개</p></div>
        <div className="divide-y divide-neutral-300">
          {targets.map((target) => (
            <article key={target.id} className="grid gap-4 bg-white p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tabular-nums grid size-8 place-items-center border border-neutral-400 text-xs font-black">{target.displayOrder}</span>
                  <h2 className="font-black text-neutral-950">{target.name}</h2>
                  <StatusPill label={target.enabled ? "활성" : "비활성"} tone={target.enabled ? "green" : "gray"} />
                  <StatusPill label={target.monitorMode === "CONTENT" ? "HEAD/BODY 판정" : "HTTP 판정"} />
                </div>
                <p className="mt-2 text-xs font-semibold text-neutral-500">{target.category} · 보조 규칙 {target.rules.filter((rule) => rule.enabled).length}개</p>
                <ul className="mt-4 space-y-2">
                  {target.endpoints.map((endpoint) => (
                    <li key={endpoint.id} className="flex min-w-0 flex-col gap-1 border-l-2 border-neutral-300 pl-3 sm:flex-row sm:items-center sm:gap-3">
                      <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.12em] text-neutral-500">{endpoint.platform === "DESKTOP" ? "PC" : "Mobile"} · {endpoint.retiredAt ? "이전 URL" : "현재 URL"}</span>
                      <a href={endpoint.url} target="_blank" rel="noreferrer" className="text-link min-w-0 break-all text-xs">{endpoint.url}</a>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end"><StatusPill label={`URL ${target.endpoints.length}개`} /></div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
