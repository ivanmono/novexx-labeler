import { test, expect } from '@playwright/test';
import { open, shot, hideDev } from './helpers.js';

/**
 * Phase 2 closing flows (P2-15) and the §7.3 checklist items not covered by the per-editor specs
 * (P2-14): the full path home → menu → parameter → edit → back, the action button's pressed state,
 * the IP field explaining rejected keys, and the representative lists in all six layout × theme
 * combinations.
 */
test.describe('phase 2 flows (P2-10, P2-14, P2-15)', () => {
  test('home → menu → Settings → Label → edit → back to home', async ({ page }) => {
    await open(page, 'home', { level: 2 });
    await page.locator('.nav-bar [data-action="menu"]').click();
    await expect(page).toHaveURL(/#\/screen\/root$/);
    await page.locator('.menu-tile[data-id="settings"]').click();
    await page.locator('.menu-tile[data-id="label"]').click();
    await expect(page).toHaveURL(/#\/screen\/label$/);
    await page.locator('[data-row="117"]').click();
    const sheet = page.locator('[data-sheet]');
    await sheet.locator('[data-key="C"]').click();
    for (const k of ['2', '5', '0']) await sheet.locator(`[data-key="${k}"]`).click();
    await sheet.locator('[data-key="↵"]').click(); // one confirm (§7.3)
    await expect(sheet).toHaveCount(0);
    await expect(page.locator('[data-row="117"] [data-value]')).toHaveText('250 mm');
    const back = page.locator('.nav-bar [data-action="back"]');
    await back.click();
    await expect(page).toHaveURL(/#\/screen\/settings$/);
    await back.click();
    await expect(page).toHaveURL(/#\/screen\/root$/);
    await back.click();
    await expect(page).toHaveURL(/#\/home$/);
    // the value survived the round trip
    expect(await page.evaluate(() => window.__hmi.store.getParam(117))).toBe(250);
  });

  test('action button: pressed while its confirmation is open, then runs', async ({ page }, testInfo) => {
    await open(page, 'screen/applicatortest', { level: 3 });
    await hideDev(page);
    const row = page.locator('[data-row="804"]');
    await expect(row.locator('.param-action')).toBeVisible();
    await row.click();
    await expect(row).toHaveAttribute('data-armed', 'true');
    await shot(page, testInfo, 'action-armed');
    const modal = page.locator('.modal');
    await modal.locator('[data-action="ok"]').click();
    await expect(modal).toHaveCount(0);
    await expect(row).not.toHaveAttribute('data-armed', 'true');
    await expect(page.locator('.toast')).toHaveAttribute('data-kind', 'ok');
  });

  test('IP field explains a key it cannot take instead of dropping it', async ({ page }) => {
    await open(page, 'screen/network', { level: 3 });
    await page.locator('[data-row="108"]').click();
    const sheet = page.locator('[data-sheet]');
    await expect(sheet.locator('[data-error]')).toHaveText('');
    for (let i = 0; i < 3; i++) await sheet.locator('[data-key="⌫"]').click();
    await sheet.locator('[data-key="#"], [data-key="-"], [data-key="@"]').first().click();
    await expect(sheet.locator('[data-error]')).toContainText('192.168.0.10');
  });

  for (const theme of ['dark', 'light']) {
    test(`Speed, Start and HMI lists render in every layout (${theme})`, async ({ page }, testInfo) => {
      const orientations =
        testInfo.project.name === 'portrait' ? ['portrait'] : ['landscape-lh', 'landscape-rh'];
      for (const orientation of orientations) {
        for (const id of ['speed', 'start', 'hmi']) {
          await open(page, `screen/${id}`, { level: 4, theme, orientation });
          await hideDev(page);
          const list = page.locator('[data-list]');
          await expect(list).toHaveAttribute('data-list', id);
          expect(Number(await list.getAttribute('data-rows'))).toBeGreaterThan(0);
          await shot(page, testInfo, `list6-${id}`);
        }
      }
    });
  }
});
