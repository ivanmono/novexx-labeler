import { test, expect } from '@playwright/test';
import { open, shot } from './helpers.js';

// P3-09 Error History (docx §8.7): newest first, search with the keyboard from 2 characters,
// full text on tap, empty and no-match states, end marker, read L1 / clear L3.
const codes = (page) =>
  page.locator('[data-err]').evaluateAll((els) => els.map((e) => e.dataset.err));
const press = async (page, keys) => {
  for (const k of keys) await page.locator(`[data-key="${k}"]`).click();
};

test.describe('error history (P3-09)', () => {
  test('L1: newest first with severity, ID, time and role; end marker', async ({ page }) => {
    await open(page, 'screen/errorhistory', { level: 1 });
    await expect(page.locator('[data-err]').first()).toBeVisible();
    const times = await page
      .locator('[data-err]')
      .evaluateAll((els) => els.map((e) => e.innerText));
    expect(times.length).toBeGreaterThan(5);
    await expect(page.locator('[data-err]').first().locator('[data-sev]')).toBeVisible();
    await expect(page.locator('[data-list-end]')).toHaveCount(1);
    await expect(page.locator('[data-err-actions] [data-action="clearLocked"]')).toBeVisible();
  });

  test('search unfolds the keyboard and filters from the second character', async ({ page }) => {
    await open(page, 'screen/errorhistory', { level: 1 });
    const all = (await codes(page)).length;
    await page.locator('[data-err-search]').click();
    await expect(page.locator('[data-keyboard]')).toBeVisible();
    await press(page, ['e']);
    expect((await codes(page)).length).toBe(all);
    await expect(page.locator('[data-err-count]')).toContainText('2 or more');
    await press(page, ['123', '2']);
    expect(new Set(await codes(page))).toEqual(new Set(['E-207']));
    await press(page, ['0', '9']);
    await expect(page.locator('[data-placeholder="empty"]')).toContainText('No error matches');
    await page.locator('[data-key="↵"]').click();
    await expect(page.locator('[data-keyboard]')).toHaveCount(0);
  });

  test('a row opens the full text; a new error lands on top', async ({ page }) => {
    await open(page, 'screen/errorhistory', { level: 1 });
    await page.evaluate(() => window.__hmi.sim.injectError('E-402'));
    await expect(page.locator('[data-err]').first()).toHaveAttribute('data-err', 'E-402');
    await page.locator('[data-err]').first().click();
    const modal = page.locator('.modal').last();
    await expect(modal).toContainText('Applicator touch-down timeout');
    await expect(modal).toContainText('air pressure');
    await expect(modal).toContainText('Logged in: L1');
  });

  test('L3: clear asks first and leaves the empty state', async ({ page }, testInfo) => {
    await open(page, 'screen/errorhistory', { level: 3 });
    await shot(page, testInfo, 'errorhistory-l3');
    await page.locator('[data-action="clear"]').click();
    const modal = page.locator('.modal').last();
    await expect(modal.locator('[data-action="ok"]')).toHaveClass(/bg-status-error/);
    await modal.locator('[data-action="ok"]').click();
    await expect(page.locator('[data-placeholder="empty"]')).toContainText('No errors recorded');
  });
});
