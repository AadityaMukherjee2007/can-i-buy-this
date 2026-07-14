import { test, expect, Page } from "@playwright/test";

function uniqueEmail(prefix = "tx") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
}

async function register(page: Page, email?: string) {
  const pw = "testpassword123";
  await page.goto("/auth/register");
  await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
  await page.fill("#full_name", "Test User");
  await page.fill("#email", email ?? uniqueEmail());
  await page.fill("#password", pw);
  await page.fill("#confirm_password", pw);
  await page.click("button[type=submit]");
  await page.waitForURL("/app", { timeout: 15000 });
  await page.waitForLoadState("networkidle");
}

test.describe("Transactions page", () => {
  test("unauthenticated user redirected", async ({ page }) => {
    await page.goto("/app/transactions");
    await page.waitForURL("/auth/login", { timeout: 10000 });
  });

  test("shows empty state for new user", async ({ page }) => {
    await register(page);
    await page.locator('[aria-label="Transactions"]').click();
    await page.waitForURL("/app/transactions", { timeout: 10000 });
    await expect(page.getByText("No transactions yet")).toBeVisible();
    await expect(page.getByText("Add your first transaction")).toBeVisible();
  });

  test("adds a transaction manually", async ({ page }) => {
    await register(page);
    await page.locator('[aria-label="Transactions"]').click();
    await page.waitForURL("/app/transactions", { timeout: 10000 });

    await page.click("text=Add");
    await expect(page.getByText("Amount (USD)")).toBeVisible();

    await page.fill("input[type=number]", "5000");
    await page.fill('input[type="date"]', "2026-07-10");
    await page.fill('input[placeholder="Invoice payment"]', "Client payment");
    await page.click("text=Add transaction");

    await expect(page.getByText("Transaction added")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("$5,000")).toBeVisible();
  });

  test("deletes a transaction", async ({ page }) => {
    await register(page);
    await page.locator('[aria-label="Transactions"]').click();
    await page.waitForURL("/app/transactions", { timeout: 10000 });

    await page.click("text=Add");
    await page.fill("input[type=number]", "5000");
    await page.fill('input[type="date"]', "2026-07-10");
    await page.fill('input[placeholder="Invoice payment"]', "To delete");
    await page.click("text=Add transaction");
    await expect(page.getByText("Transaction added")).toBeVisible({ timeout: 10000 });

    page.on("dialog", (dialog) => dialog.accept());
    await page.locator('[aria-label="Delete transaction"]').first().click();
    await expect(page.getByText("Transaction deleted")).toBeVisible({ timeout: 10000 });
  });

  test("CSV import button visible", async ({ page }) => {
    await register(page);
    await page.locator('[aria-label="Transactions"]').click();
    await page.waitForURL("/app/transactions", { timeout: 10000 });

    await page.click("text=Import");
    await expect(page.getByText("Upload CSV")).toBeVisible();
  });
});
