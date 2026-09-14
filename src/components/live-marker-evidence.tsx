import { StatusPill } from "@/components/status-pill";

type MarkerEvidenceProps = {
  headFound: boolean | null;
  bodyFound: boolean | null;
  headHtml: string | null;
  bodyHtml: string | null;
};

function Evidence({
  label,
  description,
  found,
  html,
}: {
  label: string;
  description: string;
  found: boolean | null;
  html: string | null;
}) {
  return (
    <section className="min-w-0 border-b border-r border-neutral-300 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-neutral-500">{label}</p>
          <p className="mt-1 text-xs font-bold text-neutral-700">{description}</p>
        </div>
        <StatusPill
          label={found === true ? "확인" : found === false ? "없음" : "미확인"}
          tone={found === true ? "green" : found === false ? "red" : "gray"}
        />
      </div>
      {html ? (
        <pre className="mt-4 max-h-48 overflow-auto whitespace-pre-wrap break-all border border-neutral-300 bg-neutral-950 p-3 text-[11px] leading-5 text-neutral-100"><code>{html}</code></pre>
      ) : found ? (
        <p className="mt-4 border border-neutral-300 bg-neutral-100 px-3 py-2 text-xs leading-5 text-neutral-600">
          이 과거 진단은 판정값만 보존되어 태그 원문이 없습니다. 다음 진단부터 실제 원문이 저장됩니다.
        </p>
      ) : null}
    </section>
  );
}

export function LiveMarkerEvidence({ headFound, bodyFound, headHtml, bodyHtml }: MarkerEvidenceProps) {
  return (
    <div className="grid border-l border-t border-neutral-300 sm:grid-cols-2">
      <Evidence
        label="HEAD · OG 태그"
        description='meta[property="og:site_name"]'
        found={headFound}
        html={headHtml}
      />
      <Evidence
        label="BODY · 추천 문구"
        description='h2에 “이런 분께 추천 드려요” 포함'
        found={bodyFound}
        html={bodyHtml}
      />
    </div>
  );
}
