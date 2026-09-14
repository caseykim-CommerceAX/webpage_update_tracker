"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  ["대시보드", "/"],
  ["대상 관리", "/targets"],
  ["실행 이력", "/runs"],
] as const;

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="주요 메뉴" className="grid grid-cols-3 border border-neutral-300 md:flex">
      {navigation.map(([label, href]) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`border-r border-neutral-300 px-3 py-2.5 text-center text-sm font-bold transition-colors duration-150 last:border-r-0 md:px-5 ${
              active ? "bg-neutral-950 text-white" : "bg-white text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
