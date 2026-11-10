import { test, expect } from '@playwright/test';
import { open, shot } from './helpers.js';

// P3-10 Reporting — service done (docx §8.8): counters since the last service, comment, automatic
// date and user, all visible without scrolling; commit logs the report and resets the counters; L3.
const SERVICE = [719, 720, 721];
const press = async (page, keys) => {
  for (const k of keys) await page.locator(`[data-key="${k}"]`).click();
};
const fitsWithoutScrolling = (page) =>
  page.locator('[data-reporting]').evaluate((el) => el.scrollHeight <= el.clientHeight + 1);

test.describe('reporting (P3-10)', () => {
  test('counters, comment field and date/user block fit without scrolling', async ({ page }, testInfo) => {
    await open(page, 'screen/reporting', { level: 3 });
    for (const id of SERVICE) await expect(page.locator(`[data-counter="${id}"] [data-value]`)).not.toHaveText('');
    await expect(page.locator('[data-comment]')).toBeVisible();
    await expect(page.locator('[data-stamp] [data-now]')).toHaveText(/^\d\d\.\d\d\.\d{4} \d\d:\d\d$/);
    await expect(page.locator('[data-stamp] [data-who]')).toContainText('L3');
    await expect(page.locator('[data-action="commit"]')).toBeInViewport();
    expect(await fitsWithoutScrolling(page)).toBe(true);
    await shot(page, testInfo, 'reporting');
  });

  test('comment with the keyboard, commit logs the report and resets the counters', async ({ page }) => {
    await open(page, 'screen/reporting', { level: 3 });
    const before = await page.evaluate((ids) => ids.map((id) => window.__hmi.store.getParam(id)), SERVICE);
    expect(before.some((v) => Number(v) > 0)).toBe(true);

    await page.locator('[data-comment]').click();
    await expect(page.locator('[data-keyboard]')).toBeVisible();
    await press(page, ['R', 'o', 'l', 'l', 'e', 'r', '␣', 'n', 'e', 'w']);
    await expect(page.locator('[data-comment] [data-entry]')).toHaveText('Roller new');
    await expect(page.locator('[data-comment] [data-count]')).toHaveText('10/240');
    await page.locator('[data-key="↵"]').click();
    await expect(page.locator('[data-keyboard]')).toHaveCount(0);

    await page.locator('[data-action="commit"]').click();
    const modal = page.locator('.modal').last();
    await expect(modal).toContainText('Commit the service report?');
    await modal.locator('[data-action="ok"]').click();
    await expect(page.locator('.toast').last()).toContainText('Service report recorded');

    const after = await page.evaluate((ids) => ids.map((id) => window.__hmi.store.getParam(id)), SERVICE);
    for (const v of after) expect(Number(v)).toBeLessThan(0.1); // 720 keeps ticking from 0
    const entry = await page.evaluate(() => window.__hmi.store.get('logs').at(-1));
    expect(entry.type).toBe('service');
    expect(entry.level).toBe(3);
    expect(entry.comment).toBe('Roller new');
    expect(entry.detail).toContain('Roller new');
    expect(entry.counters[719]).toBe(before[0]);
    await expect(page.locator('[data-comment] [data-entry]')).toContainText('Tap to describe');
    await expect(page.locator('[data-last]')).toContainText('Last report');
  });

  test('cancel keeps the counters', async ({ page }) => {
    await open(page, 'screen/reporting', { level: 3 });
    const before = await page.evaluate(() => window.__hmi.store.getParam(721));
    await page.locator('[data-action="commit"]').click();
    await page.locator('.modal').last().locator('[data-action="cancel"]').click();
    expect(await page.evaluate(() => window.__hmi.store.getParam(721))).toBe(before);
  });

  test('below L3 commit is locked', async ({ page }) => {
    await open(page, 'screen/reporting', { level: 2 });
    await page.locator('[data-action="commitLocked"]').click();
    await expect(page.locator('.toast').last()).toContainText('level 3');
    expect(await page.evaluate(() => window.__hmi.store.get('logs').filter((e) => e.type === 'service').length)).toBe(0);
  });
});
