import { test, expect } from '@playwright/test';
import { installCloudIsolation } from './helpers.js';

test('startup chooser opens public admin monitor and routes personal sign-in', async ({ page }) => {
  await installCloudIsolation(page);
  await page.goto('/');

  await expect(page.locator('#entry-screen')).toBeVisible();
  await expect(page.locator('#access-form')).toBeHidden();

  await page.locator('#choose-admin').click();
  await expect(page.locator('#admin-dashboard')).toBeVisible();
  await expect(page.locator('#access-form')).toBeHidden();

  await page.locator('#admin-back-to-entry').click();
  await expect(page.locator('#entry-screen')).toBeVisible();
  await page.locator('#choose-personal').click();
  await expect(page.locator('#access-form')).toBeVisible();

  await page.locator('#gate-key').fill('playwright-test-public-key');
  await page.locator('#gate-password').fill('not-a-real-password');
  await page.locator('#access-form button[type="submit"]').click();
  await expect(page.locator('#app-shell')).toBeVisible();
});
