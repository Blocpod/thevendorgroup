import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email = "ops@vendorgroup.example", password = "demo-ops") {
  await page.goto("/login");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Enter command center" }).click();
  await expect(page.getByRole("heading", { name: "Command Center" })).toBeVisible();
}

test("simulated Meridian journey blocks, records evidence, and classifies scope", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Projects" }).click();
  await page.getByRole("button", { name: /Corporate and Investor Relations Website Rebuild/ }).click();
  await expect(page.locator(".blocker").getByText("Onboarding evidence packet", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Advance" }).click();
  await expect(page.getByRole("status")).toContainText("Gate blocked");

  await page.getByRole("button", { name: /Complete.*Onboarding evidence packet/ }).click();
  await expect(page.getByRole("status")).toContainText("Requirement completed");

  await page.getByLabel("Request description").fill("Please add an additional ROI calculator under contract");
  await page.getByRole("button", { name: "Classify" }).click();
  await expect(page.getByText("Scope expansion · 90%")).toHaveCount(2);
});

test("viewer cannot create client and mobile command center has no overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "viewer@vendorgroup.example", "demo-viewer");
  await page.getByRole("button", { name: "Clients" }).click();
  await expect(page.getByRole("button", { name: /Client$/ })).toHaveCount(0);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
