import { test, expect } from '@playwright/test';
import { open, shot } from './helpers.js';

// P3-07 Applicator Test and Test-Mode: buttons confirm, counters update at the 1 s refresh, L3.
const value = (page, pid) => page.locator(`[data-row="${pid}"] [data-value]`);

test.describe('applicator test and test mode (P3-07)', () => {
  test('full test cycle: confirm, then the four times show in ms', async ({ page }) => {
    await open(page, 'screen/applicatortest', { level: 3 });
    await expect(value(page, 725)).toContainText('0');
    await page.locator('[data-pid="807"][data-action="run"]').click();
    const modal = page.locator('.modal').last();
    await expect(modal).toContainText('moves the machine');
    await modal.locator('[data-action="ok"]').click();
    for (const pid of [722, 723, 724, 725]) await expect(value(page, pid)).toContainText('ms');
    const full = await page.evaluate(() => window.__hmi.store.getParam(725));
    expect(full).toBeGreaterThan(0);
  });

  test('single step writes one time per press; an actuator toggles and drives its IO', async ({
    page,
  }) => {
    await open(page, 'screen/applicatortest', { level: 3 });
    const run = async (pid) => {
      await page.locator(`[data-pid="${pid}"][data-action="run"]`).click();
      await page.locator('.modal').last().locator('[data-action="ok"]').click();
    };
    await run(808);
    expect(await page.evaluate(() => window.__hmi.store.getParam(722))).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.__hmi.store.getParam(723))).toBe(0);
    await run(805); // vacuum on
    expect(await page.evaluate(() => window.__hmi.store.get('machine').applicator.vacuum)).toBe(
      true,
    );
    await page.evaluate(() => window.__hmi.sim.tick());
    expect(await page.evaluate(() => window.__hmi.store.get('machine').io['X2.5'].state)).toBe(
      true,
    );
  });

  test('test mode counts duration and cycles once a second', async ({ page }) => {
    await open(page, 'screen/testmode', { level: 3 });
    await page.evaluate(() => window.__hmi.store.setParam(296, true));
    await expect
      .poll(() => page.evaluate(() => window.__hmi.store.getParam(726)), { timeout: 4000 })
      .toBeGreaterThan(0);
    await expect(value(page, 726)).toContainText('s');
    await expect
      .poll(() => page.evaluate(() => window.__hmi.store.getParam(727)), { timeout: 4000 })
      .toBeGreaterThan(0);
  });

  test('below L3 the buttons are locked', async ({ page }, testInfo) => {
    await open(page, 'screen/applicatortest', { level: 2 });
    await expect(page.locator('[data-pid="807"][data-action="run"]')).toHaveCount(0);
    await open(page, 'screen/applicatortest', { level: 3 });
    await shot(page, testInfo, 'applicatortest-l3');
  });
});
