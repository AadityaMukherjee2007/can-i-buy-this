import { test, expect, Page } from "@playwright/test";

function uniqueEmail(prefix = "tx") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
}

async function register(page: Page, email?: string) {
  const pw = "testpassword123";
  await page.goto("/auth/register");
  await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
  await page.fill("#full_name", "Transaction Tester");
  await page.fill("#email", email ?? uniqueEmail());
  await page.fill("#password", pw);
  await page.fill("#confirm_password", pw);
  await page.click("button[type=submit]");
  await page.waitForURL("/app", { timeout: 15000 });
  await page.waitForLoadState("networkidle");
}

test.describe("Seeded transaction data", () => {
  test("dashboard shows Live data badge after evaluation", async ({ page }) => {
    await register(page);

    await page.fill("#purchase_name", "Office Chair");
    await page.fill("#purchase_cost", "500");
    await page.click("text=Evaluate purchase");

    await expect(page.getByText("Live data")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Purchase cost")).toBeVisible();
    await expect(page.getByText("Day 90 balance")).toBeVisible();
  });

  test("subsequent evaluations also show Live data", async ({ page }) => {
    await register(page);

    await page.fill("#purchase_name", "MacBook");
    await page.fill("#purchase_cost", "2500");
    await page.click("text=Evaluate purchase");
    await expect(page.getByText("Live data")).toBeVisible({ timeout: 15000 });

    await page.click('[aria-label="New evaluation"]');
    await expect(page.getByText("What to buy")).toBeVisible();

    await page.fill("#purchase_name", "Desk");
    await page.fill("#purchase_cost", "800");
    await page.click("text=Evaluate purchase");
    await expect(page.getByText("Live data")).toBeVisible({ timeout: 15000 });
  });

  test("evaluation result shows decision badge", async ({ page }) => {
    await register(page);

    await page.fill("#purchase_name", "Small purchase");
    await page.fill("#purchase_cost", "100");
    await page.click("text=Evaluate purchase");

    await expect(page.getByText("Purchase cost")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Day 90 balance")).toBeVisible();
  });

  test("cash gauge shows current position", async ({ page }) => {
    await register(page);

    await expect(page.getByText("Safe reserve")).toBeVisible();
    await expect(page.getByRole("paragraph").filter({ hasText: "$5,000" }).first()).toBeVisible();

    await page.fill("#purchase_name", "Laptop");
    await page.fill("#purchase_cost", "1500");
    await page.click("text=Evaluate purchase");

    await expect(page.getByText("Live data")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Cash position")).toBeVisible({ timeout: 5000 });
  });

  test("small purchases get YES decision", async ({ page }) => {
    await register(page);

    await page.fill("#purchase_name", "Notebooks");
    await page.fill("#purchase_cost", "50");
    await page.click("button[type=submit]");

    await expect(page.getByText("Live data")).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("status").getByText("in reserves")).toBeVisible();
  });

  test("evaluation reason references seeded cash reserves", async ({ page }) => {
    await register(page);

    await page.fill("#purchase_name", "Camera");
    await page.fill("#purchase_cost", "2000");
    await page.click("button[type=submit]");

    await expect(page.getByText("Live data")).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("status").getByText("in reserves")).toBeVisible();
  });
});

test.describe("Settings bank connection UI", () => {
  test("settings page shows bank connection section", async ({ page }) => {
    await register(page);

    await page.locator('[aria-label="Settings"]').click();
    await page.waitForURL("/settings", { timeout: 10000 });

    await expect(page.getByText("Bank connection")).toBeVisible();
    await expect(page.getByText("Connect bank account")).toBeVisible();
  });

  test("settings saves company info and shows bank section", async ({ page }) => {
    await register(page);

    await page.locator('[aria-label="Settings"]').click();
    await page.waitForURL("/settings", { timeout: 10000 });

    await page.locator("#companyName").clear();
    await page.fill("#companyName", "Test Business Inc");
    await page.locator("#safeReserve").clear();
    await page.fill("#safeReserve", "7500");
    await page.click("text=Save settings");
    await expect(page.getByText("Settings saved")).toBeVisible({ timeout: 5000 });

    await expect(page.getByText("Connect bank account")).toBeVisible();
  });

  test("bank connection section shows correct prompt", async ({ page }) => {
    await register(page);

    await page.locator('[aria-label="Settings"]').click();
    await page.waitForURL("/settings", { timeout: 10000 });

    await expect(
      page.getByText("Link a bank account to use real transaction data instead of demo data.")
    ).toBeVisible();
    await expect(page.getByText("Connect bank account")).toBeVisible();
  });
});

test.describe("Salt Edge API endpoints", () => {
  const API = "http://localhost:8000";

  test("GET /api/saltedge/session requires auth", async ({ request }) => {
    const res = await request.get(`${API}/api/saltedge/session`);
    expect(res.status()).toBe(403);
  });

  test("POST /api/saltedge/store-connection requires auth", async ({ request }) => {
    const res = await request.post(`${API}/api/saltedge/store-connection`);
    expect(res.status()).toBe(403);
  });

  test("GET /api/saltedge/transactions requires auth", async ({ request }) => {
    const res = await request.get(`${API}/api/saltedge/transactions`);
    expect(res.status()).toBe(403);
  });

  test("authenticated session returns connect URL", async ({ request }) => {
    const email = uniqueEmail("ses");
    const pw = "testpassword123";

    const regRes = await request.post(`${API}/api/auth/register`, {
      data: { full_name: "Session Tester", email, password: pw, confirm_password: pw },
    });
    expect(regRes.ok()).toBeTruthy();
    const { access_token } = await regRes.json();

    const sessionRes = await request.get(`${API}/api/saltedge/session`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    expect(sessionRes.ok()).toBeTruthy();
    const body = await sessionRes.json();
    expect(body).toHaveProperty("connect_url");
    expect(body.connect_url).toContain("saltedge.com/connect");
  });

  test("authenticated store-connection returns 400 when no bank linked", async ({ request }) => {
    const email = uniqueEmail("sc");
    const pw = "testpassword123";

    const regRes = await request.post(`${API}/api/auth/register`, {
      data: { full_name: "Store Tester", email, password: pw, confirm_password: pw },
    });
    expect(regRes.ok()).toBeTruthy();
    const { access_token } = await regRes.json();

    const storeRes = await request.post(`${API}/api/saltedge/store-connection`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    // No connection exists, should fail
    expect(storeRes.ok()).toBeFalsy();
  });
});

test.describe("Business API", () => {
  const API = "http://localhost:8000";

  test("GET /api/business/me returns business profile", async ({ request }) => {
    const email = uniqueEmail("biz");
    const pw = "testpassword123";

    const regRes = await request.post(`${API}/api/auth/register`, {
      data: { full_name: "Business Tester", email, password: pw, confirm_password: pw },
    });
    expect(regRes.ok()).toBeTruthy();
    const { access_token } = await regRes.json();

    const bizRes = await request.get(`${API}/api/business/me`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    expect(bizRes.ok()).toBeTruthy();
    const biz = await bizRes.json();
    expect(biz).toHaveProperty("company_name");
    expect(biz).toHaveProperty("saltedge_customer_id");
    expect(biz).toHaveProperty("saltedge_connection_id");
  });

  test("GET /api/business/me requires auth", async ({ request }) => {
    const res = await request.get(`${API}/api/business/me`);
    expect(res.status()).toBe(403);
  });

  test("PUT /api/business/me updates business", async ({ request }) => {
    const email = uniqueEmail("upd");
    const pw = "testpassword123";

    const regRes = await request.post(`${API}/api/auth/register`, {
      data: { full_name: "Update Tester", email, password: pw, confirm_password: pw },
    });
    expect(regRes.ok()).toBeTruthy();
    const { access_token } = await regRes.json();

    const putRes = await request.put(`${API}/api/business/me`, {
      headers: { Authorization: `Bearer ${access_token}` },
      data: { company_name: "Updated Biz", min_safe_reserve: 10000 },
    });
    expect(putRes.ok()).toBeTruthy();
    const biz = await putRes.json();
    expect(biz.company_name).toBe("Updated Biz");
    expect(biz.min_safe_reserve).toBe(10000);
  });
});

test.describe("Evaluate endpoint with seeded data", () => {
  const API = "http://localhost:8000";

  test("evaluate returns real data source with seeded transactions", async ({ request }) => {
    const email = uniqueEmail("eval");
    const pw = "testpassword123";

    const regRes = await request.post(`${API}/api/auth/register`, {
      data: { full_name: "Eval Tester", email, password: pw, confirm_password: pw },
    });
    expect(regRes.ok()).toBeTruthy();
    const { access_token } = await regRes.json();

    const evalRes = await request.post(`${API}/api/evaluate`, {
      headers: { Authorization: `Bearer ${access_token}` },
      data: { purchase_name: "Test Item", purchase_cost: 500, recurring_cost: 0, expected_revenue: 0, payment_delay_days: 0 },
    });
    expect(evalRes.ok()).toBeTruthy();
    const result = await evalRes.json();
    expect(result.data_source).toBe("seeded");
    expect(result).toHaveProperty("decision");
    expect(result).toHaveProperty("reason");
    expect(result).toHaveProperty("current_cash");
    expect(result).toHaveProperty("chart_data");
    expect(result).toHaveProperty("without_purchase_trajectory");
    expect(result.current_cash).toBeGreaterThan(0);
    expect(result.chart_data.length).toBe(90);
    expect(result.without_purchase_trajectory.length).toBe(90);
  });

  test("evaluate requires auth", async ({ request }) => {
    const res = await request.post(`${API}/api/evaluate`, {
      data: { purchase_name: "Test", purchase_cost: 100, recurring_cost: 0, expected_revenue: 0, payment_delay_days: 0 },
    });
    expect(res.status()).toBe(403);
  });

  test("evaluate rejects negative costs", async ({ request }) => {
    const email = uniqueEmail("neg");
    const pw = "testpassword123";

    const regRes = await request.post(`${API}/api/auth/register`, {
      data: { full_name: "Neg Tester", email, password: pw, confirm_password: pw },
    });
    expect(regRes.ok()).toBeTruthy();
    const { access_token } = await regRes.json();

    const evalRes = await request.post(`${API}/api/evaluate`, {
      headers: { Authorization: `Bearer ${access_token}` },
      data: { purchase_name: "Bad", purchase_cost: -100, recurring_cost: 0, expected_revenue: 0, payment_delay_days: 0 },
    });
    expect(evalRes.ok()).toBeFalsy();
    expect(evalRes.status()).toBe(422);
  });
});
