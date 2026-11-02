/**
 * Capture screen states as Figma-ready JSON (serialize-dom.js) with Playwright.
 *
 *   node scripts/figma/capture.mjs [outDir] [--base http://127.0.0.1:5173] [--only home,login]
 *
 * Writes <outDir>/<name>.json per state plus <outDir>/index.json. Frame names follow
 * docs/FIGMA.md: `<screen> / <theme> / <orientation> / <state>`.
 */
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const outDir = resolve(args.find((a) => !a.startsWith('--')) ?? 'test-results/figma');
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://127.0.0.1:5173';
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const serializer = readFileSync(resolve(here, 'serialize-dom.js'), 'utf8');

/** @type {Array<{name:string, screen:string, theme:'dark'|'light', orientation:string, route:string, level?:number, state?:string, steps?:(page)=>Promise<void>}>} */
const STATES = [
  {
    screen: 'home',
    theme: 'dark',
    orientation: 'portrait',
    state: 'ready-L0',
    route: '',
    level: 0,
  },
  {
    screen: 'home',
    theme: 'dark',
    orientation: 'portrait',
    state: 'running-L1',
    route: '',
    level: 1,
    machine: 'run',
  },
  {
    screen: 'home',
    theme: 'dark',
    orientation: 'portrait',
    state: 'alarm-L1',
    route: '',
    level: 1,
    machine: 'alarm',
  },
  {
    screen: 'home',
    theme: 'dark',
    orientation: 'portrait',
    state: 'alarm-overlay-L1',
    route: '',
    level: 1,
    machine: 'alarm',
    steps: async (page) => {
      await page.click('[data-action="errors"]');
      await page.waitForSelector('[data-error-overlay]');
    },
  },
  {
    screen: 'login',
    theme: 'dark',
    orientation: 'portrait',
    state: 'profiles',
    route: 'login',
    level: 0,
  },
  {
    screen: 'login',
    theme: 'dark',
    orientation: 'portrait',
    state: 'password-numpad',
    route: 'login',
    level: 0,
    steps: async (page) => {
      await page.click('[data-action="pick"][data-id="u2"]');
      await page.waitForSelector('[data-numpad]');
      await page.click('[data-numpad] [data-key="1"]');
      await page.click('[data-numpad] [data-key="1"]');
    },
  },
  {
    screen: 'login',
    theme: 'dark',
    orientation: 'portrait',
    state: 'password-keyboard',
    route: 'login',
    level: 0,
    steps: async (page) => {
      await page.click('[data-action="pick"][data-id="u1"]');
      await page.waitForSelector('[data-numpad]');
      await page.click('[data-action="mode"]');
      await page.waitForSelector('[data-keyboard]');
    },
  },
  {
    screen: 'login',
    theme: 'dark',
    orientation: 'portrait',
    state: 'password-wrong',
    route: 'login',
    level: 0,
    steps: async (page) => {
      await page.click('[data-action="pick"][data-id="u2"]');
      await page.waitForSelector('[data-numpad]');
      await page.click('[data-numpad] [data-key="9"]');
      await page.click('[data-numpad] [data-key="↵"]');
      await page.waitForFunction(
        () => document.querySelector('[data-error]')?.textContent.trim().length > 0,
      );
    },
  },
  // start-up (docx §8.17): progress against previous boots, "still starting", failed start; no bars
  ...[
    ['booting', { booted: false, bootProgress: 0.45, bootLong: false, bootError: null }],
    ['still-starting', { booted: false, bootProgress: 0.99, bootLong: true, bootError: null }],
    [
      'failed',
      {
        booted: false,
        bootProgress: 0.6,
        bootLong: false,
        bootError: 'E-900 Firmware image signature invalid',
      },
    ],
  ].map(([state, machine]) => ({
    screen: 'startup',
    theme: 'dark',
    orientation: 'portrait',
    state,
    route: '',
    level: 0,
    steps: async (page) => {
      await page.evaluate((m) => {
        window.__hmi.store.set('machine', m);
        window.__hmi.go('startup');
      }, machine);
      await page.waitForSelector('[data-startup]');
      await page.waitForTimeout(400); // progress bar width transition
    },
  })),
  {
    screen: 'user',
    theme: 'dark',
    orientation: 'portrait',
    state: 'L1',
    route: '',
    level: 1, // set before navigating: the user screen redirects to login at level 0
    steps: async (page) => {
      await page.evaluate(() => window.__hmi.go('user'));
      await page.waitForFunction(() => location.hash.includes('user'));
      await page.waitForTimeout(150);
    },
  },
  {
    screen: 'standby',
    theme: 'dark',
    orientation: 'portrait',
    state: 'dimmed',
    route: '',
    level: 0,
    steps: async (page) => {
      await page.evaluate(() => window.__hmi.set('state', 'standby'));
      await page.waitForSelector('[data-standby]');
    },
  },
  {
    screen: 'home',
    theme: 'light',
    orientation: 'portrait',
    state: 'ready-L0',
    route: '',
    level: 0,
  },
  {
    screen: 'startup',
    theme: 'light',
    orientation: 'portrait',
    state: 'booting',
    route: '',
    level: 0,
    steps: async (page) => {
      await page.evaluate(() => {
        window.__hmi.store.set('machine', {
          booted: false,
          bootProgress: 0.45,
          bootLong: false,
          bootError: null,
        });
        window.__hmi.go('startup');
      });
      await page.waitForSelector('[data-startup]');
      await page.waitForTimeout(400);
    },
  },
  {
    screen: 'login',
    theme: 'light',
    orientation: 'portrait',
    state: 'profiles',
    route: 'login',
    level: 0,
  },
  // Phase 2 (P2-16): menus, parameter lists and editors
  {
    screen: 'menu',
    theme: 'dark',
    orientation: 'portrait',
    state: 'root-L1',
    route: 'screen/root',
    level: 1,
  },
  {
    screen: 'menu',
    theme: 'dark',
    orientation: 'portrait',
    state: 'options-L3',
    route: 'screen/options',
    level: 3,
  },
  {
    screen: 'menu',
    theme: 'dark',
    orientation: 'portrait',
    state: 'digitalio-L3',
    route: 'screen/digitalio',
    level: 3,
  },
  {
    screen: 'list',
    theme: 'dark',
    orientation: 'portrait',
    state: 'speed-L2',
    route: 'screen/speed',
    level: 2,
  },
  {
    screen: 'list',
    theme: 'dark',
    orientation: 'portrait',
    state: 'hmi-L3',
    route: 'screen/hmi',
    level: 3,
  },
  {
    screen: 'list',
    theme: 'dark',
    orientation: 'portrait',
    state: 'usersettings-L3',
    route: 'screen/usersettings',
    level: 3,
  },
  {
    screen: 'editor',
    theme: 'dark',
    orientation: 'portrait',
    state: 'select',
    route: 'screen/speed',
    level: 3,
    steps: async (page) => {
      await page.click('[data-row="118"]');
      await page.waitForSelector('[data-sheet] .option-row');
    },
  },
  {
    screen: 'editor',
    theme: 'dark',
    orientation: 'portrait',
    state: 'numeric-error',
    route: 'screen/label',
    level: 2,
    steps: async (page) => {
      await page.click('[data-row="117"]');
      await page.waitForSelector('[data-sheet] [data-numpad]');
      for (const k of ['3', '0', '0', '0']) await page.click(`[data-sheet] [data-key="${k}"]`);
      await page.click('[data-sheet] [data-key="↵"]');
      await page.waitForFunction(
        () => document.querySelector('[data-sheet] [data-error]')?.textContent.length > 0,
      );
    },
  },
  {
    screen: 'editor',
    theme: 'dark',
    orientation: 'portrait',
    state: 'slider',
    route: 'screen/speed',
    level: 2,
    steps: async (page) => {
      await page.click('[data-row="122"]');
      await page.waitForSelector('[data-sheet] [data-slider]');
    },
  },
  {
    screen: 'editor',
    theme: 'dark',
    orientation: 'portrait',
    state: 'help',
    route: 'screen/speed',
    level: 2,
    steps: async (page) => {
      await page.click('[data-help-for="122"]');
      await page.waitForSelector('.modal [data-help-body]');
    },
  },
].map((s) => ({ ...s, name: `${s.screen} / ${s.theme} / ${s.orientation} / ${s.state}` }));

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();

