/**
 * Components sheet (dev route #/components): every component that is a Figma component set, in
 * every state, each root tagged `data-cmp="<Set>" data-cmp-props="Prop=value,…"` by the component
 * itself. `scripts/figma/capture.mjs --components` serializes this page and the builder turns each
 * tagged root into a variant on "HMI / 02 Components" (docs/FIGMA.md). Keep the states here in
 * sync with the variants the screens use.
 */
import { esc } from '../html.js';
import { renderStatusBar } from '../shell/StatusBar.js';
import { renderNavBar } from '../shell/NavBar.js';
import { renderQuickCard, renderQuickEmpty } from './HomeScreen.js';

const machine = (state, extra = {}) => ({
  booted: true,
  state,
  errors: [],
  warnings: [],
  standby: false,
  ...extra,
});
export const STATUS_STATES = {
  booting: machine('online', { booted: false }),
  ready: machine('online'),
  run: machine('run'),
  pause: machine('pause'),
  warning: machine('warning', { warnings: [{ code: 'W-012' }] }),
  alarm: machine('alarm', { errors: [{ code: 'E-114' }] }),
  standby: machine('online', { standby: true }),
  offline: machine('offline'),
};
/** nav-bar line colour → a machine state that produces it */
const LINE_MACHINE = {
  run: STATUS_STATES.ready,
  standby: STATUS_STATES.pause,
  warning: STATUS_STATES.warning,
  error: STATUS_STATES.alarm,
};
const USER_BY_LEVEL = [null, 's.operator', 'a.supervisor', 'm.mustermann', 'm.mustermann'];

const section = (title, items) => `
  <section class="flex flex-col gap-3" data-cmp-section="${esc(title)}">
    <h2 class="t-caption text-muted">${esc(title)}</h2>
    ${items.join('')}
  </section>`;

export function render(ctx) {
  const getParam = ctx.store.getParam;
  const statusBars = Object.values(STATUS_STATES).map(
    (m) =>
      `<div class="w-[480px] h-status grid [grid-template-areas:'status']">${renderStatusBar({ machine: m, getParam, session: {} })}</div>`,
  );
  const navBars = [];
  for (const level of [0, 1, 2, 3, 4])
    for (const line of Object.keys(LINE_MACHINE))
      navBars.push(
        `<div class="w-[480px] h-bar grid [grid-template-areas:'nav'] mt-5">${renderNavBar({ level, userName: USER_BY_LEVEL[level], canBack: true, machine: LINE_MACHINE[line] })}</div>`,
      );
  const quickParam = ctx.param(Number(getParam(614)) || 122);
  const quickCards = [
    `<div class="w-[218px] grid">${renderQuickCard(ctx, quickParam)}</div>`,
    `<div class="w-[218px] grid">${renderQuickEmpty(ctx)}</div>`,
  ];
  ctx.shell.setScreen({
    title: 'Components',
    back: true,
    bars: true,
    html: `
      <div class="scroll-y flex-1 p-4 flex flex-col gap-8" data-components>
        ${section('StatusBar · State', statusBars)}
        ${section('NavBar · Level × Line', navBars)}
        ${section('QuicklinkCard · State', quickCards)}
      </div>`,
  });
}
