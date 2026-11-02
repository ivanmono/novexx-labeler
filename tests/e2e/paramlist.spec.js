import { test, expect } from '@playwright/test';
import { open, shot, hideDev } from './helpers.js';
import { createRequire } from 'node:module';

const tree = createRequire(import.meta.url)('../../src/data/menu-tree.json');

const lists = [];
(function walk(n) {
  if (n.kind === 'list') lists.push(n);
  n.children?.forEach(walk);
})(tree);

test.describe('parameter list screens (P2-03, P2-04)', () => {
  test('Speed: values in the rows, conditional rows follow the Speed Selection switch', async ({
    page,
  }, testInfo) => {
    await open(page, 'screen/speed', { level: 2 });
    await hideDev(page);
    await expect(page.locator('.title-bar__title')).toHaveText('Speed');
    const fixed = page.locator('[data-row="122"]');
    await expect(fixed).toContainText('30 m/min');
    await expect(fixed).toContainText('122'); // ParamID visible, docx §6.2
    await expect(page.locator('[data-row="124"]')).toHaveCount(0);
    await shot(page, testInfo, 'list-speed');
    // switch to encoder mode: Fixed Speed goes, the encoder rows come
    await page.evaluate(() => window.__hmi.store.setParam(118, 120));
    await expect(page.locator('[data-row="122"]')).toHaveCount(0);
    await expect(page.locator('[data-row="124"]')).toBeVisible();
    await expect(page.locator('[data-row="126"]')).toBeVisible();
  });

  test('a locked row shows the lock and toasts the level it needs', async ({ page }) => {
    await open(page, 'screen/speed', { level: 1 });
    const fixed = page.locator('[data-row="122"]');
    await expect(fixed).toHaveAttribute('data-action', 'locked');
    await fixed.click();
    const toast = page.locator('.toast');
    await expect(toast).toHaveAttribute('data-kind', 'reject');
    await expect(toast).toContainText('level 2');
  });

  test('a changed value carries the marker and updates in place', async ({ page }) => {
    await open(page, 'screen/speed', { level: 2 });
    const fixed = page.locator('[data-row="122"]');
    await expect(fixed).not.toHaveAttribute('data-changed', 'true');
    await page.evaluate(() => window.__hmi.store.setParam(122, 45));
    await expect(fixed).toHaveAttribute('data-changed', 'true');
    await expect(fixed.locator('[data-value]')).toHaveText('45 m/min');
  });

  test('a toggle flips on tap: dark mode switches the theme live', async ({ page }) => {
    await open(page, 'screen/hmi', { level: 1 });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('[data-row="612"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('[data-row="612"] [data-value]')).toHaveText('Off');
  });

  test('shared parameters show one value on both screens', async ({ page }) => {
    await open(page, 'screen/start', { level: 3 });
    await page.evaluate(() => window.__hmi.store.setParam(212, false));
    await expect(page.locator('[data-row="212"] [data-value]')).toHaveText('Off');
    await page.evaluate(() => window.__hmi.go('screen/mio'));
    await expect(page.locator('[data-row="212"] [data-value]')).toHaveText('Off');
  });

  test('live counters refresh while the machine runs', async ({ page }) => {
    await open(page, 'screen/info', { level: 2, state: 'run' });
    const row = page.locator('[data-row="710"][data-live="true"]'); // Counter_Label_Dispensed
    await expect(row).toBeVisible();
    const before = await row.locator('[data-value]').textContent();
    await expect
      .poll(async () => row.locator('[data-value]').textContent(), { timeout: 5000 })
      .not.toBe(before);
  });

  test('every list screen renders rows at level 4', async ({ page }, testInfo) => {
    for (const node of lists) {
      await open(page, `screen/${node.id}`, { level: 4 });
      await hideDev(page);
      const list = page.locator('[data-list]');
      await expect(list).toHaveAttribute('data-list', node.id);
      expect(Number(await list.getAttribute('data-rows'))).toBeGreaterThan(0);
      if (testInfo.project.name === 'portrait') await shot(page, testInfo, `list-${node.id}`);
    }
  });
});
