import { test, expect, Page } from "@playwright/test";

function uniqueEmail(prefix = "t") {
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

test.describe("Landing page", () => {
  test("loads with hero and example cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("One purchase.")).toBeVisible();
    await expect(page.getByText("One clear decision.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Start evaluating" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(page.getByText("How it works")).toBeVisible();
  });

  test("example carousel shows MacBook example", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("MacBook Pro 16-inch")).toBeVisible();
    await expect(page.getByText("YES", { exact: true })).toBeVisible();
  });
});

test.describe("Authentication flow", () => {
  test("register page shows form", async ({ page }) => {
    await page.goto("/auth/register");
    await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
    await expect(page.getByLabel("Full name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  });

  test("register lands on dashboard", async ({ page }) => {
    await register(page);
    await expect(page.getByText("Purchase evaluation")).toBeVisible();
  });

  test("login with existing credentials", async ({ page }) => {
    const email = uniqueEmail("login");
    const pw = "testpassword123";

    await page.goto("/auth/register");
    await page.fill("#full_name", "Login Tester");
    await page.fill("#email", email);
    await page.fill("#password", pw);
    await page.fill("#confirm_password", pw);
    await page.click("button[type=submit]");
    await page.waitForURL("/app", { timeout: 15000 });

    await page.click('[aria-label="Sign out"]');
    await page.goto("/auth/login");
    await page.fill("#email", email);
    await page.fill("#password", pw);
    await page.click("button[type=submit]");
    await page.waitForURL("/app", { timeout: 15000 });
    await expect(page.getByText("Purchase evaluation")).toBeVisible();
  });
});

test.describe("Dashboard evaluation", () => {
  test("submits a purchase and shows decision", async ({ page }) => {
    await register(page);

    await page.fill("#purchase_name", "Office Chair");
    await page.fill("#purchase_cost", "500");
    await page.click("text=Evaluate purchase");

    await expect(page.getByText("Purchase cost")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Day 90 balance")).toBeVisible({ timeout: 5000 });
  });

  test("shows validation errors for empty form", async ({ page }) => {
    await register(page);
    await page.waitForTimeout(500);

    // Fill a name that trims to empty but cost that passes HTML5 min="0.01"
    await page.fill("#purchase_name", "   ");
    await page.fill("#purchase_cost", "0.01");
    await page.click("text=Evaluate purchase");

    await expect(page.getByText("Name the purchase")).toBeVisible({ timeout: 10000 });
  });

  test("new evaluation resets to form", async ({ page }) => {
    await register(page);

    await page.fill("#purchase_name", "Desk");
    await page.fill("#purchase_cost", "300");
    await page.click("text=Evaluate purchase");
    await expect(page.getByText("Purchase cost")).toBeVisible({ timeout: 15000 });

    await page.click('[aria-label="New evaluation"]');
    await expect(page.getByText("What to buy")).toBeVisible();
  });
});

test.describe("Settings", () => {
  test("updates company name and reserve", async ({ page }) => {
    await register(page);

    await page.locator('[aria-label="Settings"]').click();
    await page.waitForURL("/settings", { timeout: 10000 });

    await page.locator("#companyName").clear();
    await page.fill("#companyName", "Updated Co");
    await page.locator("#safeReserve").clear();
    await page.fill("#safeReserve", "10000");
    await page.click("text=Save settings");
    await expect(page.getByText("Settings saved")).toBeVisible({ timeout: 5000 });

    // Navigate back and check name updated
    await page.goto("/app");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Updated Co" })).toBeVisible();
  });
});

test.describe("Navigation and auth guards", () => {
  test("unauthenticated user redirected from /app", async ({ page }) => {
    await page.goto("/app");
    await page.waitForURL("/auth/login", { timeout: 10000 });
  });

  test("nav shows sign in links when logged out", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Register" })).toBeVisible();
    await expect(page.getByRole("banner").getByRole("link", { name: "Sign in" })).toBeVisible();
  });

  test("nav shows user name when logged in", async ({ page }) => {
    await register(page);
    await expect(page.getByText("Test User", { exact: true })).toBeVisible();
  });
});
