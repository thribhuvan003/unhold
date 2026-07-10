import { test, expect } from '@playwright/test';

test.describe('Phase 1 exit path @smoke', () => {
  test('home page loads with legal footer disclaimer', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Unhold' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /bank account frozen/i })).toBeVisible();
    await expect(page.getByText(/not a law firm/i)).toBeVisible();
    await expect(page.getByText(/1930/)).toBeVisible();
  });

  test('legal disclaimer page shows Blocks A–H', async ({ page }) => {
    await page.goto('/legal/disclaimer');
    await expect(page.getByRole('heading', { name: 'Legal disclaimer' })).toBeVisible();
    await expect(page.getByText('Block A')).toBeVisible();
    await expect(page.getByText('Block H')).toBeVisible();
  });

  test('ops queue page requires operator auth', async ({ page }) => {
    await page.goto('/ops/queue');
    await expect(page.getByRole('heading', { name: 'Human ops queue' })).toBeVisible();
    await expect(page.getByText(/Operator JWT required/i)).toBeVisible();
  });

  test('cron tick rejects unauthorized requests', async ({ request }) => {
    const response = await request.post('/api/v1/internal/cron/tick');
    expect(response.status()).toBe(401);
  });
});