import Link from "next/link";
import { AppNavigation } from "@/components/app-navigation";

export function AppHeader() {
  return (
    <header className="border-b border-neutral-950 bg-white">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <Link href="/" className="group flex min-w-0 items-center gap-3" aria-label="Webpage Update Tracker 대시보드">
          <span className="grid size-10 shrink-0 place-items-center bg-neutral-950 text-sm font-black text-white transition-colors duration-150 group-hover:bg-[#e4002b]">WT</span>
          <span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#e4002b]">Commerce AX</span>
            <span className="block truncate text-base font-black tracking-tight text-neutral-950">Webpage Update Tracker</span>
          </span>
        </Link>
        <AppNavigation />
      </div>
    </header>
  );
}
