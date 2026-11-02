import { test, expect } from '@playwright/test';
import { open, shot, hideDev } from './helpers.js';

test.describe('help pop-up and favourites (P2-11, P2-12)', () => {
  test('help opens over the list and scrolls when the text is long', async ({ page }, testInfo) => {
    await open(page, 'screen/speed', { level: 2 });
    await hideDev(page);
    await page.locator('[data-help-for="122"]').click();
    const modal = page.locator('.modal');
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute('data-kind', 'help');
    await expect(modal.locator('#modal-title')).toHaveText('Fixed Speed');
    await expect(modal.locator('[data-help-body]')).toContainText('Range 1 – 60 m/min');
    await expect(page.locator('[data-row="122"]')).toBeVisible(); // list behind the pop-up
    await shot(page, testInfo, 'help-fixed-speed');
    await modal.locator('[data-action="ok"]').click();
    await expect(modal).toHaveCount(0);
    // a parameter with a long placeholder scrolls inside the body
    const longPid = await page.evaluate(() => {
      const m = window.__hmi.ctx.data.params
        .filter((p) => p.screens.includes('info'))
        .map((p) => [p.id, 120 + ((p.id * 37) % 601)])
        .sort((a, b) => b[1] - a[1])[0];
      return m[0];
    });
    await open(page, 'screen/info', { level: 3 });
    await page.locator(`[data-help-for="${longPid}"]`).click();
    const body = page.locator('.modal .modal__body');
    const scrolls = await body.evaluate((el) => el.scrollHeight > el.clientHeight);
    expect(scrolls).toBe(true);
  });

  test('a favourite is marked in the row, listed under Settings › Favourites and edited there', async ({
    page,
  }, testInfo) => {
    await open(page, 'screen/speed', { level: 2 });
    await hideDev(page);
    await page.evaluate(() => window.__hmi.store.replace('favourites', []));
    await page.locator('[data-help-for="122"]').click();
    await page.locator('.modal [data-action="toggleFavourite"]').click();
    await expect(page.locator('.modal [data-action="toggleFavourite"]')).toContainText('Remove');
    await page.locator('.modal [data-action="ok"]').click();
    await expect(page.locator('[data-row="122"] [aria-label="favourite"]')).toBeVisible();
    // Settings menu shows the Favourites tile; the screen lists the row as a live view
    await open(page, 'screen/settings', { level: 2 });
    const tile = page.locator('.menu-tile[data-id="favourites"]');
    await expect(tile).toBeVisible();
    await tile.click();
    await expect(page).toHaveURL(/#\/screen\/favourites$/);
    await expect(page.locator('[data-row="122"]')).toBeVisible();
    await shot(page, testInfo, 'favourites');
    await page.locator('[data-row="122"]').click(); // slider editor
    await page.locator('[data-sheet] [data-action="inc"]').click();
    await expect(page.locator('[data-row="122"] [data-value]')).toHaveText('30.5 m/min');
    await page.locator('[data-sheet] button[data-action="close"]').click();
    await open(page, 'screen/speed', { level: 2 });
    await expect(page.locator('[data-row="122"] [data-value]')).toHaveText('30.5 m/min'); // same value
  });

  test('removing the last favourite shows the empty state', async ({ page }) => {
    await open(page, 'screen/favourites', { level: 2 });
    await page.evaluate(() => window.__hmi.store.replace('favourites', [122]));
    await expect(page.locator('[data-row="122"]')).toBeVisible();
    await page.locator('[data-help-for="122"]').click();
    await page.locator('.modal [data-action="toggleFavourite"]').click();
    await page.locator('.modal [data-action="ok"]').click();
    await expect(page.locator('[data-row="122"]')).toHaveCount(0);
    await expect(page.locator('[data-list-empty]')).toBeVisible();
  });

  test('the quicklink picker offers favourites first and the card follows', async ({
    page,
  }, testInfo) => {
    await open(page, 'screen/hmi', { level: 3 });
    await hideDev(page);
    await page.evaluate(() => window.__hmi.store.replace('favourites', [613]));
    await page.locator('[data-row="614"]').click();
    const picker = page.locator('[data-quicklink-picker]');
    await expect(picker).toBeVisible();
    await expect(picker.locator('.option-row').first()).toContainText('Stand-By-Timer');
    await shot(page, testInfo, 'quicklink-picker');
    await picker.locator('.option-row').first().click();
    await expect(page.locator('[data-row="614"] [data-value]')).toHaveText('Stand-By-Timer');
    await open(page, '', { level: 3 });
    await expect(page.locator('[data-quicklinks] [data-pid="613"]')).toBeVisible();
  });
});
