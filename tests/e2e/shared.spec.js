import { test, expect } from '@playwright/test';
import { open, shot } from './helpers.js';

// P3-01 shared pieces on the styleguide: file browser flow, shared confirmation, scroll indication.
test.describe('shared pieces (P3-01)', () => {
  test('file browser: open a folder, pick a file, foreign files stay greyed, one level up', async ({
    page,
  }) => {
    await open(page, 'styleguide');
    const fb = page.locator('[data-sg-files]');
    await fb.locator('[data-id="firmware"]').click();
    await expect(fb.locator('[data-path]')).toContainText('firmware');
    await fb.locator('[data-id="XLS22x_v1.01.fw"]').click();
    await expect(fb.locator('[aria-selected="true"]')).toHaveAttribute(
      'data-id',
      'XLS22x_v1.01.fw',
    );
    await fb.locator('[data-id="notes.pdf"]').click({ force: true });
    await expect(fb.locator('[aria-selected="true"]')).toHaveAttribute(
      'data-id',
      'XLS22x_v1.01.fw',
    );
    await expect(fb.locator('[data-list-end]')).toBeVisible();
    await fb.locator('[data-id=".."]').click();
    await expect(fb.locator('[data-id=".."]')).toHaveCount(0);
  });

  test('shared confirmation: load is refused while running, delete is destructive', async ({
    page,
  }) => {
    await open(page, 'styleguide', { state: 'run' });
    const modals = page.locator('.modal');
    const samples = await modals.count(); // the styleguide shows sample dialogs inline
    await page.locator('[data-action="sgConfirm"]').click();
    await expect(modals).toHaveCount(samples);
    await page.locator('[data-action="sgDestroy"]').click();
    await expect(modals).toHaveCount(samples + 1);
    const modal = modals.last();
    await expect(modal).toHaveAttribute('data-kind', 'confirm');
    await expect(modal.locator('[data-action="ok"]')).toHaveClass(/bg-status-error/);
    await modal.locator('[data-action="cancel"]').click();
    await expect(modals).toHaveCount(samples);
  });

  test('scroll indication shows while more follows and goes at the end', async ({ page }) => {
    await open(page, 'styleguide');
    const hint = page.locator('.scroll-hint').first();
    await expect(hint).toHaveAttribute('data-more', '');
    await hint.locator('[data-sg-scroll]').evaluate((el) => {
      el.scrollTop = el.scrollHeight;
      el.dispatchEvent(new Event('scroll'));
    });
    await expect(hint).not.toHaveAttribute('data-more', '');
  });

  for (const theme of ['dark', 'light']) {
    test(`shared sections render (${theme})`, async ({ page }, testInfo) => {
      await open(page, 'styleguide', { theme });
      const head = page.getByRole('heading', { name: 'Styleguide · shared pieces (Phase 3)' });
      await head.scrollIntoViewIfNeeded();
      await expect(page.locator('[data-cmp="TableRow"]')).toHaveCount(6);
      await expect(page.locator('[data-cmp="ProgressResult"]')).toHaveCount(3);
      await expect(page.locator('[data-cmp="Placeholder"]')).toHaveCount(4);
      await shot(page, testInfo, `shared-${theme}`);
    });
  }
});
