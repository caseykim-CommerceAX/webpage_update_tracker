"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
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
  const endpoint = (platform: Platform) => target.endpoints.find(
    (item) => item.platform === platform && item.enabled && item.retiredAt === null,
  );
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
  const editorRef = useRef<HTMLElement | null>(null);

  async function save(nextDraft = draft) {
    if (!nextDraft) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(nextDraft.id ? `/api/targets/${nextDraft.id}` : "/api/targets", {
        method: nextDraft.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(toPayload(nextDraft)),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "저장하지 못했습니다. 입력값을 확인해 주세요.");
        return;
      }
      setDraft(null);
      router.refresh();
    } catch {
      setMessage("저장 요청을 보내지 못했습니다. 서버 연결을 확인해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  function updateRule(index: number, patch: Partial<DraftRule>) {
    setDraft((current) => current ? { ...current, rules: current.rules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, ...patch } : rule) } : current);
  }

  function showEditor(nextDraft: Draft) {
    setMessage(null);
    setDraft(nextDraft);
    window.requestAnimationFrame(() => editorRef.current?.scrollIntoView({ block: "start" }));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,520px)]">
      <section className="panel order-2 overflow-hidden xl:order-1">
        <div className="flex flex-col gap-4 border-b border-neutral-300 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div><p className="eyebrow">등록 대상</p><h2 className="mt-1 text-xl font-black text-neutral-950">{targets.length}개 모니터링 항목</h2></div>
          <button type="button" className="button-primary" onClick={() => showEditor({ ...EMPTY_DRAFT, rules: [...EMPTY_DRAFT.rules] })}>새 대상 추가</button>
        </div>
        <div className="divide-y divide-neutral-300">
          {targets.map((target) => (
            <article key={target.id} className="flex flex-col gap-4 bg-white px-5 py-5 transition-colors duration-150 hover:bg-neutral-100 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex min-w-0 items-start gap-3">
                <span className="tabular-nums grid size-9 shrink-0 place-items-center border border-neutral-400 text-xs font-black text-neutral-700">{target.displayOrder}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-neutral-950">{target.name}</h3>{target.enabled ? <StatusPill label="활성" tone="green" /> : <StatusPill label="비활성" />}</div>
                  <p className="mt-1 text-xs font-semibold text-neutral-500">{target.category} · URL {target.endpoints.filter((item) => item.enabled).length}개 · 보조 규칙 {target.rules.length}개</p>
                  <p className="mt-2 max-w-2xl truncate text-xs text-neutral-500">{target.endpoints.find((item) => item.platform === "DESKTOP" && item.enabled && item.retiredAt === null)?.url}</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" disabled={saving} className="button-secondary px-3 py-2 text-xs" onClick={() => {
                  if (target.enabled && !window.confirm(`${target.name} 항목을 비활성화할까요? 예약 검사에서 제외됩니다.`)) return;
                  const next = { ...draftFromTarget(target), enabled: !target.enabled };
                  void save(next);
                }}>{target.enabled ? "비활성화" : "활성화"}</button>
                <button type="button" className="button-secondary px-3 py-2 text-xs" onClick={() => showEditor(draftFromTarget(target))}>편집</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside ref={editorRef} className="panel order-1 h-fit scroll-mt-6 p-5 sm:p-6 xl:order-2 xl:sticky xl:top-5">
        {draft ? (
          <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div><p className="eyebrow">대상 편집기</p><h2 className="mt-1 text-xl font-black text-neutral-950">{draft.id ? "대상 편집" : "새 대상"}</h2></div>
              <button type="button" className="text-link text-sm" onClick={() => setDraft(null)}>편집 닫기</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label><span className="form-label">이름</span><input required name="target-name" autoComplete="off" className="form-input w-full" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
              <label><span className="form-label">카테고리</span><input required name="target-category" autoComplete="off" className="form-input w-full" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /></label>
              <label><span className="form-label">라이브 판정 방식</span><select name="monitor-mode" className="form-input w-full" value={draft.monitorMode} onChange={(e) => setDraft({ ...draft, monitorMode: e.target.value as MonitorMode })}><option value="CONTENT">HEAD/BODY 라이브 판정 + 변경 이력</option><option value="STATUS_ONLY">HTTP 라이브 판정</option></select></label>
              <label><span className="form-label">사용 여부</span><select name="target-enabled" className="form-input w-full" value={String(draft.enabled)} onChange={(e) => setDraft({ ...draft, enabled: e.target.value === "true" })}><option value="true">활성</option><option value="false">비활성</option></select></label>
            </div>

            {(["desktop", "mobile"] as const).map((key) => {
              const title = key === "desktop" ? "PC URL" : "모바일 URL (선택)";
              const urlKey = `${key}Url` as const;
              const referenceKey = `${key}Reference` as const;
              const lifecycleKey = `${key}Lifecycle` as const;
              return (
                <fieldset key={key} className="border border-neutral-300 p-4">
                  <legend className="px-1 text-xs font-black text-neutral-700">{title}</legend>
                  <div className="space-y-3">
                    <label><span className="form-label">현재 URL</span><input type="url" name={`${key}-url`} autoComplete="off" required={key === "desktop"} className="form-input w-full" placeholder="https://example.com/…" value={draft[urlKey]} onChange={(e) => setDraft({ ...draft, [urlKey]: e.target.value })} /></label>
                    <label><span className="form-label">이전 URL (별도 추적)</span><input type="url" name={`${key}-reference-url`} autoComplete="off" className="form-input w-full" placeholder="입력하면 현재 URL과 함께 진단" value={draft[referenceKey]} onChange={(e) => setDraft({ ...draft, [referenceKey]: e.target.value })} /></label>
                    <label><span className="form-label">수명주기</span><select name={`${key}-lifecycle`} className="form-input w-full" value={draft[lifecycleKey]} onChange={(e) => setDraft({ ...draft, [lifecycleKey]: e.target.value as Lifecycle })}><option value="EXISTING">기존 페이지</option><option value="PRELAUNCH">오픈 대기</option></select></label>
                  </div>
                </fieldset>
              );
            })}

            <fieldset className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><legend className="text-sm font-black">접속 및 보조 정적 규칙</legend><div className="flex flex-wrap gap-2"><button type="button" className="button-secondary px-2 py-1 text-[11px]" onClick={() => setDraft({ ...draft, rules: [...draft.rules, blankRule("META_ATTRIBUTE")] })}>Meta 정적 규칙 추가</button><button type="button" className="button-secondary px-2 py-1 text-[11px]" onClick={() => setDraft({ ...draft, rules: [...draft.rules, blankRule("TEXT_CONTAINS")] })}>텍스트 정적 규칙 추가</button></div></div>
              <p className="text-xs leading-5 text-neutral-600">전일 대비 태그 변경은 별도 설정 없이 자동으로 비교합니다. Meta·텍스트 규칙은 오늘 값 자체가 반드시 충족되어야 하는 경우에만 추가하세요.</p>
              {draft.rules.map((rule, index) => (
                <div key={`${index}-${rule.type}`} className="border border-neutral-300 bg-neutral-100 p-3">
                  <div className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)_auto]"><label><span className="sr-only">규칙 유형</span><select name={`rule-${index}-type`} className="form-input w-full" value={rule.type} onChange={(e) => updateRule(index, blankRule(e.target.value as RuleType))}><option value="HTTP_STATUS">HTTP 상태</option><option value="META_ATTRIBUTE">Meta 속성</option><option value="TEXT_CONTAINS">텍스트 포함</option></select></label><label><span className="sr-only">규칙 이름</span><input name={`rule-${index}-label`} autoComplete="off" className="form-input w-full" value={rule.label} onChange={(e) => updateRule(index, { label: e.target.value })} placeholder="규칙 이름…" /></label><button type="button" className="button-secondary px-3 py-2 text-xs" onClick={() => setDraft({ ...draft, rules: draft.rules.filter((_, itemIndex) => itemIndex !== index) })}>규칙 삭제</button></div>
                  {rule.type === "HTTP_STATUS" ? <label className="mt-2 block"><span className="form-label">허용 상태 코드</span><input name={`rule-${index}-statuses`} inputMode="numeric" autoComplete="off" className="form-input w-full" value={rule.expectedStatuses} onChange={(e) => updateRule(index, { expectedStatuses: e.target.value })} placeholder="예: 200, 204…" /></label> : <div className="mt-2 grid gap-2 sm:grid-cols-2"><label><span className="form-label">CSS 선택자</span><input name={`rule-${index}-selector`} autoComplete="off" spellCheck={false} className="form-input w-full" value={rule.selector} onChange={(e) => updateRule(index, { selector: e.target.value })} /></label>{rule.type === "META_ATTRIBUTE" ? <label><span className="form-label">속성</span><input name={`rule-${index}-attribute`} autoComplete="off" spellCheck={false} className="form-input w-full" value={rule.attribute} onChange={(e) => updateRule(index, { attribute: e.target.value })} /></label> : null}<label className={rule.type === "TEXT_CONTAINS" ? "sm:col-span-1" : "sm:col-span-2"}><span className="form-label">기대값</span><input name={`rule-${index}-expected`} autoComplete="off" className="form-input w-full" value={rule.expectedValue} onChange={(e) => updateRule(index, { expectedValue: e.target.value })} /></label></div>}
                </div>
              ))}
            </fieldset>
            <p aria-live="polite" className={`border border-[#e4002b] bg-white px-3 py-2 text-xs font-bold text-[#e4002b] ${message ? "block" : "sr-only"}`}>{message ?? ""}</p>
            <button type="submit" disabled={saving} className="button-primary w-full">{saving ? "저장 중…" : "변경사항 저장"}</button>
          </form>
        ) : (
          <div className="py-12"><p className="eyebrow">편집 안내</p><h2 className="mt-3 text-xl font-black text-neutral-950">대상을 선택해 설정을 변경하세요.</h2><p className="mt-3 text-sm leading-6 text-neutral-600">URL을 바꾸면 기존 URL도 이전 URL로 계속 진단하고, 새 URL에는 독립된 기준선을 만듭니다.</p></div>
        )}
      </aside>
    </div>
  );
}
