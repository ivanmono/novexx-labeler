import { test, expect } from '@playwright/test';
import { open, shot, hideDev } from './helpers.js';

test.describe('parameter editors (P2-05 … P2-10)', () => {
  test('selection list: picking an option applies it and closes the sheet', async ({
    page,
  }, testInfo) => {
    await open(page, 'screen/speed', { level: 3 });
    await hideDev(page);
    await page.locator('[data-row="118"]').click();
    const sheet = page.locator('[data-sheet]');
    await expect(sheet).toBeVisible();
    await expect(sheet.locator('.option-row')).toHaveCount(3);
    await expect(sheet.locator('.option-row[aria-selected="true"]')).toContainText('Fixed');
    await shot(page, testInfo, 'editor-select');
    await sheet.locator('.option-row', { hasText: 'Encoder' }).first().click();
    await expect(sheet).toHaveCount(0);
    await expect(page.locator('[data-row="118"] [data-value]')).toContainText('Encoder');
    await expect(page.locator('[data-row="124"]')).toBeVisible(); // condition rows followed
  });

  test('the editor is a page; both back buttons close it and stay on the screen', async ({ page }) => {
    await open(page, 'screen/settings', { level: 2 });
    await page.locator('.menu-tile[data-id="label"]').click(); // history, so nav back is enabled
    await page.locator('[data-row="117"]').click();
    const editor = page.locator('[data-sheet][data-page]');
    await expect(editor.locator('.title-bar__title')).toHaveText('Label Length');
    await editor.locator('[data-action="close"]').click();
    await expect(editor).toHaveCount(0);
    await page.locator('[data-row="117"]').click();
    await page.locator('.hmi__nav [data-action="back"]').click();
    await expect(editor).toHaveCount(0);
    await expect(page).toHaveURL(/#\/screen\/label$/);
  });

  test('language list scrolls and ends with a marker', async ({ page }) => {
    await open(page, 'screen/hmi', { level: 1 });
    await page.locator('[data-row="500"]').click();
    const sheet = page.locator('[data-sheet]');
    await expect(sheet.locator('.option-row')).toHaveCount(26);
    await expect(sheet.locator('[data-list-end]')).toBeAttached();
    await sheet.locator('.option-row', { hasText: 'Language German' }).click();
    await expect(page.locator('.title-bar__title')).toHaveText('HMI');
    await expect(page.locator('[data-row="612"] [data-value]')).toHaveText('Ein'); // German On
    await page.evaluate(() => window.__hmi.set('lang', 'en'));
  });

  test('numeric keypad: out of range is explained, not corrected; valid value is saved once', async ({
    page,
  }, testInfo) => {
    await open(page, 'screen/label', { level: 2 });
    await hideDev(page);
    await page.locator('[data-row="117"]').click(); // Label length, 5–2000 mm, float
    const sheet = page.locator('[data-sheet]');
    await expect(sheet.locator('[data-numeric-field]')).toContainText('Min 5');
    await expect(sheet.locator('[data-numeric-field]')).toContainText('Default 100');
    for (const k of ['3', '0', '0', '0']) await sheet.locator(`[data-key="${k}"]`).click();
    await sheet.locator('[data-key="↵"]').click();
    await expect(sheet.locator('[data-error]')).toContainText('between 5 and 2,000 mm');
    await expect(sheet).toBeVisible(); // not closed, not corrected
    await shot(page, testInfo, 'editor-numeric-error');
    await sheet.locator('[data-key="C"]').click();
    for (const k of ['1', '2', '.', '5']) await sheet.locator(`[data-key="${k}"]`).click();
    await sheet.locator('[data-key="↵"]').click();
    await expect(sheet).toHaveCount(0);
    await expect(page.locator('[data-row="117"] [data-value]')).toHaveText('12.5 mm');
    await expect(page.locator('[data-row="117"]')).toHaveAttribute('data-changed', 'true');
  });

  test('integer parameters have no decimal point key', async ({ page }) => {
    await open(page, 'screen/hmi', { level: 3 });
    await page.locator('[data-row="613"]').click(); // stand-by timer → slider
    await expect(page.locator('[data-sheet] [data-slider]')).toBeVisible();
    await page.locator('[data-sheet] button[data-action="close"]').click();
    await open(page, 'screen/start', { level: 3 });
    await page.locator('[data-row="145"]').click(); // start delay time, integer 0–10000
    const sheet = page.locator('[data-sheet]');
    await expect(sheet.locator('[data-numpad]')).toBeVisible();
    await expect(sheet.locator('[data-key="."]')).toHaveCount(0); // integer layout: no decimal point
  });

  test('slider: steppers move one step, value applies on release', async ({ page }, testInfo) => {
    await open(page, 'screen/speed', { level: 2 });
    await hideDev(page);
    await page.locator('[data-row="122"]').click(); // Fixed Speed 1–60, slider
    const sheet = page.locator('[data-sheet]');
    await expect(sheet.locator('[data-slider-value]')).toHaveText('30');
    await sheet.locator('[data-action="inc"]').click();
    await expect(sheet.locator('[data-slider-value]')).toHaveText('30.5');
    await expect(page.locator('[data-row="122"] [data-value]')).toHaveText('30.5 m/min');
    await shot(page, testInfo, 'editor-slider');
    await sheet.locator('input[type=range]').fill('60');
    await expect(sheet.locator('[data-slider]')).toHaveAttribute('data-state', 'max');
    await expect(sheet.locator('[data-action="inc"]')).toHaveAttribute('aria-disabled', 'true');
  });

  test('text keyboard: device name with shift and symbols, saved on enter', async ({
    page,
  }, testInfo) => {
    await open(page, 'screen/hmi', { level: 3 });
    await hideDev(page);
    await page.locator('[data-row="600"]').click();
    const sheet = page.locator('[data-sheet]');
    await expect(sheet.locator('[data-keyboard]')).toBeVisible();
    for (let i = 0; i < 14; i++) await sheet.locator('[data-key="⌫"]').click();
    await sheet.locator('[data-key="⇧"]').click();
    await sheet.locator('[data-key="X"]').click();
    await sheet.locator('[data-key="l"]').click();
    await sheet.locator('[data-key="s"]').click();
    await sheet.locator('[data-key="123"]').click();
    await sheet.locator('[data-key="2"]').click();
    await shot(page, testInfo, 'editor-text');
    await sheet.locator('[data-key="↵"]').click();
    await expect(sheet).toHaveCount(0);
    await expect(page.locator('[data-row="600"] [data-value]')).toHaveText('Xls2');
  });

  test('machine-moving action asks for confirmation', async ({ page }) => {
    await open(page, 'screen/applicatortest', { level: 3 });
    await page.locator('[data-row="807"]').click(); // applicator test cycle (action)
    const modal = page.locator('.modal');
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute('data-kind', 'confirm');
    await modal.locator('[data-action="cancel"]').click();
    await expect(modal).toHaveCount(0);
  });
});
