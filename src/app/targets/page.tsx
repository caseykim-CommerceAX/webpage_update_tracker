import type { Metadata } from "next";
import { TargetManager } from "@/components/target-manager";
import { getTargets } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "대상 및 규칙 관리",
};

export default function TargetsPage() {
  return (
    <div className="space-y-8">
      <header className="border-b border-neutral-950 pb-6">
        <p className="eyebrow">모니터링 설정</p>
        <h1 className="mt-2 text-pretty text-4xl font-black tracking-[-0.045em] text-neutral-950 sm:text-5xl">대상 및 규칙 관리</h1>
        <p className="mt-2 text-sm font-medium text-neutral-600">PC·모바일 URL, 추적 방식, 검사 규칙을 관리합니다.</p>
      </header>
      <TargetManager targets={getTargets()} />
    </div>
  );
}
