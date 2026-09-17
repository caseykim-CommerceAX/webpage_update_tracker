import Link from "next/link";
import { RunButton } from "@/components/run-button";
import { runPill } from "@/components/status-pill";
import { TagDiff } from "@/components/tag-diff";
import { TargetTable } from "@/components/target-table";
import { formatDateTime } from "@/lib/format";
import { getCheckHistoryTotal, getRecentRuns, getRunLiveSummary, getRunTagChanges, getTargets } from "@/lib/queries";

export default function DashboardPage() {
  const targets = getTargets();
  const runs = getRecentRuns(50);
  const latestRun = runs.find((run) =>
    !run.targetIdsJson && (run.status === "COMPLETED" || run.status === "COMPLETED_WITH_ERRORS"),
  ) ?? null;
  const monitoredTargets = targets.filter((target) => target.enabled);
  const endpoints = monitoredTargets.flatMap((target) => target.endpoints.filter((endpoint) => endpoint.enabled));
  const liveSummary = latestRun ? getRunLiveSummary(latestRun.id) : null;
  const tagChanges = latestRun ? getRunTagChanges(latestRun.id) : [];
  const checkHistoryTotal = getCheckHistoryTotal();
  const overview = [
    { label: "라이브 완료", value: liveSummary?.liveCompleteCount ?? 0, description: "필수 신호 모두 확인", className: "border-t-4 border-t-emerald-500 bg-emerald-50" },
    { label: "체크 필요", value: liveSummary?.checkRequiredCount ?? 0, description: "필수 신호 1개만 확인", className: "border-t-4 border-t-amber-500 bg-amber-50" },
    { label: "라이브 전", value: liveSummary?.beforeLiveCount ?? 0, description: "필수 신호 미확인", className: "border-t-4 border-t-sky-500 bg-sky-50" },
    { label: "판정 불가", value: liveSummary?.unverifiedCount ?? 0, description: "접속 오류 또는 미검사", className: "border-t-4 border-t-slate-400 bg-slate-50" },
  ];

  return (
    <div className="space-y-8">
      <section className="grid border border-neutral-950 bg-white lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="p-6 sm:p-8 lg:p-10">
          <p className="eyebrow">페이지 라이브 모니터링</p>
          <h1 className="mt-3 max-w-3xl text-pretty text-3xl font-black tracking-[-0.045em] text-neutral-950 sm:text-5xl">
            페이지 라이브 현황
          </h1>
          <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-neutral-600 sm:text-base">
            HEAD의 OG 태그와 BODY의 “이런 분께 추천 드려요” 문구를 확인합니다. 두 신호가 모두 있으면 라이브 완료, 하나만 있으면 체크 필요입니다.
          </p>
          <p className="tabular-nums mt-5 text-xs font-bold text-neutral-500">
            {latestRun ? `최근 완료 · ${formatDateTime(latestRun.completedAt ?? latestRun.createdAt)}` : "아직 완료된 진단이 없습니다."}
          </p>
        </div>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-6 border-t border-neutral-950 bg-neutral-950 p-6 text-white sm:p-8 lg:flex lg:flex-col lg:items-stretch lg:justify-between lg:border-l lg:border-t-0">
          <div>
            <p className="text-xs font-bold text-neutral-400">모니터링 범위</p>
            <p className="tabular-nums mt-2 text-5xl font-black tracking-[-0.06em]">{endpoints.length}</p>
            <p className="mt-1 text-sm font-medium text-neutral-300">PC·모바일 URL</p>
          </div>
          <div className="min-w-0 lg:mt-8">
            <RunButton />
            <p className="mt-3 text-xs font-medium text-neutral-400">예약 진단 · 매일 09:00</p>
          </div>
        </div>
      </section>

      <section aria-label="최근 라이브 진단 요약" className="grid grid-cols-2 border-l border-t border-neutral-300 xl:grid-cols-4">
        {overview.map((item) => (
          <article key={item.label} className={`min-w-0 border-b border-r border-neutral-300 p-4 sm:p-6 ${item.className}`}>
            <p className="text-xs font-extrabold text-neutral-600">{item.label}</p>
            <p className="tabular-nums mt-3 text-3xl font-black tracking-[-0.05em] text-neutral-950 sm:text-4xl">{item.value}</p>
            <p className="mt-2 text-xs font-medium text-neutral-500">{item.description}</p>
          </article>
        ))}
      </section>

      <TargetTable targets={monitoredTargets} />

      <section className="grid border border-neutral-950 bg-neutral-950 text-white lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center" aria-labelledby="check-history-title">
        <div className="p-5 sm:p-6">
          <p className="text-xs font-black text-neutral-400">JSON 저장 이력</p>
          <h2 id="check-history-title" className="mt-2 text-2xl font-black">전체 진단 로그</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-300">
            현재까지 저장된 {checkHistoryTotal.toLocaleString("ko-KR")}건의 URL별 판정과 상태 변화를 조회합니다. 라이브 완료·체크 필요로 바뀐 시점과 당시 실제 태그를 확인할 수 있습니다.
          </p>
        </div>
        <div className="border-t border-neutral-700 p-5 sm:p-6 lg:border-l lg:border-t-0">
          <Link href="/checks" className="button-primary inline-flex w-full justify-center px-5 py-3 text-sm">전체 로그 보기</Link>
        </div>
      </section>

      <section className="panel" aria-labelledby="tag-change-title">
        <div className="flex flex-col gap-3 border-b border-neutral-300 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div>
            <p className="eyebrow">보조 변경 이력</p>
            <h2 id="tag-change-title" className="mt-2 text-2xl font-black tracking-tight text-neutral-950">태그 변경 상세</h2>
            <p className="mt-1 text-sm text-neutral-600">라이브 판정과 별도로, 직전 저장 진단 이후 변경된 HTML을 표시합니다.</p>
          </div>
          {latestRun ? <Link href={`/runs/${latestRun.id}`} className="text-link shrink-0 text-xs">전체 실행 상세 보기</Link> : null}
        </div>

        {tagChanges.length ? (
          <div className="divide-y divide-neutral-300">
            {tagChanges.map((change) => {
              const headTotal = change.headAddedCount + change.headRemovedCount;
              const bodyTotal = change.bodyAddedCount + change.bodyRemovedCount;
              return (
                <article key={change.checkId} className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500">
                        {change.displayOrder}. {change.platform === "DESKTOP" ? "PC" : "Mobile"} · {change.category}
                      </p>
                      <h3 className="mt-1 text-lg font-black text-neutral-950">{change.targetName}</h3>
                      <a href={change.url} target="_blank" rel="noreferrer" className="text-link mt-2 block max-w-full break-all text-xs">{change.url}</a>
                      <p className="tabular-nums mt-3 text-xs font-medium text-neutral-500">
                        {formatDateTime(change.comparedAt)} → {formatDateTime(change.createdAt)} 비교
                      </p>
                    </div>
                    <dl className="grid shrink-0 grid-cols-2 border-l border-t border-neutral-300">
                      <div className="min-w-28 border-b border-r border-neutral-300 px-4 py-3">
                        <dt className="text-[10px] font-black text-neutral-500"><code translate="no">HEAD</code></dt>
                        <dd className="tabular-nums mt-1 text-xl font-black text-neutral-950">{headTotal}</dd>
                      </div>
                      <div className="min-w-28 border-b border-r border-neutral-300 px-4 py-3">
                        <dt className="text-[10px] font-black text-neutral-500"><code translate="no">BODY</code></dt>
                        <dd className="tabular-nums mt-1 text-xl font-black text-neutral-950">{bodyTotal}</dd>
                      </div>
                    </dl>
                  </div>
                  <details className="mt-5 border-t border-neutral-300 pt-4">
                    <summary className="cursor-pointer text-sm font-black text-neutral-950 underline decoration-neutral-400 underline-offset-4 hover:text-[#e4002b]">
                      변경 태그 {headTotal + bodyTotal}건 펼쳐보기
                    </summary>
                    <div className="mt-4"><TagDiff diff={change.diff} /></div>
                  </details>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="p-6 sm:p-8">
            <p className="text-lg font-black text-neutral-950">{latestRun ? "직전 진단 대비 변경된 태그가 없습니다." : "첫 진단을 실행해 기준선을 만들어 주세요."}</p>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              {latestRun ? "변경 없음 결과도 비교 대상 진단과 함께 JSON에 저장되었습니다." : "첫 성공 응답은 변경으로 알리지 않고 다음 비교를 위한 기준선으로 저장합니다."}
            </p>
          </div>
        )}
      </section>

      <section className="grid border border-neutral-300 bg-white lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">최근 실행</p>
              <h2 className="mt-2 text-xl font-black text-neutral-950">진단 저장 상태</h2>
            </div>
            {latestRun ? runPill(latestRun.status) : null}
          </div>
          {latestRun ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                <div><dt className="text-xs font-bold text-neutral-500">완료 시각</dt><dd className="tabular-nums mt-1 text-sm font-extrabold text-neutral-950">{formatDateTime(latestRun.completedAt)}</dd></div>
                <div><dt className="text-xs font-bold text-neutral-500">저장 결과</dt><dd className="tabular-nums mt-1 text-sm font-extrabold text-neutral-950">{latestRun.processedCount}개</dd></div>
                <div><dt className="text-xs font-bold text-neutral-500">태그 변경</dt><dd className="tabular-nums mt-1 text-sm font-extrabold text-neutral-950">{latestRun.changedCount}개 URL</dd></div>
                <div><dt className="text-xs font-bold text-neutral-500">검사 실패</dt><dd className="tabular-nums mt-1 text-sm font-extrabold text-[#e4002b]">{latestRun.failureCount}개</dd></div>
              </dl>
              <Link href={`/runs/${latestRun.id}`} className="button-secondary px-4 py-2.5 text-sm">저장 결과 보기</Link>
            </div>
          ) : (
            <p className="mt-5 text-sm font-medium leading-6 text-neutral-600">아직 저장된 실행 이력이 없습니다.</p>
          )}
        </div>
        <div className="border-t border-neutral-300 bg-neutral-100 p-5 sm:p-6 lg:border-l lg:border-t-0">
          <p className="text-xs font-black text-neutral-700">예약 진단</p>
          <p className="tabular-nums mt-2 text-2xl font-black text-neutral-950">매일 09:00</p>
          <p className="mt-2 text-xs font-medium leading-5 text-neutral-600">GitHub Actions가 직전 성공 진단 JSON을 비교 기준으로 사용합니다.</p>
        </div>
      </section>
    </div>
  );
}
