"use client";

import { type FormEvent, type ReactNode, useState, useSyncExternalStore } from "react";

const DEFAULT_PASSWORD_DIGEST = "b2b24ac7359f21b8aaf25c3859fe4fc2ed9d551e6c4a0cb5d0d6af95a631e589";
const PASSWORD_DIGEST = process.env.NEXT_PUBLIC_DASHBOARD_PASSWORD_DIGEST ?? DEFAULT_PASSWORD_DIGEST;
const SESSION_KEY = `webpage-update-tracker:access:${PASSWORD_DIGEST.slice(0, 12)}`;
const ACCESS_EVENT = "webpage-update-tracker:access-changed";

type AccessState = "checking" | "locked" | "unlocked";

function subscribeToAccessState(onStoreChange: () => void) {
  window.addEventListener(ACCESS_EVENT, onStoreChange);
  return () => window.removeEventListener(ACCESS_EVENT, onStoreChange);
}

function getAccessState(): AccessState {
  return sessionStorage.getItem(SESSION_KEY) === "granted" ? "unlocked" : "locked";
}

function getServerAccessState(): AccessState {
  return "checking";
}

async function sha256(value: string) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("이 브라우저에서는 암호 확인 기능을 사용할 수 없습니다.");
  }

  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function DashboardAccessGate({ children }: { children: ReactNode }) {
  const accessState = useSyncExternalStore(subscribeToAccessState, getAccessState, getServerAccessState);
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password) {
      setErrorMessage("암호를 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      if ((await sha256(password)) !== PASSWORD_DIGEST) {
        setErrorMessage("암호가 올바르지 않습니다.");
        setPassword("");
        return;
      }

      sessionStorage.setItem(SESSION_KEY, "granted");
      window.dispatchEvent(new Event(ACCESS_EVENT));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "암호를 확인하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (accessState === "unlocked") return children;

  return (
    <main className="swiss-grid grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-md border border-neutral-950 bg-white shadow-[8px_8px_0_#111111]" aria-labelledby="access-title">
        <div className="border-b border-neutral-950 bg-neutral-950 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center bg-[#e4002b] text-sm font-black">WT</span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-300">Commerce AX</p>
              <p className="mt-1 font-black tracking-tight">Webpage Update Tracker</p>
            </div>
          </div>
        </div>

        {accessState === "checking" ? (
          <div className="px-6 py-10 text-center" role="status" aria-live="polite">
            <p className="text-sm font-bold text-neutral-600">접근 권한을 확인하고 있습니다.</p>
          </div>
        ) : (
          <form className="px-6 py-7" onSubmit={handleSubmit}>
            <p className="eyebrow">Restricted dashboard</p>
            <h1 id="access-title" className="mt-2 text-2xl font-black tracking-tight text-neutral-950">대시보드 접근</h1>
            <p className="mt-2 text-sm leading-6 text-neutral-600">계속하려면 접근 암호를 입력해 주세요.</p>

            <label htmlFor="dashboard-password" className="form-label mt-6">암호</label>
            <input
              id="dashboard-password"
              className="form-input w-full"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-describedby={errorMessage ? "access-error" : undefined}
              aria-invalid={errorMessage ? true : undefined}
              disabled={submitting}
            />
            <p id="access-error" className="mt-2 min-h-5 text-sm font-bold text-[#c00024]" role="alert">
              {errorMessage}
            </p>
            <button type="submit" className="button-primary mt-3 w-full" disabled={submitting}>
              {submitting ? "확인 중…" : "대시보드 열기"}
            </button>
            <p className="mt-5 border-t border-neutral-200 pt-4 text-xs leading-5 text-neutral-500">
              브라우저 탭을 닫으면 다음 접속 시 암호를 다시 입력해야 합니다.
            </p>
          </form>
        )}
      </section>
    </main>
  );
}
