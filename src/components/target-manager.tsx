"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TargetView } from "@/lib/queries";
import type { Lifecycle, MonitorMode, Platform, RuleType } from "@/lib/db-types";
import { StatusPill } from "@/components/status-pill";

type DraftRule = {
  type: RuleType;
  label: string;
  selector: string;
  attribute: string;
  expectedValue: string;
  expectedStatuses: string;
  enabled: boolean;
};

type Draft = {
  id?: string;
  name: string;
  category: string;
  monitorMode: MonitorMode;
  enabled: boolean;
  desktopUrl: string;
  desktopReference: string;
  desktopLifecycle: Lifecycle;
  mobileUrl: string;
  mobileReference: string;
  mobileLifecycle: Lifecycle;
  rules: DraftRule[];
};

const EMPTY_DRAFT: Draft = {
  name: "",
  category: "신용카드",
  monitorMode: "CONTENT",
  enabled: true,
  desktopUrl: "",
  desktopReference: "",
  desktopLifecycle: "EXISTING",
  mobileUrl: "",
  mobileReference: "",
  mobileLifecycle: "EXISTING",
  rules: [{ type: "HTTP_STATUS", label: "HTTP 200", selector: "", attribute: "", expectedValue: "", expectedStatuses: "200", enabled: true }],
};

function draftFromTarget(target: TargetView): Draft {
  const endpoint = (platform: Platform) => target.endpoints.find((item) => item.platform === platform && item.enabled);
  const desktop = endpoint("DESKTOP");
  const mobile = endpoint("MOBILE");
  return {
    id: target.id,
    name: target.name,
    category: target.category,
    monitorMode: target.monitorMode,
    enabled: target.enabled,
    desktopUrl: desktop?.url ?? "",
    desktopReference: desktop?.referenceUrl ?? "",
    desktopLifecycle: desktop?.lifecycle ?? "EXISTING",
    mobileUrl: mobile?.url ?? "",
    mobileReference: mobile?.referenceUrl ?? "",
    mobileLifecycle: mobile?.lifecycle ?? "EXISTING",
    rules: target.rules.map((rule) => ({
      type: rule.type,
      label: rule.label,
      selector: rule.selector ?? "",
      attribute: rule.attribute ?? "",
      expectedValue: rule.expectedValue ?? "",
      expectedStatuses: rule.expectedStatuses ? (JSON.parse(rule.expectedStatuses) as number[]).join(",") : "200",
      enabled: rule.enabled,
    })),
  };
}

function toPayload(draft: Draft) {
  const endpoints = [
    draft.desktopUrl
      ? { platform: "DESKTOP" as const, url: draft.desktopUrl, referenceUrl: draft.desktopReference || null, lifecycle: draft.desktopLifecycle }
      : null,
    draft.mobileUrl
      ? { platform: "MOBILE" as const, url: draft.mobileUrl, referenceUrl: draft.mobileReference || null, lifecycle: draft.mobileLifecycle }
      : null,
  ].filter(Boolean);
  return {
    name: draft.name,
    category: draft.category,
    monitorMode: draft.monitorMode,
    enabled: draft.enabled,
    endpoints,
    rules: draft.rules.map((rule) => ({
      type: rule.type,
      label: rule.label,
      selector: rule.selector || null,
      attribute: rule.attribute || null,
      expectedValue: rule.expectedValue || null,
      expectedStatuses: rule.type === "HTTP_STATUS" ? rule.expectedStatuses.split(",").map(Number).filter(Number.isFinite) : undefined,
      enabled: rule.enabled,
    })),
  };
}

function blankRule(type: RuleType): DraftRule {
  if (type === "META_ATTRIBUTE") return { type, label: "새 meta 규칙", selector: 'meta[property="og:site_name"]', attribute: "content", expectedValue: "", expectedStatuses: "", enabled: true };
  if (type === "TEXT_CONTAINS") return { type, label: "새 텍스트 규칙", selector: "h2", attribute: "", expectedValue: "", expectedStatuses: "", enabled: true };
  return { type, label: "HTTP 200", selector: "", attribute: "", expectedValue: "", expectedStatuses: "200", enabled: true };
}

