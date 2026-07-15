import { test, expect } from "@playwright/test";

test.describe("Phase 1 exit path @smoke", () => {
  test("home page loads with legal footer disclaimer", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Unhold" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /bank account restricted/i }),
    ).toBeVisible();
    // Footer is the stable legal anchor (founder strip also mentions "not a law firm").
    await expect(
      page.getByRole("contentinfo").getByText(/not a law firm/i),
    ).toBeVisible();
    // Multiple tel:1930 links (header / body / footer) — assert footer link only.
    await expect(
      page.getByRole("contentinfo").getByRole("link", { name: "1930" }),
    ).toBeVisible();
  });

  test("legal disclaimer page shows Blocks A–H", async ({ page }) => {
    await page.goto("/legal/disclaimer");
    await expect(
      page.getByRole("heading", { name: "Legal disclaimer" }),
    ).toBeVisible();
    // UI shows plain-language section titles, not "Block A" labels.
    await expect(
      page.getByRole("heading", { name: "Not a law firm or bank" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Human review" }),
    ).toBeVisible();
  });

  test("ops queue page requires operator auth", async ({ page }) => {
    await page.goto("/ops/queue");
    await expect(
      page.getByRole("heading", { name: "Human ops queue" }),
    ).toBeVisible();
    await expect(page.getByText(/Operator JWT required/i)).toBeVisible();
  });

  test("cron tick rejects unauthorized requests", async ({ request }) => {
    const response = await request.post("/api/v1/internal/cron/tick");
    expect(response.status()).toBe(401);
  });
});
