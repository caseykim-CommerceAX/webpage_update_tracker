import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Webpage Update Tracker",
  description: "KB국민카드 웹페이지 업데이트 모니터링 대시보드",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <AppHeader />
        <main className="mx-auto max-w-[1480px] px-5 py-8 lg:px-8 lg:py-10">{children}</main>
        <footer className="mx-auto max-w-[1480px] px-5 pb-8 text-xs font-medium text-slate-400 lg:px-8">Local PoC · 매일 09:00 Asia/Seoul</footer>
      </body>
    </html>
  );
}
