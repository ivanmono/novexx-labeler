import { test, expect } from '@playwright/test';
import { open, shot } from './helpers.js';

// P3-12 FW-Update (docx §8.10): browser filtered to firmware files, installed and selected version
// side by side (downgrade allowed), own update view without back, success + restart, failure with
// next steps, rejected signature; L3.
const install = async (page, name, folder = null) => {
  if (folder) await page.locator(`[data-id="${folder}"]`).click();
  await page.locator(`[data-id="${name}"]`).click();
  await page.locator('[data-action="install"]').click();
  await page.locator('.modal').last().locator('[data-action="ok"]').click();
};

test.describe('firmware update (P3-12)', () => {
  test('opens on the firmware folder; versions side by side; non-firmware files greyed', async ({ page }, testInfo) => {
    await open(page, 'screen/fwupdate', { level: 3 });
    await expect(page.locator('[data-path]')).toContainText('firmware');
    await expect(page.locator('[data-id="release-notes.pdf"]')).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('[data-installed] [data-version]')).toHaveText('0.01');
    await expect(page.locator('[data-selected] [data-version]')).toHaveText('—');
    await page.locator('[data-id="XLS22x_v0.02.fw"]').click();
    await expect(page.locator('[data-selected] [data-version]')).toHaveText('0.02');
    await expect(page.locator('[data-versions]')).toHaveAttribute('data-direction', 'upgrade');
    await expect(page.locator('[data-fw-note]')).toContainText('stops the machine');
    await shot(page, testInfo, 'fw-select');
  });

  test('downgrade is allowed and said so', async ({ page }) => {
    await open(page, 'screen/fwupdate', { level: 3 });
    await page.locator('[data-id="archive"]').click();
    await page.locator('[data-id="XLS22x_v0.00.fw"]').click();
    await expect(page.locator('[data-versions]')).toHaveAttribute('data-direction', 'downgrade');
    await expect(page.locator('[data-direction-text]')).toContainText('downgrade is allowed');
    await page.locator('[data-action="install"]').click();
    await expect(page.locator('.modal').last()).toContainText('older version');
  });

  test('update: own view without back, success, restart boots the new version', async ({ page }, testInfo) => {
    await page.clock.install();
    await open(page, 'screen/fwupdate', { level: 3 });
    await install(page, 'XLS22x_v0.02.fw');
    await expect(page.locator('[data-fw-update]')).toContainText('Installing firmware 0.02');
    await expect(page.locator('[data-fw-update]')).toContainText('Do not switch off');
    await expect(page.locator('.title-bar [data-action="back"]')).toHaveCount(0);
    await page.evaluate(() => window.__hmi.ctx.back());
    await expect(page.locator('[data-fw-update]')).toBeVisible();
    await page.clock.runFor(2000);
    await shot(page, testInfo, 'fw-running');
    await page.clock.runFor(6000);
    await expect(page.locator('[data-fw-result="success"]')).toContainText('Update successful');
    await expect(page.locator('[data-fw-result="success"]')).toContainText('0.02');
    await expect(page.locator('.title-bar [data-action="back"]')).toHaveCount(0);
    await shot(page, testInfo, 'fw-success');
    expect(await page.evaluate(() => window.__hmi.store.getParam(702))).toBe('0.02');
    await page.locator('[data-action="restart"]').click();
    await expect(page).toHaveURL(/#\/startup/);
    expect(await page.evaluate(() => window.__hmi.ctx.level)).toBe(0);
    await page.clock.runFor(15000);
    await expect(page).toHaveURL(/#\/home/);
    expect(await page.evaluate(() => window.__hmi.store.get('machine').identity.firmware)).toBe('0.02');
  });

  test('an image with an invalid signature is rejected; the installed version stays', async ({ page }, testInfo) => {
    await page.clock.install();
    await open(page, 'screen/fwupdate', { level: 3 });
    await install(page, 'XLS22x_v0.03-rc.fw');
    await page.clock.runFor(2000);
    await expect(page.locator('[data-fw-result="rejected"]')).toContainText('Firmware rejected');
    await expect(page.locator('[data-fw-result="rejected"] li')).toHaveCount(2);
    await shot(page, testInfo, 'fw-rejected');
    expect(await page.evaluate(() => window.__hmi.store.get('machine').identity.firmware)).toBe('0.01');
    await page.locator('[data-action="backToFiles"]').click();
    await expect(page.locator('[data-fw]')).toBeVisible();
    await expect(page.locator('.title-bar [data-action="back"]')).toHaveCount(1);
  });

  test('a damaged image fails while writing with next steps', async ({ page }) => {
    await page.clock.install();
    await open(page, 'screen/fwupdate', { level: 3 });
    await install(page, 'XLS22x_v0.02_copy.fw', 'archive');
    await page.clock.runFor(6000);
    await expect(page.locator('[data-fw-result="failed"]')).toContainText('Update failed');
    await expect(page.locator('[data-fw-result="failed"]')).toContainText('keeps firmware 0.01');
  });

  test('pulling the drive during the update fails safely', async ({ page }) => {
    await page.clock.install();
    await open(page, 'screen/fwupdate', { level: 3 });
    await install(page, 'XLS22x_v0.02.fw');
    await page.clock.runFor(1500);
    await page.evaluate(() => window.__hmi.set('state', 'nousb'));
    await page.clock.runFor(400);
    await expect(page.locator('[data-fw-result="failed"]')).toContainText('USB drive was removed');
  });

  test('refused while the machine runs', async ({ page }) => {
    await open(page, 'screen/fwupdate', { level: 3, state: 'run' });
    await page.locator('[data-id="XLS22x_v0.02.fw"]').click();
    await page.locator('[data-action="install"]').click();
    await expect(page.locator('.modal')).toHaveCount(0);
    await expect(page.locator('.toast').last()).toHaveAttribute('data-kind', 'reject');
  });

  test('locked below L3', async ({ page }) => {
    await open(page, 'screen/fwupdate', { level: 2 });
    await page.locator('[data-id="XLS22x_v0.02.fw"]').click();
    await page.locator('[data-action="installLocked"]').click();
    await expect(page.locator('.toast').last()).toContainText('level 3');
  });
});