// --components: serialize the component sheet (#/components) → components.json, one entry per variant
if (args.includes('--components')) {
  const page = await browser.newPage({
    viewport: { width: 480, height: 800 },
    deviceScaleFactor: 1,
  });
  await page.goto(`${base}/?nosplash#/components`);
  await page.waitForFunction(() => window.__hmi?.ctx);
  await page.evaluate(() => {
    window.__hmi.set('theme', 'dark');
    window.__hmi.set('lang', 'en');
    window.__hmi.ctx.toast.hide();
  });
  await page.waitForSelector('[data-components]');
  await page.evaluate(() => document.fonts.ready);
  await page.addScriptTag({ content: serializer });
  const sets = await page.evaluate(() => window.__hmiSerializeComponents());
  writeFileSync(resolve(outDir, 'components.json'), JSON.stringify(sets));
  console.log(`captured ${sets.length} variants → components.json`);
  await browser.close();
  process.exit(0);
}

const index = [];
for (const s of STATES) {
  if (only && !only.includes(s.screen)) continue;
  const landscape = s.orientation.startsWith('landscape');
  const page = await browser.newPage({
    viewport: landscape ? { width: 800, height: 480 } : { width: 480, height: 800 },
    deviceScaleFactor: 1,
  });
  await page.goto(`${base}/?nosplash#/${s.route}`);
  await page.waitForFunction(() => window.__hmi?.ctx);
  await page.evaluate(
    ({ theme, orientation, level, machine }) => {
      const api = window.__hmi;
      api.set('theme', theme);
      api.set('lang', 'en');
      api.set('orientation', orientation);
      api.set('level', String(level ?? 0));
      if (machine) api.set('state', machine);
      api.ctx.toast.hide();
    },
    { theme: s.theme, orientation: s.orientation, level: s.level, machine: s.machine },
  );
  if (s.steps) await s.steps(page);
  await page.evaluate(() => {
    window.__hmi.ctx.toast.hide();
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  await page.addScriptTag({ content: serializer });
  const data = await page.evaluate(() => window.__hmiSerialize());
  const file = `${s.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`;
  writeFileSync(resolve(outDir, file), JSON.stringify({ name: s.name, ...data }));
  await page.screenshot({ path: resolve(outDir, file.replace(/\.json$/, '.png')) });
  index.push({ name: s.name, file, w: data.w, h: data.h });
  console.log(`captured ${s.name} → ${file}`);
  await page.close();
}
writeFileSync(resolve(outDir, 'index.json'), JSON.stringify(index, null, 2));
await browser.close();
