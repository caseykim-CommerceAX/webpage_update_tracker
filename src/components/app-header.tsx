import Link from "next/link";

const navigation = [
  ["대시보드", "/"],
  ["대상 관리", "/targets"],
  ["실행 이력", "/runs"],
] as const;

export function AppHeader() {
  return (
    <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#16382d] text-sm font-black text-white shadow-sm transition-transform group-hover:-rotate-3">WT</span>
          <span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">Commerce AX</span>
            <span className="block text-base font-black tracking-tight text-slate-950">Webpage Update Tracker</span>
          </span>
        </Link>
        <nav aria-label="주요 메뉴" className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {navigation.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-white hover:text-slate-950 hover:shadow-sm">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
