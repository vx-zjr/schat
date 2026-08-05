import { expect, test } from '@playwright/test';
import { mockUserApi } from './helpers/mock-api';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('schat.language.v1', 'en-US'));
});

test('opens the MASTER chat without a sidebar', async ({ page }) => {
  await mockUserApi(page);
  await page.goto('http://127.0.0.1:3002');
  await page.locator('#login-username').fill('test');
  await page.locator('#login-password').fill('secret');
  await page.getByRole('button', { name: /handshake/i }).click();
  await expect(page.getByRole('heading', { name: 'master' })).toBeVisible();
  await expect(page.locator('.sidebar-panel,.room-list')).toHaveCount(0);
  await expect(page.locator('body')).toHaveCSS('overflow-x', 'hidden');
});