export function TargetManager({ targets }: { targets: TargetView[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(nextDraft = draft) {
    if (!nextDraft) return;
    setSaving(true);
    setMessage(null);
    const response = await fetch(nextDraft.id ? `/api/targets/${nextDraft.id}` : "/api/targets", {
      method: nextDraft.id ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(toPayload(nextDraft)),
    });
    const result = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setMessage(result.error ?? "저장하지 못했습니다.");
      return;
    }
    setDraft(null);
    router.refresh();
  }

  function updateRule(index: number, patch: Partial<DraftRule>) {
    setDraft((current) => current ? { ...current, rules: current.rules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, ...patch } : rule) } : current);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_500px]">
      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5">
          <div><p className="eyebrow">TARGET LIBRARY</p><h2 className="mt-1 text-xl font-black">{targets.length}개 모니터링 항목</h2></div>
          <button type="button" className="button-primary" onClick={() => { setMessage(null); setDraft({ ...EMPTY_DRAFT, rules: [...EMPTY_DRAFT.rules] }); }}>새 대상 추가</button>
        </div>
        <div className="divide-y divide-slate-100">
          {targets.map((target) => (
            <article key={target.id} className="flex flex-col gap-4 px-5 py-5 transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-black text-slate-600">{target.displayOrder}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-slate-950">{target.name}</h3>{target.enabled ? <StatusPill label="활성" tone="green" /> : <StatusPill label="비활성" />}</div>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{target.category} · URL {target.endpoints.filter((item) => item.enabled).length}개 · 규칙 {target.rules.length}개</p>
                  <p className="mt-2 max-w-2xl truncate text-xs text-slate-400">{target.endpoints.find((item) => item.platform === "DESKTOP" && item.enabled)?.url}</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" className="button-secondary px-3 py-2 text-xs" onClick={() => { const next = { ...draftFromTarget(target), enabled: !target.enabled }; void save(next); }}>{target.enabled ? "비활성화" : "활성화"}</button>
                <button type="button" className="button-secondary px-3 py-2 text-xs" onClick={() => { setMessage(null); setDraft(draftFromTarget(target)); }}>편집</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="panel h-fit p-5 xl:sticky xl:top-5">
        {draft ? (
          <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div><p className="eyebrow">TARGET EDITOR</p><h2 className="mt-1 text-xl font-black">{draft.id ? "대상 편집" : "새 대상"}</h2></div>
              <button type="button" className="text-sm font-bold text-slate-400 hover:text-slate-700" onClick={() => setDraft(null)}>닫기</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label><span className="form-label">이름</span><input required className="form-input w-full" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
              <label><span className="form-label">카테고리</span><input required className="form-input w-full" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /></label>
              <label><span className="form-label">추적 방식</span><select className="form-input w-full" value={draft.monitorMode} onChange={(e) => setDraft({ ...draft, monitorMode: e.target.value as MonitorMode })}><option value="CONTENT">콘텐츠 + 규칙</option><option value="STATUS_ONLY">HTTP 상태만</option></select></label>
              <label><span className="form-label">사용 여부</span><select className="form-input w-full" value={String(draft.enabled)} onChange={(e) => setDraft({ ...draft, enabled: e.target.value === "true" })}><option value="true">활성</option><option value="false">비활성</option></select></label>
            </div>

            {(["desktop", "mobile"] as const).map((key) => {
              const title = key === "desktop" ? "PC URL" : "모바일 URL (선택)";
              const urlKey = `${key}Url` as const;
              const referenceKey = `${key}Reference` as const;
              const lifecycleKey = `${key}Lifecycle` as const;
              return (
                <fieldset key={key} className="rounded-xl border border-slate-200 p-4">
                  <legend className="px-1 text-xs font-black text-slate-700">{title}</legend>
                  <div className="space-y-3">
                    <label><span className="form-label">현재 URL</span><input type="url" required={key === "desktop"} className="form-input w-full" placeholder="https://" value={draft[urlKey]} onChange={(e) => setDraft({ ...draft, [urlKey]: e.target.value })} /></label>
                    <label><span className="form-label">이전 URL</span><input type="url" className="form-input w-full" placeholder="선택 사항" value={draft[referenceKey]} onChange={(e) => setDraft({ ...draft, [referenceKey]: e.target.value })} /></label>
                    <label><span className="form-label">수명주기</span><select className="form-input w-full" value={draft[lifecycleKey]} onChange={(e) => setDraft({ ...draft, [lifecycleKey]: e.target.value as Lifecycle })}><option value="EXISTING">기존 페이지</option><option value="PRELAUNCH">오픈 대기</option></select></label>
                  </div>
                </fieldset>
              );
            })}

            <fieldset className="space-y-3">
              <div className="flex items-center justify-between"><legend className="text-sm font-black">검사 규칙</legend><div className="flex gap-1"><button type="button" className="button-secondary px-2 py-1 text-[11px]" onClick={() => setDraft({ ...draft, rules: [...draft.rules, blankRule("META_ATTRIBUTE")] })}>+ meta</button><button type="button" className="button-secondary px-2 py-1 text-[11px]" onClick={() => setDraft({ ...draft, rules: [...draft.rules, blankRule("TEXT_CONTAINS")] })}>+ 텍스트</button></div></div>
              {draft.rules.map((rule, index) => (
                <div key={`${index}-${rule.type}`} className="rounded-xl bg-slate-50 p-3">
                  <div className="flex gap-2"><select className="form-input min-w-36" value={rule.type} onChange={(e) => updateRule(index, blankRule(e.target.value as RuleType))}><option value="HTTP_STATUS">HTTP 상태</option><option value="META_ATTRIBUTE">meta 속성</option><option value="TEXT_CONTAINS">텍스트 포함</option></select><input className="form-input min-w-0 flex-1" value={rule.label} onChange={(e) => updateRule(index, { label: e.target.value })} placeholder="규칙 이름" /><button type="button" aria-label="규칙 삭제" className="px-2 font-black text-slate-400 hover:text-rose-600" onClick={() => setDraft({ ...draft, rules: draft.rules.filter((_, itemIndex) => itemIndex !== index) })}>×</button></div>
                  {rule.type === "HTTP_STATUS" ? <label className="mt-2 block"><span className="form-label">허용 상태 코드</span><input className="form-input w-full" value={rule.expectedStatuses} onChange={(e) => updateRule(index, { expectedStatuses: e.target.value })} placeholder="200,204" /></label> : <div className="mt-2 grid gap-2 sm:grid-cols-2"><label><span className="form-label">CSS 선택자</span><input className="form-input w-full" value={rule.selector} onChange={(e) => updateRule(index, { selector: e.target.value })} /></label>{rule.type === "META_ATTRIBUTE" ? <label><span className="form-label">속성</span><input className="form-input w-full" value={rule.attribute} onChange={(e) => updateRule(index, { attribute: e.target.value })} /></label> : null}<label className={rule.type === "TEXT_CONTAINS" ? "sm:col-span-1" : "sm:col-span-2"}><span className="form-label">기대값</span><input className="form-input w-full" value={rule.expectedValue} onChange={(e) => updateRule(index, { expectedValue: e.target.value })} /></label></div>}
                </div>
              ))}
            </fieldset>
            {message ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{message}</p> : null}
            <button type="submit" disabled={saving} className="button-primary w-full">{saving ? "저장 중…" : "변경사항 저장"}</button>
          </form>
        ) : (
          <div className="py-16 text-center"><p className="text-4xl">↖</p><h2 className="mt-4 font-black text-slate-800">편집할 대상을 선택하세요</h2><p className="mt-2 text-sm leading-6 text-slate-500">URL을 바꾸면 기존 Endpoint는 이력과 함께 보존되고 새 기준선이 만들어집니다.</p></div>
        )}
      </aside>
    </div>
  );
}
