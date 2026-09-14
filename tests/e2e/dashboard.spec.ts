import { expect, test } from "@playwright/test";

test("대시보드와 주요 관리 화면을 연다", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /페이지의 작은 변화도/ })).toBeVisible();
  await expect(page.getByText("23개 항목 표시")).toBeVisible();
  await page.getByRole("link", { name: "대상 관리" }).click();
  await expect(page.getByRole("heading", { name: "대상 및 규칙 관리" })).toBeVisible();
  await page.getByRole("link", { name: "실행 이력" }).click();
  await expect(page.getByRole("heading", { name: "실행 이력" })).toBeVisible();
});
