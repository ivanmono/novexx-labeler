/**
 * Navigation bar (docx §5.4): back · level badge · menu. Bottom in portrait, side edge in
 * landscape. The level badge is visible at all times (docx §4.1) and opens login / user area.
 * A thin gradient line on the inner edge carries the machine state colour (first draft).
 */
import { icon } from '../components/Icon.js';
import { layoutOf, onDisplayChange } from '../../core/theme.js';
import { t } from '../../core/i18n.js';
import { esc, el, onAction } from '../html.js';
import { statusOf } from './StatusBar.js';

const LINE = {
  run: 'run',
  ready: 'run',
  pause: 'standby',
  standby: 'standby',
  warning: 'warning',
  alarm: 'error',
  offline: 'standby',
  booting: 'standby',
};

/** Levels whose badge colour needs light text (DT-50, Figma NavBar). */
const LIGHT_BADGE = new Set([2, 3]);

export function renderNavBar({ level = 0, userName = null, canBack = true, machine, orientation = layoutOf() }) {
  const st = statusOf(machine);
  const lvl = Math.max(0, Math.min(4, Number(level) || 0));
  return `
  <nav class="hmi__nav nav-bar relative flex items-stretch justify-between select-none" data-level="${lvl}" data-cmp="NavBar" data-cmp-props="Level=${lvl},Line=${LINE[st.key] ?? 'standby'},Orientation=${orientation}" aria-label="Navigation">
    <span class="nav-bar__line absolute" style="background:var(--hmi-gradient-${LINE[st.key] ?? 'standby'})" aria-hidden="true"></span>
    <button type="button" class="nav-bar__btn pressable flex flex-col items-center justify-center gap-0.5 text-chrome flex-1" data-action="back" ${canBack ? '' : 'aria-disabled="true"'}>
      ${icon('back', { size: 32 })}<span class="t-caption">${esc(t('nav.back'))}</span>
    </button>
    <button type="button" class="nav-bar__user pressable flex flex-col items-center justify-center gap-0.5 flex-1" data-action="user" aria-label="${esc(t(`level.${lvl}`))}">
      <span class="nav-bar__badge grid place-items-center size-11 rounded-pill text-body-sm font-bold ${LIGHT_BADGE.has(lvl) ? 'text-white' : 'text-black'} bg-level-${lvl}" data-badge>${esc(t(`level.short.${lvl}`))}</span>
      <span class="nav-bar__name text-label land:hidden font-semibold text-level-${lvl} max-w-full px-1 land:px-0 text-center">${esc(userName ?? t(`level.${lvl}`)).replace('.', '.\u200b')}</span>
    </button>
    <button type="button" class="nav-bar__btn pressable flex flex-col items-center justify-center gap-0.5 text-chrome flex-1 ${lvl === 0 ? 'opacity-60' : ''}" data-action="menu">
      ${icon('menu', { size: 32 })}<span class="t-caption">${esc(t('nav.menu'))}</span>
    </button>
  </nav>`;
}

export function mountNavBar(host, ctx) {
  let current = el(renderNavBar(snapshot(ctx)));
  host.replaceWith(current);
  let dispose = bind(current);
  function bind(node) {
    return onAction(node, {
      back: () => ctx.back(),
      user: () => ctx.openUser(),
      menu: () => ctx.openMenu(),
    });
  }
  const rerender = () => {
    dispose();
    const fresh = el(renderNavBar(snapshot(ctx)));
    current.replaceWith(fresh);
    current = fresh;
    dispose = bind(fresh);
  };
  const unsubs = [
    ctx.store.subscribe((s) => s.session, rerender),
    ctx.store.subscribe((s) => statusOf(s.machine).key, rerender),
    ctx.onRoute(rerender),
    ctx.onLanguage(rerender),
    onDisplayChange((key) => key === 'orientation' && rerender()),
  ];
  return {
    get el() {
      return current;
    },
    unmount: () => {
      dispose();
      unsubs.forEach((u) => u());
    },
  };
}

function snapshot(ctx) {
  const session = ctx.store.get('session');
  return {
    level: session.level,
    userName: session.user?.name ?? null,
    canBack: ctx.router.canGoBack,
    machine: ctx.store.get('machine'),
  };
}
