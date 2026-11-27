import { test as base, expect } from '@playwright/test';
import { openLocalTestApp } from './helpers.js';

// Provides a reusable authenticated browser session backed only by mocked auth.
// All non-login Supabase REST requests are blocked by installCloudIsolation().
export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    await openLocalTestApp(page);
    await use(page);
  }
});

export { expect };
