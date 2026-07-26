import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.join(process.cwd(), '.playwright-audit');

test.describe('Visual audit — local UI changes', () => {
  test.beforeAll(() => {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  });

  test('homepage has new design system markers', async ({ page, baseURL }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('html')).toHaveClass(/bricolage/i);
    await expect(page.getByText('India · SBI · UPI freeze cases')).toBeVisible();
    await expect(page.locator('.u-btn-primary')).toBeVisible();
    await expect(page.locator('.font-display').first()).toBeVisible();

    await page.screenshot({ path: path.join(OUT_DIR, '01-home.png'), fullPage: true });
    console.log(`AUDIT_URL=${baseURL}/`);
    console.log(`AUDIT_SCREENSHOT=${path.join(OUT_DIR, '01-home.png')}`);
  });

  test('guest report has guided intake stepper', async ({ page, baseURL }) => {
    await page.goto('/start');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Quick freeze report')).toBeVisible();
    await expect(page.getByText('Guided intake')).toBeVisible();
    await expect(page.getByText('You stay in control', { exact: true })).toBeVisible();

    await page.screenshot({ path: path.join(OUT_DIR, '02-guest-report.png'), fullPage: true });
    console.log(`AUDIT_URL=${baseURL}/start`);
  });

  test('cases page has card pipeline layout', async ({ page, baseURL }) => {
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'My cases' })).toBeVisible();
    await expect(page.getByText('Your pipeline')).toBeVisible();

    await page.screenshot({ path: path.join(OUT_DIR, '03-cases.png'), fullPage: true });
    console.log(`AUDIT_URL=${baseURL}/cases`);
  });
});