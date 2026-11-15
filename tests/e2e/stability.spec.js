import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { MODULES, openLocalTestApp, addLocalTestRecord } from './helpers.js';

test('nightly 90-minute module navigation and LocalStorage soak test @stability', async ({ page }, testInfo) => {
  const durationMinutes = Math.max(1, Number(process.env.STABILITY_DURATION_MINUTES || 90));
  const cycleDelayMs = Math.max(250, Number(process.env.STABILITY_CYCLE_DELAY_MS || 5000));
  test.setTimeout((durationMinutes + 5) * 60 * 1000);

  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  const startedAt = new Date();
  const startedMs = Date.now();
  let cycles = 0;
  let navigationChecks = 0;
  let storageAudits = 0;
  let invalidPartitions = [];

  try {
    await openLocalTestApp(page);
    for (const module of MODULES) {
      await addLocalTestRecord(page, module, `soak-fixture-${module.id}`);
    }

    const deadline = startedMs + durationMinutes * 60 * 1000;
    while (Date.now() < deadline) {
      for (const module of MODULES) {
        await page.locator(`#module-${module.id}`).click();
        await expect(page.locator(`#module-${module.id}`)).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('#app-shell')).toBeVisible();
        navigationChecks++;

        const audit = await page.evaluate(keys => {
          const invalid = [];
          const counts = {};
          for (const { id, key } of keys) {
            const raw = localStorage.getItem(key);
            try {
              const parsed = raw ? JSON.parse(raw) : null;
              if (parsed && (!Array.isArray(parsed.plans) || parsed.schemaVersion !== 1)) invalid.push(id);
              counts[id] = parsed?.plans?.length || 0;
            } catch {
              invalid.push(id);
            }
          }
          return { invalid, counts };
        }, MODULES);
        invalidPartitions = audit.invalid;
        expect(audit.invalid, 'all module LocalStorage partitions must remain valid JSON/schema').toEqual([]);
        storageAudits++;
      }

      cycles++;
      await page.waitForTimeout(cycleDelayMs);
    }
  } finally {
    const endedAt = new Date();
    const summary = {
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      requestedDurationMinutes: durationMinutes,
      actualDurationSeconds: Math.round((Date.now() - startedMs) / 1000),
      cycles,
      navigationChecks,
      storageAudits,
      pageErrors,
      invalidPartitions,
      cloudMode: 'mocked login only; all other Supabase requests blocked',
      result: pageErrors.length === 0 && invalidPartitions.length === 0 ? 'completed-without-browser-errors' : 'errors-detected'
    };

    fs.mkdirSync('test-results', { recursive: true });
    fs.writeFileSync('test-results/nightly-stability-summary.json', JSON.stringify(summary, null, 2));
    await testInfo.attach('nightly-stability-summary.json', {
      body: Buffer.from(JSON.stringify(summary, null, 2)),
      contentType: 'application/json'
    });
  }

  expect(pageErrors, 'uncaught browser JavaScript errors').toEqual([]);
  expect(invalidPartitions, 'invalid LocalStorage partitions').toEqual([]);
});
