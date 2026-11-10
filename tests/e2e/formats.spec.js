import { test, expect } from '@playwright/test';
import { open, shot } from './helpers.js';

// P3-02 … P3-04: Select, Modify and Create Format (docx §8.1–8.3), portrait and landscape.
const store = (page, fn, arg) => page.evaluate(fn, arg);
const lastModal = (page) => page.locator('.modal').last();
const typeName = async (page, text) => {
  for (const ch of text) await page.locator(`[data-key="${ch === ' ' ? '␣' : ch}"]`).click();
};

test.describe('formats (P3-02 … P3-04)', () => {
  test('select: pick, confirm naming the format, load', async ({ page }) => {
    await open(page, 'screen/selectformat', { level: 1 });
    const rows = page.locator('[data-cmp="ListRow"]');
    await expect(rows).toHaveCount(6);
    await expect(page.locator('[data-tag]')).toHaveCount(1);
    await expect(page.locator('[data-id="f-standard"] [data-tag]')).toBeVisible();
    // nothing selected yet: the button explains instead of loading
    await page.locator('[data-format-actions] [data-action="nopick"]').click();
    await expect(page.locator('.modal')).toHaveCount(0);
    await page.locator('[data-id="f-pharma"]').click();
    await expect(page.locator('[data-format-status]')).toContainText('3 parameters differ');
    await page.locator('[data-action="load"]').click();
    await expect(lastModal(page)).toContainText('Pharma small');
    await expect(lastModal(page)).toContainText('unsaved changes are lost');
    await lastModal(page).locator('[data-action="ok"]').click();
    await expect(page.locator('[data-id="f-pharma"] [data-tag]')).toBeVisible();
    await expect(page.locator('[data-format-status]')).toContainText('No differences');
    expect(await store(page, () => window.__hmi.ctx.store.getParam(117))).toBe(35);
  });

  test('select: loading is blocked while the machine runs', async ({ page }) => {
    await open(page, 'screen/selectformat', { level: 1, state: 'run' });
    await page.locator('[data-id="f-pharma"]').click();
    await expect(page.locator('[data-format-status="warning"]')).toContainText('Stop the machine');
    await page.locator('[data-format-actions] [data-action="running"]').click();
    await expect(page.locator('.modal')).toHaveCount(0);
  });

  test('modify: loaded format pre-selected, no-differences state, destructive overwrite', async ({
    page,
  }) => {
    await open(page, 'screen/modifyformat', { level: 2 });
    await expect(page.locator('[aria-selected="true"]')).toHaveAttribute('data-id', 'f-standard');
    await expect(page.locator('[data-format-status="ok"]')).toContainText('No differences');
    await expect(page.locator('[data-format-actions] [data-action="nodiff"]')).toBeVisible();
    await store(page, () => window.__hmi.ctx.store.setParam(117, 42));
    await expect(page.locator('[data-format-status]')).toContainText('1 parameter differs');
    await page.locator('[data-action="overwrite"]').click();
    const modal = lastModal(page);
    await expect(modal).toContainText('Standard 100x50');
    await expect(modal.locator('[data-action="ok"]')).toHaveClass(/bg-status-error/);
    await modal.locator('[data-action="ok"]').click();
    await expect(page.locator('[data-format-status="ok"]')).toContainText('No differences');
    const v = await store(
      page,
      () => window.__hmi.ctx.store.get('formats').find((f) => f.id === 'f-standard').values['117'],
    );
    expect(v).toBe(42);
  });

  test('modify: overwriting needs level 2', async ({ page }) => {
    await open(page, 'screen/modifyformat', { level: 1 });
    await expect(page.locator('[data-format-actions] [data-action="locked"]')).toBeVisible();
  });

  test('create: duplicate handled inline with an overwrite offer; new name saves and returns', async ({
    page,
  }) => {
    await open(page, 'screen/createformat', { level: 2 });
    await typeName(page, 'test roll');
    await expect(page.locator('[data-error]')).toContainText('Test roll already exists');
    await expect(page.locator('[data-action="overwriteInstead"]')).toBeVisible();
    await page.locator('[data-key="↵"]').click(); // Save does not save a duplicate
    await expect(page.locator('[data-create-format]')).toBeVisible();
    for (let i = 0; i < 4; i++) await page.locator('[data-key="⌫"]').click();
    await typeName(page, 'ab');
    await expect(page.locator('[data-action="overwriteInstead"]')).toHaveCount(0);
    await page.locator('[data-key="↵"]').click();
    await expect(page).toHaveURL(/#\/screen\/formats$/);
    const names = await store(page, () => window.__hmi.ctx.store.get('formats').map((f) => f.name));
    expect(names).toContain('test ab');
  });

  test('create: below level 2 the page says so and offers log in', async ({ page }) => {
    await open(page, 'screen/createformat', { level: 1 });
    await expect(page.locator('[data-create-locked]')).toContainText('Needs access level 2');
  });

  test('empty state when no format is stored', async ({ page }) => {
    await open(page, 'screen/selectformat', { level: 1 });
    await store(page, () => window.__hmi.ctx.store.replace('formats', []));
    await open(page, 'screen/modifyformat', { level: 2 });
    await store(page, () => window.__hmi.ctx.store.replace('formats', []));
    await page.evaluate(() => (location.hash = '#/screen/selectformat'));
    await expect(page.locator('[data-formats-empty]')).toContainText('No format stored yet');
    await page.locator('[data-formats-empty] [data-action="create"]').click();
    await expect(page).toHaveURL(/#\/screen\/createformat$/);
  });

  for (const theme of ['dark', 'light']) {
    test(`format screens render (${theme})`, async ({ page }, testInfo) => {
      await open(page, 'screen/selectformat', { level: 2, theme });
      await page.locator('[data-id="f-bottle330"]').click();
      await shot(page, testInfo, `formats-select-${theme}`);
      await open(page, 'screen/modifyformat', { level: 2, theme });
      await shot(page, testInfo, `formats-modify-${theme}`);
      await open(page, 'screen/createformat', { level: 2, theme });
      await typeName(page, 'carton side');
      await expect(page.locator('[data-action="overwriteInstead"]')).toBeVisible();
      // the keyboard stays on screen with the overwrite offer showing
      const keys = await page.locator('[data-keyboard]').boundingBox();
      const vp = page.viewportSize();
      expect(keys.y + keys.height).toBeLessThanOrEqual(vp.height);
      await shot(page, testInfo, `formats-create-duplicate-${theme}`);
    });
  }
});
