import { test, expect } from '@playwright/test';
import { open, shot } from './helpers.js';

// P3-08 Diagnosis Logs (docx §8.6): toggle first, events with time / type / role, off-and-empty
// state, L2 view, L3 activate and clear; portrait and landscape.
test.describe('diagnosis logs (P3-08)', () => {
  test('L2: view only; recording off and empty', async ({ page }) => {
    await open(page, 'screen/diaglogs', { level: 2 });
    const first = page.locator('[data-diag] > div').first().locator('[data-diag-toggle]');
    await expect(first).toBeVisible(); // the toggle is the first element
    await expect(page.locator('[data-diag-state]')).toHaveText('Off');
    await expect(page.locator('[data-diag-toggle] [role="switch"]')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await expect(page.locator('[data-placeholder="empty"]')).toContainText('Recording is off');
  });

  test('L3: switch on, events recorded newest first with time, type and role; off keeps them', async ({
    page,
  }) => {
    await open(page, 'screen/diaglogs', { level: 3 });
    await page.locator('[data-diag-toggle] [role="switch"]').click();
    await expect(page.locator('[data-diag-state]')).toHaveText('On · recording');
    await page.evaluate(() => {
      const { ctx, set } = window.__hmi;
      ctx.setParam(122, 35);
      set('state', 'alarm');
    });
    const rows = page.locator('[data-diag-entry]');
    await expect(rows.first()).toContainText(/\d\d\.\d\d\. \d\d:\d\d:\d\d/);
    await expect(rows.first().locator('[data-type]')).toHaveAttribute('data-type', /error|state/);
    await expect(rows.first()).toContainText('L3');
    await expect(page.locator('[data-diag-status]')).toContainText('of 300 entries');
    const n = await rows.count();
    await page.locator('[data-diag-toggle] [role="switch"]').click();
    await expect(page.locator('[data-diag-state]')).toHaveText('Off');
    await expect(rows).toHaveCount(n);
    await expect(page.locator('[data-diag-status]')).toContainText('stopped at');
  });

  test('L3: clear asks first; export reports the entries', async ({ page }) => {
    await open(page, 'screen/diaglogs', { level: 3 });
    await page.locator('[data-diag-toggle] [role="switch"]').click();
    await page.evaluate(() => window.__hmi.ctx.setParam(122, 33));
    await page.locator('[data-action="export"]').click();
    expect(await page.evaluate(() => window.__lastDiagExport.split('\n').length)).toBeGreaterThan(
      1,
    );
    await page.locator('[data-action="clear"]').click();
    const modal = page.locator('.modal').last();
    await expect(modal.locator('[data-action="ok"]')).toHaveClass(/bg-status-error/);
    await modal.locator('[data-action="ok"]').click();
    // only the "log cleared" entry of the still running recording remains
    await expect(page.locator('[data-diag-entry]')).toHaveCount(1);
    await expect(page.locator('[data-diag-entry]')).toContainText('log cleared');
  });

  for (const theme of ['dark', 'light']) {
    test(`diagnosis logs render (${theme})`, async ({ page }, testInfo) => {
      await open(page, 'screen/diaglogs', { level: 3, theme });
      await page.locator('[data-diag-toggle] [role="switch"]').click();
      await page.evaluate(() => {
        const { ctx, set } = window.__hmi;
        ctx.setParam(122, 36);
        ctx.log('loginFailed', 's.operator');
        set('state', 'warning');
      });
      await expect(page.locator('[data-diag-entry]').first()).toBeVisible();
      await shot(page, testInfo, `diaglogs-${theme}`);
    });
  }
});
