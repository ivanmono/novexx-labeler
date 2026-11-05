/**
 * Application context and boot. main.js calls `boot(root)`.
 *
 *   data → store (+ persisted snapshot) → i18n/theme/orientation bound to params
 *   → simulator → shell → router → screens
 */
import paramsJson from './data/params.json';
import optionsJson from './data/options.json';
import treeJson from './data/menu-tree.json';
import masksJson from './data/masks.json';
import machineSeed from './data/seed/machine.json';
import usersSeed from './data/seed/users.json';

import { createStore } from './core/store.js';
import { loadSnapshot, autoSave, factoryReset } from './core/persist.js';
import { createRouter, parseRoute, toScreenRoute } from './core/router.js';
import { createSimulator } from './core/simulator.js';
import { setTheme, setOrientation, ORIENTATION_BY_OPTION, onDisplayChange, getTheme, getOrientation } from './core/theme.js';
import { t, setLanguage, setTemporaryLanguage, clearTemporaryLanguage, languageFromOption, onLanguageChange, currentLanguage } from './core/i18n.js';
import { canOpenNode } from './core/access.js';
import { mountAppShell } from './ui/shell/AppShell.js';
import { injectSprite } from './ui/components/Icon.js';
import { mountDevPanel } from './ui/dev/DevPanel.js';
import { screens } from './ui/screens/index.js';

