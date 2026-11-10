import { test, expect } from '@playwright/test';
import { open, shot } from './helpers.js';

// P3-05 Speed Test (docx §8.4), portrait and landscape.
test.describe('speed test (P3-05)', () => {
  test('run: warning first, measures, result block with product rate', async ({ page }) => {
    test.setTimeout(30_000);
    await open(page, 'screen/speedtest', { level: 2 });
    await expect(page.locator('[data-result-state="none"]')).toBeVisible();
    await page.locator('[data-action="run"]').click();
    const modal = page.locator('.modal').last();
    await expect(modal).toContainText('Keep hands away');
    await modal.locator('[data-action="ok"]').click();
    await expect(page.locator('[data-measuring]')).toBeVisible();
    await expect(page.locator('[data-result-state="done"]')).toBeVisible({ timeout: 12_000 });
    await expect(page.locator('[data-rate]')).toContainText('pcs/min');
    await expect(page.locator('[data-next-label]')).toContainText('ms');
  });

  test('product rate only when Calc Product Rate is on', async ({ page }) => {
    await open(page, 'screen/speedtest', { level: 2 });
    await page.evaluate(() => {
      const { store, sim } = window.__hmi;
      store.setParam(136, false);
      sim.startSpeedTest();
      sim.tick();
      sim.stopSpeedTest();
    });
    await expect(page.locator('[data-rate]')).toContainText('Off');
  });

  test('no encoder signal: dashes and a message instead of 0', async ({ page }) => {
    await open(page, 'screen/speedtest', { level: 1 });
    await page.evaluate(() => window.__hmi.set('state', 'nosignal'));
    await expect(page.locator('[data-live]')).toHaveAttribute('data-signal', 'no');
    await expect(page.locator('[data-live-mmin]')).toHaveText('—');
    await expect(page.locator('[data-no-signal]')).toContainText('No encoder signal');
  });

  test('read at L1, running needs L2; leaving the screen stops the test', async ({ page }) => {
    await open(page, 'screen/speedtest', { level: 1 });
    await expect(page.locator('[data-speed-actions] [data-action="locked"]')).toBeVisible();
    await open(page, 'screen/speedtest', { level: 2 });
    await page.evaluate(() => window.__hmi.sim.startSpeedTest());
    await expect(page.locator('[data-measuring]')).toBeVisible();
    await page.evaluate(() => window.__hmi.go('home'));
    expect(await page.evaluate(() => window.__hmi.store.get('machine').speedTest.running)).toBe(
      false,
    );
  });

  for (const theme of ['dark', 'light']) {
    test(`speed test renders (${theme})`, async ({ page }, testInfo) => {
      await open(page, 'screen/speedtest', { level: 2, theme });
      await page.evaluate(() => {
        const { sim } = window.__hmi;
        sim.startSpeedTest();
        sim.tick();
        sim.stopSpeedTest();
      });
      await expect(page.locator('[data-result-state="done"]')).toBeVisible();
      await shot(page, testInfo, `speedtest-result-${theme}`);
      await page.evaluate(() => window.__hmi.set('state', 'nosignal'));
      await expect(page.locator('[data-no-signal]')).toBeVisible();
      await shot(page, testInfo, `speedtest-nosignal-${theme}`);
    });
  }
});
