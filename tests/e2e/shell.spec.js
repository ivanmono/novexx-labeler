import { test, expect } from '@playwright/test';

import { open } from './helpers.js';

test.describe('shell', () => {
  test('start-up screen has no bars, progresses, then lands on home', async ({ page }, testInfo) => {
    await page.goto('/#/');
    await page.waitForFunction(() => window.__hmi?.ctx);
    await expect(page.locator('.hmi')).toHaveAttribute('data-bars', 'off');
    await expect(page.locator('[data-startup] [data-bar]')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`startup-${testInfo.project.name}.png`) });
    await expect(page.locator('.hmi')).toHaveAttribute('data-bars', 'on', { timeout: 15_000 });
    await expect(page.locator('[data-home]')).toBeVisible();
  });

  test('status bar follows machine state; nav badge follows level', async ({ page }, testInfo) => {
    await open(page);
    const status = page.locator('.status-bar');
    await expect(status).toHaveAttribute('data-status', 'ready');
    await expect(page.locator('.nav-bar')).toHaveAttribute('data-level', '0');

    await page.evaluate(() => window.__hmi.set('level', '2'));
    await expect(page.locator('.nav-bar')).toHaveAttribute('data-level', '2');
    await expect(page.locator('.nav-bar [data-badge]')).toHaveText('L2');

    for (const [cmd, key] of [['run', 'run'], ['pause', 'pause'], ['warning', 'warning'], ['alarm', 'alarm'], ['reset', 'ready'], ['standby', 'standby']]) {
      await page.evaluate((c) => window.__hmi.set('state', c), cmd);
      await expect(status).toHaveAttribute('data-status', key);
    }
    await page.evaluate(() => window.__hmi.set('state', 'reset'));
    await page.evaluate(() => window.__hmi.set('level', '4'));
    await expect(status.locator('[data-secure]')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`home-L4-${testInfo.project.name}.png`) });
  });

  test('menu button at level 0 rejects; at level 1 opens the main menu; back returns', async ({ page }) => {
    await open(page);
    await page.locator('.nav-bar [data-action="menu"]').click();
    await expect(page.locator('.toast')).toHaveAttribute('data-kind', 'reject');
    await expect(page).toHaveURL(/#\/login$/);
    await page.evaluate(() => window.__hmi.set('level', '1'));
    await page.locator('.nav-bar [data-action="menu"]').click();
    await expect(page).toHaveURL(/#\/screen\/root$/);
    await page.locator('.nav-bar [data-action="back"]').click();
    await expect(page).toHaveURL(/#\/login$|#\/home$/);
  });

  test('orientation and theme switch the shell layout', async ({ page }, testInfo) => {
    await open(page);
    await page.evaluate(() => window.__hmi.set('level', '3'));
    for (const o of ['landscape-lh', 'landscape-rh', 'portrait']) {
      await page.evaluate((v) => window.__hmi.set('orientation', v), o);
      await expect(page.locator('html')).toHaveAttribute('data-orientation', o);
    }
    await page.evaluate(() => window.__hmi.set('theme', 'light'));
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.screenshot({ path: testInfo.outputPath(`home-light-${testInfo.project.name}.png`) });
  });

  test('styleguide shell sections render all states', async ({ page }, testInfo) => {
    await open(page, 'styleguide');
    await page.evaluate(() => window.__hmi.set('level', '1'));
    await expect(page.locator('[data-styleguide] .status-bar')).toHaveCount(8);
    await expect(page.locator('[data-styleguide] .nav-bar')).toHaveCount(5);
    await expect(page.locator('[data-styleguide] .modal')).toHaveCount(5);
    await page.screenshot({ path: testInfo.outputPath(`styleguide-shell-${testInfo.project.name}.png`), fullPage: false });
  });
});
