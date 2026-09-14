type Tone = "green" | "red" | "amber" | "blue" | "gray" | "violet";

const toneClasses: Record<Tone, string> = {
  green: "bg-white text-neutral-950 ring-neutral-400",
  red: "bg-white text-[#e4002b] ring-[#e4002b]",
  amber: "bg-neutral-100 text-neutral-800 ring-neutral-400",
  blue: "bg-neutral-950 text-white ring-neutral-950",
  gray: "bg-neutral-100 text-neutral-600 ring-neutral-300",
  violet: "bg-white text-neutral-950 ring-neutral-950",
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
