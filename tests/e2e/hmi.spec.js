import { test, expect } from '@playwright/test';
import { open, shot, hideDev } from './helpers.js';

test.describe('HMI screen specifics (P2-13)', () => {
  test('time is edited with the picker: steppers wrap, Set saves hh:mm', async ({
    page,
  }, testInfo) => {
    await open(page, 'screen/hmi', { level: 2 });
    await hideDev(page);
    await expect(page.locator('[data-row="700"] [data-value]')).toHaveText('16:20');
    await page.locator('[data-row="700"]').click();
    const sheet = page.locator('[data-sheet]');
    await expect(sheet.locator('[data-picker="time"]')).toBeVisible();
    await expect(sheet.locator('[data-numpad]')).toHaveCount(0); // a picker, not a keypad
    await sheet.locator('[data-field="h"] [data-dir="1"]').click();
    await sheet.locator('[data-field="m"] [data-dir="-1"]').click();
    await expect(sheet.locator('[data-value="h"]')).toHaveText('17');
    await expect(sheet.locator('[data-value="m"]')).toHaveText('19');
    await shot(page, testInfo, 'editor-time');
    await sheet.locator('[data-action="set"]').click();
    await expect(sheet).toHaveCount(0);
    await expect(page.locator('[data-row="700"] [data-value]')).toHaveText('17:19');
    expect(await page.evaluate(() => window.__hmi.store.getParam(700))).toBe('17:19:00');
  });

  test('date picker explains a day that does not exist and keeps Set disabled', async ({
    page,
  }, testInfo) => {
    await open(page, 'screen/hmi', { level: 2 });
    await hideDev(page);
    await page.locator('[data-row="701"]').click();
    const sheet = page.locator('[data-sheet]');
    await expect(sheet.locator('[data-picker="date"]')).toBeVisible();
    // 01.01.2027 → 31.02.2027: day back once wraps to 31, month forward once
    await sheet.locator('[data-field="d"] [data-dir="-1"]').click();
    await sheet.locator('[data-field="m"] [data-dir="1"]').click();
    await expect(sheet.locator('[data-error]')).toContainText('31.02. does not exist');
    await expect(sheet.locator('[data-action="set"]')).toHaveAttribute('aria-disabled', 'true');
    await expect(sheet.locator('[data-field="y"] [data-dir="-1"]')).toHaveAttribute(
      'aria-disabled',
      'true',
    ); // 2027 is the first year of the range
    await shot(page, testInfo, 'editor-date-error');
    await sheet.locator('[data-action="set"]').click({ force: true });
    await expect(sheet).toBeVisible(); // not corrected, not closed
    await sheet.locator('[data-field="m"] [data-dir="1"]').click(); // 31.03.
    await sheet.locator('[data-field="y"] [data-dir="1"]').click();
    await expect(sheet.locator('[data-error]')).toHaveText('');
    await sheet.locator('[data-action="set"]').click();
    await expect(sheet).toHaveCount(0);
    await expect(page.locator('[data-row="701"] [data-value]')).toHaveText('31.03.2028');
  });

  test('dark mode and orientation apply live from the list', async ({ page }) => {
    await open(page, 'screen/hmi', { level: 2 });
    await page.locator('[data-row="612"]').click(); // toggle, no sheet
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('[data-row="612"] [data-value]')).toHaveText('Off');
    await page.locator('[data-row="612"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('[data-row="601"]').click();
    await page.locator('[data-sheet] .option-row[data-id="604"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-orientation', 'landscape-rh');
    await expect(page.locator('.title-bar__title')).toHaveText('HMI'); // same screen, new layout
  });

  test('logo selection shows on home; quicklink picker feeds the home cards', async ({ page }) => {
    await open(page, 'screen/hmi', { level: 3 });
    await page.locator('[data-row="608"]').click();
    await page.locator('[data-sheet] .option-row[data-id="610"]').click();
    await page.locator('[data-row="614"]').click();
    const sheet = page.locator('[data-sheet]');
    await expect(sheet.locator('[data-quicklink-picker]')).toBeVisible();
    await sheet.locator('.option-row[data-id="117"]').click();
    await expect(page.locator('[data-row="614"] [data-value]')).toHaveText('Label Length');
    await page.evaluate(() => window.__hmi.go('home'));
    await expect(page.locator('.logo:visible')).toHaveAttribute('aria-label', 'ETIPACK'); // one per orientation (DT-39)
    await expect(page.locator('[data-quicklinks] [data-pid="117"]')).toBeVisible();
  });
});
