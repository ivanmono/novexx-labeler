import { test, expect } from '@playwright/test';
import { open, shot } from './helpers.js';

// P3-11 Load/Store Backup (docx §8.9): browser, create button and naming dialog as one flow;
// no USB drive is an empty state; Backup vs Format explained; load confirmed, refused while running;
// progress warns against pulling the drive; L2 create, L3 load.
const files = (page) => page.locator('[data-file-browser] [data-action="pick"]');
const usbFile = (page, folder, name) =>
  page.evaluate(([f, n]) => window.__hmi.store.get('usb').folders[f].find((e) => e.name === n) ?? null, [folder, name]);
const press = async (page, keys) => {
  for (const k of keys) await page.locator(`[data-key="${k}"]`).click();
};
const fast = (page) => page.clock.install();

test.describe('backup (P3-11)', () => {
  test('browser: folders, backup files, foreign files greyed out, one level up', async ({ page }, testInfo) => {
    await open(page, 'screen/backup', { level: 2 });
    await expect(page.locator('[data-path]')).toHaveText('USB');
    await expect(page.locator('[data-id="readme.txt"]')).toHaveAttribute('aria-disabled', 'true');
    await page.locator('[data-id="backups"]').click();
    await expect(page.locator('[data-path]')).toContainText('backups');
    await expect(page.locator('[data-id="label-layout.pdf"]')).toHaveAttribute('aria-disabled', 'true');
    expect(await files(page).count()).toBeGreaterThan(3);
    await page.locator('[data-id="bottle-330ml_template.fmt"]').click();
    await expect(page.locator('[data-selection]')).toContainText('Format · bottle-330ml_template.fmt');
    await shot(page, testInfo, 'backup-browse');
    await page.locator('[data-action="up"]').click();
    await expect(page.locator('[data-path]')).toHaveText('USB');
  });

  test('no USB drive is an empty state; plugging one in brings the browser back', async ({ page }) => {
    await open(page, 'screen/backup', { level: 2 });
    await page.evaluate(() => window.__hmi.set('state', 'nousb'));
    await expect(page.locator('[data-no-usb]')).toContainText('No USB drive');
    await expect(page.locator('.modal')).toHaveCount(0);
    await page.evaluate(() => window.__hmi.set('state', 'usb'));
    await expect(page.locator('[data-file-browser]')).toBeVisible();
  });

  test('create: naming dialog pre-filled, Backup vs Format explained, progress, file written', async ({ page }, testInfo) => {
    await fast(page);
    await open(page, 'screen/backup', { level: 2 });
    await page.locator('[data-id="backups"]').click();
    await page.locator('[data-action="create"]').click();
    const field = page.locator('[data-name-field] [data-entry]');
    await expect(field).toHaveText(/^Jakobs-XLS-224_SN1043_\d{4}-\d\d-\d\d$/);
    await expect(page.locator('[data-kind="backup"]')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('[data-kind="backup"]')).toContainText('Restores this machine');
    await expect(page.locator('[data-kind="format"]')).toContainText('another machine');
    await shot(page, testInfo, 'backup-name');

    // edit the name: the keyboard unfolds, spaces are refused, the check key folds it
    await page.locator('[data-action="editName"]').click();
    await expect(page.locator('[data-keyboard]')).toBeVisible();
    for (let i = 0; i < 10; i++) await page.locator('[data-key="⌫"]').click();
    await press(page, ['l', 'i', 'n', 'e', '123', '1']);
    await page.locator('[data-key="↵"]').click();
    await page.locator('[data-kind="format"]').click();
    await expect(page.locator('[data-kind="format"]')).toHaveAttribute('aria-checked', 'true');
    const stem = (await field.textContent()).trim();
    expect(stem).toMatch(/line1$/);

    await page.locator('[data-action="save"]').click();
    await expect(page.locator('[data-progress="running"]')).toBeVisible();
    await expect(page.locator('[data-backup-run]')).toContainText('Do not remove the USB drive');
    // leaving is refused while writing
    await page.evaluate(() => window.__hmi.ctx.back());
    await expect(page.locator('.toast').last()).toContainText('Wait until the USB drive is finished');
    await expect(page.locator('[data-backup-run]')).toBeVisible();
    await page.clock.runFor(4000);
    await expect(page.locator('[data-backup-result="ok"]')).toContainText('Format saved');
    const f = await usbFile(page, 'USB/backups', `${stem}.fmt`);
    expect(f?.data?.kind).toBe('format');
    expect(Object.keys(f.data.params).length).toBeGreaterThan(10);
    expect(f.data.formats).toBeUndefined();
    const log = await page.evaluate(() => window.__hmi.store.get('logs').at(-1));
    expect(log.type).toBe('backup');
    await page.locator('[data-action="done"]').click();
    await expect(page.locator(`[data-id="${stem}.fmt"]`)).toBeVisible();
  });

  test('an existing name asks before replacing', async ({ page }) => {
    await fast(page);
    await open(page, 'screen/backup', { level: 2 });
    await page.locator('[data-action="create"]').click();
    await page.locator('[data-action="save"]').click();
    await page.clock.runFor(4000);
    await page.locator('[data-action="done"]').click();
    await page.locator('[data-action="create"]').click();
    await page.locator('[data-action="save"]').click();
    const modal = page.locator('.modal').last();
    await expect(modal).toContainText('Replace the file?');
    await modal.locator('[data-action="cancel"]').click();
    await expect(page.locator('[data-backup-name]')).toBeVisible();
  });

  test('pulling the drive while writing ends in the failure state with next steps', async ({ page }) => {
    await fast(page);
    await open(page, 'screen/backup', { level: 2 });
    await page.locator('[data-action="create"]').click();
    await page.locator('[data-action="save"]').click();
    await page.clock.runFor(800);
    await page.evaluate(() => window.__hmi.set('state', 'nousb'));
    await page.clock.runFor(400);
    await expect(page.locator('[data-backup-result="failed"]')).toContainText('USB drive removed');
    await expect(page.locator('[data-backup-result="failed"] li')).toHaveCount(2);
  });

  test('load: L3, confirmed, restores the parameters', async ({ page }, testInfo) => {
    await fast(page);
    await open(page, 'screen/backup', { level: 3 });
    await page.evaluate(() => window.__hmi.ctx.setParam(117, 99));
    await page.locator('[data-id="backups"]').click();
    // the older backup holds label length 75
    const older = await page.evaluate(() =>
      window.__hmi.store.get('usb').folders['USB/backups'].filter((e) => e.name.endsWith('.bak')).sort((a, b) => a.at - b.at)[0].name,
    );
    await page.locator(`[data-id="${older}"]`).click();
    await page.locator('[data-action="load"]').click();
    const modal = page.locator('.modal').last();
    await expect(modal).toContainText('Load this backup?');
    await modal.locator('[data-action="ok"]').click();
    await expect(page.locator('[data-backup-run]')).toContainText('Loading from the USB drive');
    await page.clock.runFor(4000);
    await expect(page.locator('[data-backup-result="ok"]')).toContainText('Backup loaded');
    await shot(page, testInfo, 'backup-loaded');
    expect(await page.evaluate(() => window.__hmi.store.getParam(117))).toBe(75);
    expect(await page.evaluate(() => window.__hmi.store.getParam(122))).toBe(28);
  });

  test('load is refused while the machine runs', async ({ page }) => {
    await open(page, 'screen/backup', { level: 3, state: 'run' });
    await page.locator('[data-id="backups"]').click();
    await page.locator('[data-id="bottle-330ml_template.fmt"]').click();
    await page.locator('[data-action="load"]').click();
    await expect(page.locator('.modal')).toHaveCount(0);
    await expect(page.locator('.toast').last()).toHaveAttribute('data-kind', 'reject');
  });

  test('L2 creates but cannot load', async ({ page }) => {
    await open(page, 'screen/backup', { level: 2 });
    await page.locator('[data-id="backups"]').click();
    await page.locator('[data-id="bottle-330ml_template.fmt"]').click();
    await page.locator('[data-action="loadLocked"]').click();
    await expect(page.locator('.toast').last()).toContainText('level 3');
    await expect(page.locator('[data-action="create"]')).toBeVisible();
  });
});
