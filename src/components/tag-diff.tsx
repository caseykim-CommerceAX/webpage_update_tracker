import { getTokenSection } from "@/lib/tracker/canonicalize";
import type { CanonicalToken, DocumentSection, StructuredDiff } from "@/lib/tracker/types";

const tokenLabels: Record<CanonicalToken["kind"], string> = {
  title: "<title>",
  meta: "<meta>",
  heading: "제목 태그",
  text: "본문 태그",
  link: "<a>",
  image: "<img>",
};

function sectionItems(diff: StructuredDiff, section: DocumentSection) {
  return {
    added: diff.added.filter((item) => getTokenSection(item) === section),
    removed: diff.removed.filter((item) => getTokenSection(item) === section),
  };
}

export function TagDiff({ diff }: { diff: StructuredDiff }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {(["HEAD", "BODY"] as const).map((section) => {
        const items = sectionItems(diff, section);
        const total = items.added.length + items.removed.length;
        return (
          <section key={section} aria-label={`${section} 태그 변경`} className="min-w-0 border border-neutral-300 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-neutral-300 bg-neutral-100 px-4 py-3">
              <h3 className="font-black text-neutral-950">
                <code translate="no">{section}</code> 태그
              </h3>
              <span className="tabular-nums text-xs font-black text-neutral-600">{total}건</span>
            </div>
            {total ? (
              <div className="grid sm:grid-cols-2">
                <TagList title="삭제" items={items.removed} tone="removed" />
                <TagList title="추가" items={items.added} tone="added" />
              </div>
            ) : (
              <p className="px-4 py-6 text-sm font-medium text-neutral-500">이 섹션에는 변경이 없습니다.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function TagList({ title, items, tone }: { title: string; items: CanonicalToken[]; tone: "added" | "removed" }) {
  return (
    <section className="min-w-0 border-neutral-300 sm:border-r sm:last:border-r-0">
      <h4 className={`border-b border-neutral-300 px-3 py-2 text-xs font-black ${tone === "removed" ? "text-[#e4002b]" : "text-neutral-950"}`}>
        {title} {items.length}
      </h4>
      <div className="max-h-72 overflow-auto">
        {items.length ? items.map((item, index) => (
          <div key={`${item.kind}-${item.key}-${index}`} className="border-b border-neutral-200 px-3 py-2 text-xs last:border-b-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <code translate="no" className="shrink-0 font-black text-neutral-700">{tokenLabels[item.kind]}</code>
              <code translate="no" className="break-all text-[11px] text-neutral-500">{item.key}</code>
            </div>
            <p className="mt-1 break-words leading-5 text-neutral-800">{item.value}</p>
          </div>
        )) : <p className="p-3 text-xs text-neutral-500">없음</p>}
      </div>
    </section>
  );
}
