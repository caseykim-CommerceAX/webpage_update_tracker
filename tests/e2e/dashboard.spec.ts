import { expect, test } from "@playwright/test";

test("대시보드와 주요 관리 화면을 연다", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "페이지 라이브 현황", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "태그 변경 상세" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "페이지별 라이브 현황" })).toBeVisible();
  await expect(page.getByText("이벤트 9월", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("이벤트 10월", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("이전 URL", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "전체 진단 로그" })).toBeVisible();
  await expect(page.getByText(/대상 \d+개 · URL \d+개 표시/)).toBeVisible();
  await expect(page.getByRole("button", { name: "이 항목 검사" })).toHaveCount(0);
  await page.getByRole("link", { name: "대상 관리" }).click();
  await expect(page.getByRole("heading", { name: "진단 대상 설정" })).toBeVisible();
  await expect(page.getByRole("link", { name: "대상 관리" })).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "실행 이력" }).click();
  await expect(page.getByRole("heading", { name: "실행 이력" })).toBeVisible();
  await page.getByRole("link", { name: "진단 로그" }).click();
  await expect(page.getByRole("heading", { name: "URL별 진단 로그" })).toBeVisible();
  await expect(page.getByRole("region", { name: "URL별 진단 실행 결과" })).toBeVisible();
});

test("모바일 화면에서 문서 전체 수평 스크롤이 생기지 않는다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const path of ["/", "/targets", "/runs", "/checks"]) {
    await page.goto(path);
    const viewport = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(viewport.scrollWidth).toBe(viewport.clientWidth);
  }
});

test("대시보드의 클라이언트 기능이 동작한다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: "대상 검색" }).fill("ALL point");
  await expect(page.getByText("대상 1개 · URL 2개 표시")).toBeVisible();
  await expect(page.getByRole("link", { name: "GitHub에서 전체 진단" })).toHaveAttribute(
    "href",
    "https://github.com/example/webpage-update-tracker/actions/workflows/pages.yml",
  );

  await page.goto("/checks/");
  await page.getByRole("searchbox", { name: "대상 또는 URL" }).fill("ALL point");
  await expect(page.getByRole("heading", { name: "ALL point 카드" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "ALL 카드" })).toHaveCount(0);
});
