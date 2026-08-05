import { expect, test } from '@playwright/test';
import { mockAdminApi } from './helpers/mock-api';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('schat.language.v1', 'en-US'));
});

test('uses compact navigation below 1024px and restores the desktop layout', async ({ page }, testInfo) => {
  await mockAdminApi(page);
  await page.goto('http://127.0.0.1:3001');
  await page.locator('input[type="text"]').fill('master');
  await page.locator('input[type="password"]').fill('secret');
  await page.getByRole('button', { name: /sign in/i }).click();

  if (testInfo.project.name !== 'desktop') {
    await expect(page.locator('.desktop-sidebar')).toBeHidden();
    await expect(page.locator('.compact-bottom-nav')).toBeVisible();
    for (const destination of ['Active Chats', 'User Directory', 'Ban Records', 'Tools']) {
      await page.getByRole('button', { name: destination }).last().click();
      await expect(page.getByRole('heading', { name: /Live Chat|Users Control|Bans Control|GeoIP Control/ })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Active Chats' }).last().click();
    await page.getByRole('button', { name: /Rooms: direct-1/ }).click();
    await expect(page.locator('.chat-dashboard')).toHaveClass(/has-active-conversation/);
    await expect(page.locator('.chat-rooms')).toBeHidden();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.locator('.chat-rooms')).toBeVisible();
  } else {
    await expect(page.locator('.desktop-sidebar')).toBeVisible();
    await expect(page.locator('.compact-bottom-nav')).toBeHidden();
    await expect(page.locator('.chat-rooms')).toBeVisible();
    await expect(page.locator('.chat-window-panel')).toBeVisible();
  }
});