export async function boot(root, { skipBoot = false } = {}) {
  // ---- static data ---------------------------------------------------------
  const paramsById = new Map(paramsJson.map((p) => [p.id, p]));
  // Favourites is a view on the user's starred parameters, not a tree node from the diagram
  // (docx §6.2): placed under Settings at runtime until the data pipeline carries it.
  const settingsNode = treeJson.children.find((n) => n.id === 'settings');
  if (settingsNode && !settingsNode.children.some((n) => n.id === 'favourites'))
    settingsNode.children.unshift({ id: 'favourites', title: 'Favourites', subtitle: null, icon: 'listeye', kind: 'favourites', branch: 'settings', depth: 2, parent: 'settings', path: ['Main Menu', 'Settings', 'Favourites'], children: [] });
  const nodesById = new Map();
  (function walk(n) {
    nodesById.set(n.id, n);
    n.children?.forEach(walk);
  })(treeJson);
  const data = { params: paramsJson, paramsById, options: optionsJson, optionsById: new Map(optionsJson.map((o) => [o.id, o])), tree: treeJson, nodesById, masks: masksJson, machine: machineSeed };

  // ---- store ---------------------------------------------------------------
  const initialParams = Object.fromEntries(paramsJson.map((p) => [String(p.id), p.value ?? p.default ?? null]));
  const snap = loadSnapshot();
  const store = createStore({
    params: { ...initialParams, ...(snap?.params ?? {}) },
    users: snap?.users ?? usersSeed.users,
    formats: snap?.formats ?? [],
    logs: snap?.logs ?? [],
    favourites: Array.isArray(snap?.favourites) ? snap.favourites : [],
    settings: snap?.settings ?? { firstStartDone: false },
    session: { level: 0, user: null, elevatedUntil: null, loginAt: null },
    ui: { route: null },
  });
  const stopAutoSave = autoSave(store);

  // ---- language, theme, orientation bound to parameters ---------------------
  const applyLang = () => setLanguage(languageFromOption(Number(store.getParam(500))));
  const applyTheme = () => setTheme(store.getParam(612) ? 'dark' : 'light');
  const applyOrientation = () => setOrientation(ORIENTATION_BY_OPTION[Number(store.getParam(601))] ?? 'portrait');
  applyLang();
  applyTheme();
  applyOrientation();
  store.onParam(500, applyLang);
  store.onParam(612, applyTheme);
  store.onParam(601, applyOrientation);

  // ---- simulator -----------------------------------------------------------
  const sim = createSimulator(store, { machine: machineSeed });
  sim.on((evt, payload) => {
    if (evt === 'error') ctx.log('error', `${payload.code} ${payload.text}`, { code: payload.code, severity: payload.severity });
    if (evt === 'state') ctx.log('state', `${payload.from} → ${payload.to}`);
  });

  // ---- router --------------------------------------------------------------
  const routeListeners = new Set();
  const resolve = (route) => {
    const { head, arg } = parseRoute(route);
    if (head === 'screen' && arg) {
      const node = nodesById.get(arg);
      if (node?.kind === 'ref') return toScreenRoute(node.target);
    }
    return route;
  };
  const router = createRouter({ resolve, onChange: (route, prev, info) => render(route, prev, info) });

  // ---- context -------------------------------------------------------------
  const ctx = {
    store,
    router,
    sim,
    data,
    t,
    shell: null,
    get level() {
      return store.get('session').level;
    },
    get session() {
      return store.get('session');
    },
    node: (id) => nodesById.get(id),
    param: (id) => paramsById.get(Number(id)),
    option: (id) => data.optionsById.get(Number(id)),
    onRoute(fn) {
      routeListeners.add(fn);
      return () => routeListeners.delete(fn);
    },
    onLanguage: onLanguageChange,
    go: (route) => router.go(route),
    goScreen: (id) => router.go(toScreenRoute(id)),
    // an open editor page / sheet is closed first (DT-28): nav back leaves the editor, not the screen
    back: () => (ctx.shell.sheet.isOpen ? ctx.shell.sheet.close() : router.back('home')),
    openMenu() {
      if (ctx.level < 1) {
        ctx.shell.toast.reject(t('toast.needsLevel', { n: 1 }));
        router.go('login');
        return;
      }
      router.go(toScreenRoute('root'));
    },
    openUser() {
      router.go(ctx.level === 0 ? 'login' : 'user');
    },
    canOpen: (node) => canOpenNode(node, ctx.level, paramsById),
    // the favourites slice is a plain array: `store.set` merges patches, so it is replaced whole
    favourites: () => (Array.isArray(store.get('favourites')) ? store.get('favourites') : []),
    isFavourite: (id) => ctx.favourites().includes(Number(id)),
    toggleFavourite(id) {
      const pid = Number(id);
      const cur = ctx.favourites();
      const next = cur.includes(pid) ? cur.filter((x) => x !== pid) : [...cur, pid];
      store.replace('favourites', next);
      ctx.log('favourite', `${ctx.param(pid)?.name ?? pid}: ${next.includes(pid) ? 'added' : 'removed'}`, { pid });
      return next.includes(pid);
    },
    touch: () => sim.touch(),

    // ---- session -----------------------------------------------------------
    login(user) {
      store.set('session', { level: user.level, user: { id: user.id, name: user.name, level: user.level, autoLogoffMin: user.autoLogoffMin }, loginAt: Date.now(), elevatedUntil: null });
      ctx.log('login', user.name, { level: user.level });
      ctx.shell?.toast.ok(t('toast.loggedIn', { name: user.name }));
    },
    logout({ silent = false, stay = false } = {}) {
      const s = store.get('session');
      if (s.user) ctx.log('logout', s.user.name);
      clearTemporaryLanguage();
      store.set('session', { level: 0, user: null, elevatedUntil: null, loginAt: null });
      if (!silent) ctx.shell?.toast.ok(t('toast.loggedOut'));
      if (!stay) router.reset('home');
    },
    elevate(minutes) {
      const until = Date.now() + minutes * 60_000;
      store.set('session', { level: 4, elevatedUntil: until });
      ctx.log('secure', `L4 opened until ${new Date(until).toISOString()}`);
    },
    setTemporaryLanguage,
    currentLanguage,

    /** Audit trail entry (Diagnosis Logs). */
    log(type, detail, extra = {}) {
      const s = store.get('session');
      const entry = { at: Date.now(), type, detail, level: s.level, user: s.user?.name ?? null, ...extra };
      store.set('logs', (logs) => {
        const next = [...logs, entry];
        return next.length > 500 ? next.slice(-500) : next; // FIFO (docx §8.6)
      });
      return entry;
    },

    /** Change a parameter with audit + validation hooks (editors call this). */
    setParam(id, value, { source = 'ui' } = {}) {
      const prev = store.getParam(id);
      const changed = store.setParam(id, value, { source });
      if (changed && source === 'ui') ctx.log('param', `${ctx.param(id)?.name ?? id}: ${prev} → ${value}`, { pid: Number(id), prev, value });
      return changed;
    },

    factoryReset() {
      factoryReset();
      location.hash = '#/';
      location.reload();
    },
  };

  // ---- shell + screens -----------------------------------------------------
  await injectSprite();
  ctx.shell = mountAppShell(root, ctx);
  ctx.toast = ctx.shell.toast;
  ctx.modal = ctx.shell.modal;
  ctx.sheet = ctx.shell.sheet;

  let currentRoute = null;
  function render(route, prev, info) {
    currentRoute = route;
    store.set('ui', { route });
    const { head, arg } = parseRoute(route);
    const screen = screens[head] ?? screens.notFound;
    ctx.shell.sheet.close();
    screen.render(ctx, { arg, route, prev, info });
    for (const fn of routeListeners) fn(route);
  }
  onDisplayChange(() => currentRoute && render(currentRoute, currentRoute, { mode: 'replace' }));
  onLanguageChange(() => currentRoute && render(currentRoute, currentRoute, { mode: 'replace' }));
  root.addEventListener('pointerdown', () => sim.touch(), { passive: true });

  // auto log-off: check every 10 s
  setInterval(() => {
    const s = store.get('session');
    const m = store.get('machine');
    if (s.user && s.user.autoLogoffMin > 0 && Date.now() - m.lastActivityAt > s.user.autoLogoffMin * 60_000) ctx.logout();
    if (s.level === 4 && s.elevatedUntil && Date.now() > s.elevatedUntil) {
      store.set('session', { level: s.user?.level ?? 0, elevatedUntil: null });
      ctx.log('secure', 'L4 closed');
    }
  }, 10_000);

  // ---- dev / test API ------------------------------------------------------
  const api = {
    ctx,
    get(key) {
      return { theme: getTheme(), orientation: getOrientation(), lang: currentLanguage(), level: ctx.level, state: store.get('machine').state }[key];
    },
    set(key, value) {
      if (key === 'theme') ctx.setParam(612, value === 'dark', { source: 'dev' });
      else if (key === 'orientation') ctx.setParam(601, Number(Object.entries(ORIENTATION_BY_OPTION).find(([, v]) => v === value)?.[0] ?? 602), { source: 'dev' });
      else if (key === 'lang') ctx.setParam(500, value === 'de' ? 502 : 501, { source: 'dev' });
      else if (key === 'level') {
        const lvl = Number(value);
        if (lvl === 0) {
          if (ctx.level !== 0) ctx.logout({ silent: true, stay: true });
        } else if (lvl === 4) ctx.elevate(30);
        else {
          const u = store.get('users').find((x) => x.level === lvl && x.enabled) ?? { id: 'dev', name: `dev L${lvl}`, level: lvl, autoLogoffMin: 0 };
          ctx.login(u);
        }
      } else if (key === 'state') {
        const map = { run: 'Run', pause: 'Pause', online: 'Online', offline: 'Offline' };
        if (value === 'alarm') sim.injectError('E-114');
        else if (value === 'warning') sim.injectError('W-012');
        else if (value === 'reset') sim.resetAlarm();
        else if (value === 'standby') sim.enterStandby();
        else sim.command(map[value]);
      }
    },
    subscribe(fn) {
      onDisplayChange(fn);
      onLanguageChange((l) => fn('lang', l));
      store.subscribe((s) => s.session.level, (l) => fn('level', String(l)));
    },
    go: (r) => router.go(r),
    skipBoot: () => sim.skipBoot(),
    store,
    sim,
  };
  window.__hmi = api;
  mountDevPanel(api);

  // ---- go ------------------------------------------------------------------
  sim.start();
  const params = new URLSearchParams(location.search);
  if (skipBoot || params.has('nosplash')) sim.skipBoot();
  router.start();
  if (!store.get('machine').booted) {
    router.replace('startup');
    sim.boot().then((ok) => {
      if (ok) router.replace('home');
    });
  }
  return { ctx, api, stop: () => { sim.stop(); stopAutoSave(); ctx.shell.unmount(); } };
}
