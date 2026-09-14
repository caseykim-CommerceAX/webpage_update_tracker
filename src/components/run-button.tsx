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
  initialRunId,
}: {
  initialRunId?: string | null;
}) {
  const router = useRouter();
  const [runId, setRunId] = useState(initialRunId ?? null);
  const [progress, setProgress] = useState<RunProgress | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
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
    setStarting(true);
    try {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = (await response.json()) as { runId?: string; error?: string };
      if (!response.ok || !body.runId) {
        setMessage(body.error ?? "검사를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      setProgress(null);
      setRunId(body.runId);
    } catch {
      setMessage("검사 요청을 보내지 못했습니다. 서버 연결을 확인해 주세요.");
    } finally {
      setStarting(false);
    }
  }

  const running = Boolean(runId) || starting;
  return (
    <div className="flex w-full flex-col items-start gap-2 sm:w-auto">
      <button
        type="button"
        onClick={start}
        disabled={running}
        className="button-primary w-full sm:w-auto"
      >
        {starting ? "진단 준비 중…" : runId ? `진단 중 ${progress ? `${progress.processedCount}/${progress.totalCount}` : "…"}` : "지금 전체 진단"}
      </button>
      <p aria-live="polite" className={`max-w-72 text-xs font-bold text-[#e4002b] ${message ? "block" : "sr-only"}`}>
        {message ?? ""}
      </p>
    </div>
  );
}
