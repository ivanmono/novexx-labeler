import { test, expect } from '@playwright/test';
import { open, shot } from './helpers.js';

// P3-06 IO-Test (docx §8.5): L1 read-only face, L3 forcing, portrait and landscape.
const io = (page, pin) => page.evaluate((p) => window.__hmi.store.get('machine').io[p], pin);

test.describe('IO-Test (P3-06)', () => {
  test('L1: every IO with direction and lamp, no force column, filter by group', async ({
    page,
  }) => {
    await open(page, 'screen/iotest', { level: 1 });
    await expect(page.locator('[data-cmp="TableRow"]')).toHaveCount(16);
    await expect(page.locator('[role="switch"]')).toHaveCount(0);
    await expect(page.locator('[data-io-readonly]')).toContainText('access level 3');
    await expect(page.locator('[data-io="X1.1"] [data-dir]')).toHaveText('IN');
    await expect(page.locator('[data-io="X2.1"] [data-dir]')).toHaveText('OUT');
    await expect(page.locator('[data-io="X1.1"] [data-state]')).toHaveAttribute(
      'data-state',
      /high|low/,
    );
    await page.locator('[data-action="filter"][data-id="cpu"]').click();
    await expect(page.locator('[data-cmp="TableRow"]')).toHaveCount(6);
    await expect(page.locator('[data-group="mio"]')).toHaveCount(0);
  });

  test('L3: warning once, forced output marked with time left, reset all', async ({ page }) => {
    await open(page, 'screen/iotest', { level: 3 });
    // inputs cannot be forced: only output rows have a switch
    await expect(page.locator('[data-io="X1.1"] [role="switch"]')).toHaveCount(0);
    await page.locator('[role="switch"][data-id="X2.1"]').click();
    const modal = page.locator('.modal').last();
    await expect(modal).toContainText('can move the machine');
    await modal.locator('[data-action="ok"]').click();
    const row = page.locator('[data-io="X2.1"]');
    await expect(row).toHaveAttribute('data-forced', 'true');
    await expect(row.locator('[data-forced-note]')).toContainText(/Forced · \d+ s/);
    await expect(row.locator('[data-state]')).toHaveAttribute('data-state', 'high');
    // second force on the same visit: no second warning
    await page.locator('[role="switch"][data-id="X2.2"]').click();
    await expect(page.locator('[data-io="X2.2"]')).toHaveAttribute('data-forced', 'true');
    await expect(page.locator('[data-forced-count]')).toHaveAttribute('data-forced-count', '2');
    await page.locator('[data-action="resetAll"]').click();
    await expect(page.locator('[data-forced]')).toHaveCount(0);
    expect((await io(page, 'X2.1')).forced).toBeNull();
  });

  test('L3: leaving the screen puts forced outputs back to normal', async ({ page }) => {
    await open(page, 'screen/iotest', { level: 3 });
    await page.evaluate(() => window.__hmi.sim.forceOutput('X4.1', true));
    await expect(page.locator('[data-io="X4.1"]')).toHaveAttribute('data-forced', 'true');
    await page.evaluate(() => window.__hmi.go('home'));
    expect((await io(page, 'X4.1')).forced).toBeNull();
  });

  for (const theme of ['dark', 'light']) {
    test(`IO-Test renders (${theme})`, async ({ page }, testInfo) => {
      await open(page, 'screen/iotest', { level: 1, theme });
      await shot(page, testInfo, `iotest-l1-${theme}`);
      await open(page, 'screen/iotest', { level: 3, theme });
      await page.evaluate(() => window.__hmi.sim.forceOutput('X2.3', true));
      await page.locator('[data-io="X2.3"]').scrollIntoViewIfNeeded();
      await expect(page.locator('[data-io="X2.3"]')).toHaveAttribute('data-forced', 'true');
      await shot(page, testInfo, `iotest-l3-forced-${theme}`);
    });
  }
});
