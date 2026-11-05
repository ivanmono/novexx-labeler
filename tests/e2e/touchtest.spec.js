import { test, expect } from '@playwright/test';

// Dev touch test (#/touchtest): taps on the exact target centres must read as an accurate panel,
// and every button size must be hit.
test('touch test: accuracy and sizes on exact taps', async ({ page }) => {
  await page.goto('/?nosplash#/touchtest');
  const layer = page.locator('[data-touchtest]');
  await expect(layer).toHaveAttribute('data-touchtest', 'menu');

  await layer.locator('[data-tt="accuracy"]').click();
  for (let i = 0; i < 18; i++) {
    const [x, y] = (await layer.locator('[data-tt-target]').getAttribute('data-tt-target')).split(',').map(Number);
    await page.mouse.click(x, y);
    if (i < 17) await expect(layer.locator('.text-title')).toHaveText(`${i + 2} / 18`);
  }
  await expect(layer.locator('[data-tt-verdict]')).toHaveAttribute('data-tt-verdict', 'accurate');
  await expect(layer.locator('[data-tt-summary]')).toContainText('0.0 mm');

  await layer.locator('[data-tt="back"]').click();
  await layer.locator('[data-tt="sizes"]').click();
  for (let i = 0; i < 36; i++) {
    const box = await layer.locator('[data-tt-button]').boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    if (i < 35) await expect(layer.locator('.text-title')).toHaveText(`${i + 2} / 36`);
  }
  await expect(layer.locator('[data-tt-verdict]')).toHaveAttribute('data-tt-verdict', '5');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('hmi.touchtest')));
  expect(saved.accuracy.samples).toHaveLength(18);
  expect(saved.sizes.samples).toHaveLength(36);

  await layer.locator('[data-tt="back"]').click();
  await layer.locator('[data-tt="close"]').click();
  await expect(page.locator('[data-touchtest]')).toHaveCount(0);
  await expect(page.locator('[data-home]')).toBeVisible();
});
