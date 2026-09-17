import { expect, test } from "@playwright/test";

test("대시보드와 주요 관리 화면을 연다", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "페이지 라이브 현황", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "태그 변경 상세" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "페이지별 라이브 현황" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "전체 진단 로그" })).toBeVisible();
  await expect(page.getByText(/대상 \d+개 · URL \d+개 표시/)).toBeVisible();
  await expect(page.getByRole("button", { name: "이 항목 검사" })).toHaveCount(0);
  await page.getByRole("link", { name: "대상 관리" }).click();
  await expect(page.getByRole("heading", { name: "대상 및 규칙 관리" })).toBeVisible();
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
  let runRequested = false;

  await page.route("**/api/runs", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    runRequested = true;
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ runId: "e2e-run", status: "QUEUED" }),
    });
  });
  await page.route("**/api/runs/e2e-run", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      id: "e2e-run",
      status: "RUNNING",
      totalCount: 45,
      processedCount: 3,
      changedCount: 0,
      failureCount: 0,
      pendingCount: 0,
      errorMessage: null,
    }),
  }));

  await page.goto("/");
  await page.getByRole("searchbox", { name: "대상 검색" }).fill("ALL point");
  await expect(page.getByText("대상 1개 · URL 2개 표시")).toBeVisible();

  await page.getByRole("button", { name: "지금 전체 진단" }).click();
  await expect.poll(() => runRequested).toBe(true);
  await expect(page.getByRole("button", { name: "진단 중 3/45" })).toBeDisabled();
});
