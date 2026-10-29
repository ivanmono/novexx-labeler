/**
 * Playwright harness (plan P1-14). Drives the app through window.__hmi so tests and the
 * screenshot matrix never depend on UI chrome to set up state.
 *
 *   await open(page, 'screen/speed', { level: 2, state: 'run', theme: 'light' });
 *   await shot(page, testInfo, 'speed');   → test-results/screens/speed--portrait--light.png
 */
export async function open(page, route = '', { level = 0, state = null, theme = 'dark', orientation = null, lang = 'en', nosplash = true } = {}) {
  await page.goto(`/${nosplash ? '?nosplash' : ''}#/${route}`);
  await page.waitForFunction(() => window.__hmi?.ctx);
  if (!orientation) {
    const vp = page.viewportSize();
    orientation = vp && vp.width > vp.height ? 'landscape-lh' : 'portrait';
  }
  await page.evaluate(
    ({ level, state, theme, orientation, lang }) => {
      const api = window.__hmi;
      api.set('theme', theme);
      api.set('lang', lang);
      if (orientation) api.set('orientation', orientation);
      if (level != null) api.set('level', String(level));
      if (state) api.set('state', state);
    },
    { level, state, theme, orientation, lang },
  );
  await page.evaluate(() => { window.__hmi.ctx.toast.hide(); });
}

export async function shot(page, testInfo, name, { fullPage = false } = {}) {
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  const orientation = await page.evaluate(() => document.documentElement.dataset.orientation);
  const file = `${name}--${orientation}--${theme}.png`;
  await page.screenshot({ path: testInfo.outputPath(file), fullPage });
  return file;
}

/** Hide the dev tab so it never appears in screenshots. */
export async function hideDev(page) {
  await page.addStyleTag({ content: '#dev-panel{display:none!important}' });
}
