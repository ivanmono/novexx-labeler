import { test, expect } from '@playwright/test';
import { open, shot, hideDev } from './helpers.js';
import { createRequire } from 'node:module';

const tree = createRequire(import.meta.url)('../../src/data/menu-tree.json');

const menus = [];
(function walk(n) {
  if (n.kind === 'menu') menus.push(n);
  n.children?.forEach(walk);
})(tree);

test.describe('menu screens (P2-01, P2-02)', () => {
  test('main menu shows the six branches with their colours and opens Settings', async ({
    page,
  }, testInfo) => {
    await open(page, 'screen/root', { level: 1 });
    await hideDev(page);
    const tiles = page.locator('[data-tiles] .menu-tile');
    await expect(tiles).toHaveCount(6);
    await expect(tiles.nth(0)).toContainText('Settings');
    await expect(tiles.nth(5)).toContainText('Users & Authentication');
    await expect(page.locator('.pager')).toHaveCount(0); // six tiles fit on one page
    await shot(page, testInfo, 'menu-root');
    await tiles.nth(0).click();
    await expect(page).toHaveURL(/#\/screen\/settings$/);
    await expect(page.locator('.title-bar__title')).toHaveText('Settings');
    await expect(page.locator('.title-bar__branch')).toHaveClass(/bg-branch-settings/);
  });

  test('tiles for absent options are disabled, not hidden', async ({ page }, testInfo) => {
    await open(page, 'screen/options', { level: 3 });
    await hideDev(page);
    const tiles = page.locator('[data-tiles] .menu-tile');
    await expect(tiles).toHaveCount(5);
    const printers = page.locator('.menu-tile[data-id="printers"]');
    await expect(printers).toHaveAttribute('aria-disabled', 'true');
    await expect(printers).toContainText('Option not installed');
    await expect(page.locator('.menu-tile[data-id="buscard"]')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    // installing the printer option (Option_Printer 146) enables the tile live
    await page.evaluate(() => window.__hmi.store.setParam(146, true));
    await expect(printers).not.toHaveAttribute('aria-disabled', 'true');
    await shot(page, testInfo, 'menu-options');
  });

  test('a linked tile names the other entry point and opens the same screen', async ({ page }) => {
    await open(page, 'screen/digitalio', { level: 3 });
    const mio = page.locator('.menu-tile[data-id="ref-mio"]');
    await expect(mio).toContainText('also under Options');
    await mio.click();
    await expect(page).toHaveURL(/#\/screen\/mio$/);
  });

  test('every menu node renders all of its children', async ({ page }) => {
    for (const m of menus) {
      await open(page, `screen/${m.id}`, { level: 3 });
      await expect(page.locator('[data-menu]')).toHaveAttribute('data-menu', m.id);
      await expect(page.locator('[data-tiles] .menu-tile')).toHaveCount(m.children.length);
    }
  });

  test('landscape lays the tiles out in three columns', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 480 });
    await open(page, 'screen/root', { level: 1, orientation: 'landscape-lh' });
    const cols = await page
      .locator('[data-tiles]')
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(cols).toBe(3);
  });
});
