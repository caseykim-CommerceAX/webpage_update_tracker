type Tone = "green" | "red" | "amber" | "blue" | "gray" | "violet";

const toneClasses: Record<Tone, string> = {
  green: "bg-emerald-100 text-emerald-950 ring-emerald-500",
  red: "bg-rose-100 text-rose-950 ring-rose-500",
  amber: "bg-amber-100 text-amber-950 ring-amber-500",
  blue: "bg-sky-100 text-sky-950 ring-sky-500",
  gray: "bg-slate-100 text-slate-700 ring-slate-300",
  violet: "bg-violet-100 text-violet-950 ring-violet-500",
};

export function StatusPill({ label, tone = "gray" }: { label: string; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-[11px] font-bold tracking-tight ring-1 ring-inset ${toneClasses[tone]}`}>
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

export function liveStatusPill(status?: string | null) {
  if (status === "LIVE_COMPLETE") return <StatusPill label="라이브 완료" tone="green" />;
  if (status === "CHECK_REQUIRED") return <StatusPill label="체크 필요" tone="amber" />;
  if (status === "BEFORE_LIVE") return <StatusPill label="라이브 전" tone="blue" />;
  if (status === "UNVERIFIED") return <StatusPill label="판정 불가" tone="gray" />;
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
