import { test, expect } from '@playwright/test';

// Phase 0 smoke test: the token sheet renders in both themes and the dev API works.
// Screenshots are the baseline that later Figma syncs and design tweaks compare against.
for (const theme of ['dark', 'light']) {
  test(`styleguide tokens render in ${theme} theme`, async ({ page }, testInfo) => {
    await page.goto('/?nosplash#/styleguide');
    await page.waitForFunction(() => window.__hmi?.ctx);
    await page.evaluate((t) => window.__hmi.set('theme', t), theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.getByRole('heading', { name: 'Styleguide · tokens' })).toBeVisible();
    // every swatch resolved to a colour, none transparent
    const bad = await page.$$eval('[data-sg-color]', (els) =>
      els.filter((el) => /rgba\(0, 0, 0, 0\)|^$/.test(el.textContent)).map((el) => el.dataset.sgColor),
    );
    expect(bad).toEqual([]);
    // icons from the sprite resolve
    const icons = await page.locator('svg.icon use').count();
    expect(icons).toBeGreaterThan(60);
    await page.screenshot({
      path: testInfo.outputPath(`styleguide-${testInfo.project.name}-${theme}.png`),
      fullPage: false,
    });
  });
}
