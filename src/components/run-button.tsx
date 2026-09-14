"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type RunProgress = {
  id: string;
  status: string;
  totalCount: number;
  processedCount: number;
  changedCount: number;
  failureCount: number;
  pendingCount: number;
  errorMessage: string | null;
};

const TERMINAL = new Set(["COMPLETED", "COMPLETED_WITH_ERRORS", "FAILED"]);

export function RunButton({
  targetIds,
  compact = false,
  initialRunId,
}: {
  targetIds?: string[];
  compact?: boolean;
  initialRunId?: string | null;
}) {
  const router = useRouter();
  const [runId, setRunId] = useState(initialRunId ?? null);
  const [progress, setProgress] = useState<RunProgress | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/runs/${runId}`, { cache: "no-store" });
        if (!response.ok) throw new Error("실행 상태를 확인하지 못했습니다.");
        const current = (await response.json()) as RunProgress;
        if (cancelled) return;
        setProgress(current);
        if (TERMINAL.has(current.status)) {
          setRunId(null);
          router.refresh();
          return;
        }
        timerRef.current = setTimeout(poll, 1200);
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "상태 확인 오류");
      }
    };
    void poll();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [router, runId]);

  async function start() {
    setMessage(null);
    const response = await fetch("/api/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(targetIds?.length ? { targetIds } : {}),
    });
    const body = (await response.json()) as { runId?: string; error?: string };
    if (!response.ok || !body.runId) {
      setMessage(body.error ?? "검사를 시작하지 못했습니다.");
      return;
    }
    setProgress(null);
    setRunId(body.runId);
  }

  const running = Boolean(runId);
  return (
    <div className={compact ? "inline-flex flex-col items-end gap-1" : "flex flex-col items-end gap-2"}>
      <button
        type="button"
        onClick={start}
        disabled={running}
        className={compact ? "button-secondary px-3 py-2 text-xs" : "button-primary"}
      >
        {running ? `검사 중 ${progress ? `${progress.processedCount}/${progress.totalCount}` : "…"}` : compact ? "이 항목 검사" : "지금 전체 검사"}
      </button>
      {message ? <p className="max-w-64 text-right text-xs font-medium text-rose-700">{message}</p> : null}
    </div>
  );
}
