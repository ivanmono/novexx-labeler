import { test, expect } from '@playwright/test';
import { open, shot, hideDev } from './helpers.js';

// P3-13 User modified Parameters: every settable parameter whose value differs from its default,
// with the screen it lives on and its default; a row opens the editor; empty state.
const rows = (page) => page.locator('[data-list="usermodified"] [data-row]');

test.describe('user modified parameters (P3-13)', () => {
  test('lists the changed parameters with their screen and default', async ({ page }, testInfo) => {
    await open(page, 'screen/usermodified', { level: 3 });
    await hideDev(page);
    const n = await rows(page).count();
    expect(n).toBeGreaterThan(5);
    await expect(page.locator('[data-list-intro]')).toContainText(`${n} parameters differ`);
    const label = page.locator('[data-row="117"]');
    await expect(label).toHaveAttribute('data-changed', 'true');
    await expect(label).toContainText('Label');
    await expect(label.locator('[data-default]')).toHaveText('default 100 mm');
    await shot(page, testInfo, 'usermodified');
  });

  test('a row opens its editor; set back to the default it leaves the list', async ({ page }) => {
    await open(page, 'screen/usermodified', { level: 3 });
    const before = await rows(page).count();
    await page.locator('[data-row="117"]').click();
    const sheet = page.locator('[data-sheet]');
    await expect(sheet.locator('[data-numeric-field]')).toBeVisible();
    for (const k of ['1', '0', '0']) await sheet.locator(`[data-key="${k}"]`).click();
    await sheet.locator('[data-key="↵"]').click();
    await expect(sheet).toHaveCount(0);
    await expect(page.locator('[data-row="117"]')).toHaveCount(0);
    await expect(rows(page)).toHaveCount(before - 1);
  });

  test('a parameter changed elsewhere appears; the level hides what it cannot read', async ({ page }) => {
    await open(page, 'screen/usermodified', { level: 3 });
    await page.evaluate(() => window.__hmi.ctx.setParam(122, 45));
    await page.evaluate(() => window.__hmi.go('screen/root'));
    await page.evaluate(() => window.__hmi.go('screen/usermodified'));
    await expect(page.locator('[data-row="122"]')).toBeVisible();
  });

  test('empty state when everything is at its default', async ({ page }) => {
    await open(page, 'screen/usermodified', { level: 3 });
    await page.evaluate(() => {
      const { ctx, store } = window.__hmi;
      for (const p of ctx.data.params) if (p.default != null) store.setParam(p.id, p.default);
      window.__hmi.go('screen/root');
      window.__hmi.go('screen/usermodified');
    });
    await expect(page.locator('[data-list-empty]')).toContainText('default values');
    await expect(page.locator('[data-list-intro]')).toHaveCount(0);
  });
});
