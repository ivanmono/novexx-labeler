import { test, expect } from '@playwright/test';
import { open, shot, hideDev } from './helpers.js';

test.describe('home', () => {
  test('level 0: start leads to login; quick links lead to login', async ({ page }, testInfo) => {
    await open(page, '', { level: 0 });
    await hideDev(page);
    await expect(page.locator('[data-home]')).toHaveAttribute('data-state', 'ready');
    await expect(page.locator('[data-quicklinks] button')).toHaveCount(4);
    await shot(page, testInfo, 'home-L0');
    await page.locator('[data-action="toggle"]').click();
    await expect(page).toHaveURL(/#\/login$/);
    await page.goBack();
  });

  test('level 1: start asks for confirmation, then runs; pause is immediate', async ({ page }) => {
    await open(page, '', { level: 1 });
    await page.locator('[data-action="toggle"]').click();
    await expect(page.locator('.modal[data-kind="confirm"]')).toBeVisible();
    await page.locator('.modal [data-action="ok"]').click();
    await expect(page.locator('[data-home]')).toHaveAttribute('data-state', 'run');
    await page.locator('[data-action="toggle"]').click();
    await expect(page.locator('[data-home]')).toHaveAttribute('data-state', 'pause');
  });

  test('errors show a banner and an overlay; reset clears the alarm', async ({ page }, testInfo) => {
    await open(page, '', { level: 1, state: 'alarm' });
    await hideDev(page);
    await expect(page.locator('[data-home]')).toHaveAttribute('data-state', 'alarm');
    await expect(page.locator('.home__banner')).toContainText('1 error');
    await shot(page, testInfo, 'home-alarm');
    await page.locator('.home__banner').click();
    await expect(page.locator('[data-error-overlay]')).toBeVisible();
    await shot(page, testInfo, 'home-alarm-overlay');
    await page.locator('[data-action="resetAlarm"]').click();
    await expect(page.locator('[data-home]')).toHaveAttribute('data-state', 'ready');
    await expect(page.locator('.home__banner')).toHaveCount(0);
  });

  test('quick link opens the parameter screen at level 1', async ({ page }) => {
    await open(page, '', { level: 1 });
    await page.locator('[data-quicklinks] button').first().click();
    await expect(page).toHaveURL(/#\/screen\/speed$/);
  });
});

test.describe('login', () => {
  test('profile list, wrong password, correct password, log out', async ({ page }, testInfo) => {
    await open(page, 'login', { level: 0 });
    await hideDev(page);
    await expect(page.locator('[data-profiles] button')).toHaveCount(5);
    await shot(page, testInfo, 'login-profiles');
    await page.locator('[data-profiles] button[data-id="u2"]').click();
    await expect(page.locator('[data-password]')).toBeVisible();
    await shot(page, testInfo, 'login-password');
    for (const k of ['9', '9']) await page.locator(`[data-numpad] [data-key="${k}"]`).click();
    await page.locator('[data-numpad] [data-key="↵"]').click();
    await expect(page.locator('[data-error]')).toHaveText('Wrong password');
    for (const k of ['1', '1', '1', '1']) await page.locator(`[data-numpad] [data-key="${k}"]`).click();
    await page.locator('[data-numpad] [data-key="↵"]').click();
    await expect(page.locator('.nav-bar')).toHaveAttribute('data-level', '1');
    await expect(page).toHaveURL(/#\/home$/);
    // user screen + logout
    await page.locator('.nav-bar [data-action="user"]').click();
    await expect(page).toHaveURL(/#\/user$/);
    await shot(page, testInfo, 'user');
    await page.locator('[data-action="logout"]').click();
    await page.locator('.modal [data-action="ok"]').click();
    await expect(page.locator('.nav-bar')).toHaveAttribute('data-level', '0');
  });

  test('alphabetical keyboard: shift is one-shot, symbols layout, backspace', async ({ page }) => {
    await open(page, 'login', { level: 0 });
    await page.locator('[data-profiles] button[data-id="u1"]').click();
    await page.locator('[data-action="mode"]').click();
    await page.locator('[data-action="toggleShow"]').click();
    const key = (k) => page.locator(`[data-keyboard] [data-key="${k}"]`);
    await key('⇧').click();
    await key('A').click();
    await key('b').click();
    await key('123').click();
    await key('1').click();
    await key('abc').click();
    await key('⌫').click();
    await expect(page.locator('[data-field]')).toHaveText('Ab');
  });

  test('disabled account is rejected', async ({ page }) => {
    await open(page, 'login', { level: 0 });
    await page.locator('[data-profiles] button[data-id="u5"]').click({ force: true });
    await expect(page.locator('[data-password]')).toHaveCount(0);
  });
});

test.describe('stand-by', () => {
  test('stand-by layer appears and a touch wakes the display', async ({ page }, testInfo) => {
    await open(page, '', { level: 1, state: 'standby' });
    await hideDev(page);
    await expect(page.locator('[data-standby]')).toBeVisible();
    await expect(page.locator('.status-bar')).toHaveAttribute('data-status', 'standby');
    await shot(page, testInfo, 'standby');
    await page.locator('[data-standby]').click();
    await expect(page.locator('[data-standby]')).toHaveCount(0);
    await expect(page.locator('.status-bar')).toHaveAttribute('data-status', 'ready');
  });
});
