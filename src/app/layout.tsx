import type { Metadata, Viewport } from "next";
import { AppHeader } from "@/components/app-header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Webpage Update Tracker",
    template: "%s | Webpage Update Tracker",
  },
  description: "KB국민카드 웹페이지 업데이트 모니터링 대시보드",
};

export const viewport: Viewport = {
  themeColor: "#f7f7f8",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <a href="#main-content" className="skip-link">본문으로 건너뛰기</a>
        <AppHeader />
        <main id="main-content" className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">{children}</main>
        <footer className="mt-8 border-t border-neutral-300 bg-white">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-1 px-4 py-6 text-xs font-medium text-neutral-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <span>로컬 모니터링 PoC</span>
            <span className="tabular-nums">기본 예약 시각 · 매일 09:00 · Asia/Seoul</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
