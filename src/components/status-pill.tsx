type Tone = "green" | "red" | "amber" | "blue" | "gray" | "violet";

const toneClasses: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  red: "bg-rose-50 text-rose-700 ring-rose-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/20",
  gray: "bg-slate-100 text-slate-600 ring-slate-500/20",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20",
};

export function StatusPill({ label, tone = "gray" }: { label: string; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold tracking-tight ring-1 ring-inset ${toneClasses[tone]}`}>
      {label}
    </span>
  );
}

export function availabilityPill(status?: string | null) {
  if (status === "LIVE") return <StatusPill label="정상 접속" tone="green" />;
  if (status === "PENDING") return <StatusPill label="오픈 대기" tone="amber" />;
  if (status === "UNAVAILABLE") return <StatusPill label="접속 이상" tone="red" />;
  if (status === "ERROR") return <StatusPill label="검사 오류" tone="red" />;
  return <StatusPill label="미검사" tone="gray" />;
}

export function changePill(status?: string | null) {
  if (status === "CHANGED") return <StatusPill label="변경 감지" tone="violet" />;
  if (status === "BASELINE") return <StatusPill label="기준선 생성" tone="blue" />;
  if (status === "UNCHANGED") return <StatusPill label="변경 없음" tone="gray" />;
  return null;
}

export function runPill(status: string) {
  const map: Record<string, [string, Tone]> = {
    QUEUED: ["대기", "blue"],
    RUNNING: ["검사 중", "blue"],
    COMPLETED: ["완료", "green"],
    COMPLETED_WITH_ERRORS: ["일부 실패", "amber"],
    FAILED: ["실행 실패", "red"],
  };
  const [label, tone] = map[status] ?? [status, "gray"];
  return <StatusPill label={label} tone={tone} />;
}
