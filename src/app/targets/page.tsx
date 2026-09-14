import { TargetManager } from "@/components/target-manager";
import { getTargets } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default function TargetsPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="eyebrow">CONFIGURATION</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">대상 및 규칙 관리</h1><p className="mt-2 text-sm font-medium text-slate-500">PC·모바일 URL과 검사 프리셋을 관리합니다.</p></div>
      </header>
      <TargetManager targets={getTargets()} />
    </div>
  );
}
