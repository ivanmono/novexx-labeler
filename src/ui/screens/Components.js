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
import { renderTitleBar } from '../shell/TitleBar.js';
import { renderToast } from '../shell/Toast.js';
import { renderModal } from '../shell/ModalHost.js';
import { renderSheet } from '../shell/SheetHost.js';
import { renderStartButton, renderStatePill } from './HomeScreen.js';
import { renderProfileRow } from './LoginScreen.js';
import { renderListRow } from './UserScreen.js';
import { renderProgressBar } from './StartupScreen.js';
import { renderButton } from '../components/Button.js';
import { renderKey, renderNumpadKey } from '../components/Keyboard.js';
import { icon } from '../components/Icon.js';
import { statusOf } from '../shell/StatusBar.js';
import { renderMenuTile } from '../components/MenuTile.js';
import { renderPager } from '../components/Pager.js';
import { tileFor } from './MenuScreen.js';
import { renderParamRow } from '../components/ParamRow.js';
import { renderGroupHeader } from '../components/GroupHeader.js';
import { renderOptionRow } from '../components/SelectionList.js';
import { renderSlider } from '../components/Slider.js';
import { renderDateTimePicker, pickerError } from '../components/DateTimePicker.js';
import menuTree from '../../data/menu-tree.json';

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
  // TitleBar · Back × Subtitle, plus one branch-marked variant per main-menu branch
  const titleBars = [
    { title: ctx.t('login.title') },
    { title: ctx.t('login.title'), subtitle: 's.operator · L1 Operator' },
    { title: menuTree.title ?? 'Main menu', back: false },
    ...menuTree.children.map((m) => ({ title: m.title, branch: m.branch })),
  ].map((p) => `<div class="w-[480px] grid">${renderTitleBar(p)}</div>`);
  const toasts = [
    renderToast({ text: ctx.t('toast.saved'), kind: 'ok' }),
    renderToast({ text: ctx.t('toast.needsLevel', { n: 3 }), kind: 'reject' }),
  ].map((h) => `<div class="flex">${h}</div>`);
  const body = (text) => `<p>${esc(text)}</p>`;
  const modals = [
    { kind: 'info', body: body('Format Bottle 330 ml loaded.') },
    {
      kind: 'error',
      title: 'E-207',
      body: body('Missing label at the dispensing edge. Check the label roll and the sensor.'),
    },
    {
      kind: 'confirm',
      title: ctx.t('home.start'),
      body: body('Start the machine? Labels are dispensed as soon as the start sensor triggers.'),
      okLabel: ctx.t('action.confirm'),
    },
    {
      kind: 'confirm',
      destructive: true,
      title: ctx.t('action.overwrite'),
      body: body('Bottle 330 ml will be overwritten with the live values. 12 parameters differ.'),
      okLabel: ctx.t('action.overwrite'),
    },
    {
      kind: 'help',
      title: 'Fixed Speed',
      body: body(
        'Dispensing speed used when Speed Selection is set to Fixed. The help text is shown in full; longer texts scroll.',
      ),
    },
  ].map((m) => `<div class="w-[440px] grid">${renderModal(m)}</div>`);
  const sheets = [
    `<div class="w-[480px] grid">${renderSheet({ title: 'Fixed Speed', body: '<div class="text-muted text-body-sm py-6 text-center">editor content</div>' })}</div>`,
  ];
  const startButtons = [
    [STATUS_STATES.ready, 0],
    [STATUS_STATES.ready, 1],
    [STATUS_STATES.run, 1],
    [STATUS_STATES.alarm, 0],
    [STATUS_STATES.alarm, 1],
  ].map(([m, level]) => `<div class="flex">${renderStartButton(ctx, m, level)}</div>`);
  const pills = Object.values(STATUS_STATES).map(
    (m) => `<div class="flex">${renderStatePill(ctx, statusOf(m))}</div>`,
  );
  const users = ctx.store.get('users');
  const sampleUser = (level, enabled) => ({
    id: `sample-${level}`,
    name: USER_BY_LEVEL[level],
    level,
    enabled,
    lastPasswordChange: users[0]?.lastPasswordChange,
  });
  const profileRows = [];
  for (const level of [1, 2, 3, 4])
    for (const enabled of [true, false])
      profileRows.push(
        `<div class="w-[448px] grid">${renderProfileRow(ctx, sampleUser(level, enabled))}</div>`,
      );
  const listRows = [
    renderListRow(
      ctx.t('user.level'),
      `<span class="text-level-1">${esc(`L1 · ${ctx.t('level.1')}`)}</span>`,
    ),
    renderListRow(ctx.t('user.autoLogoff'), esc(ctx.t('user.minutes', { n: 5 })), { last: true }),
  ].map((h) => `<div class="w-[448px] grid">${h}</div>`);
  const buttons = [
    renderButton({ label: ctx.t('user.logout'), action: 'noop', icon: 'lock' }),
    renderButton({ label: ctx.t('home.ackWarnings'), action: 'noop' }),
    renderButton({ label: ctx.t('home.start'), action: 'noop', tone: 'primary' }),
    renderButton({ label: ctx.t('home.resetAlarm'), action: 'noop', tone: 'danger' }),
  ].map((h) => `<div class="w-[448px] grid">${h}</div>`);
  const keys = [
    renderKey('q'),
    renderKey('123'),
    renderKey('⌫'),
    renderKey('␣'),
    renderKey('↵', { enterIcon: 'activate' }),
    renderKey('↵'),
  ].map((h) => `<div class="w-9 h-[52px] grid">${h}</div>`);
  const numpadKeys = [
    renderNumpadKey('7', 'bg-key text-title t-param'),
    renderNumpadKey('C', 'bg-surface-2 text-body-sm'),
    renderNumpadKey('⌫', 'bg-surface-2', icon('back', { size: 24 })),
    renderNumpadKey('↵', 'bg-brand text-on-brand', icon('activate', { size: 28 })),
  ].map((h) => `<div class="w-[110px] h-[60px] grid">${h}</div>`);
  const progress = [
    renderProgressBar({ value: 0.45 }),
    renderProgressBar({ value: 0.6, tone: 'error' }),
  ].map((h) => `<div class="w-[320px] grid">${h}</div>`);
  const menuTiles = [
    { ...tileFor(ctx, ctx.node('speed')), disabled: false },
    { ...tileFor(ctx, ctx.node('buscard')), disabled: true, subtitle: ctx.t('menu.optionMissing') },
    { ...tileFor(ctx, ctx.node('ref-mio')), disabled: false },
    { ...tileFor(ctx, ctx.node('ref-mio')), disabled: true, subtitle: ctx.t('menu.optionMissing') },
  ].map((tile) => `<div class="w-[218px] grid">${renderMenuTile(tile)}</div>`);
  const pagers = [0, 1, 2].map(
    (page) => `<div class="w-[448px] grid">${renderPager({ page, pages: 3 })}</div>`,
  );
  const row = (over) => ({
    pid: 122,
    label: ctx.t('tr10'),
    value: '30 m/min',
    ...over,
  });
  // every State × Indent × Changed with the help mark, plus one row without it (screens use Help=yes)
  const paramRows = [];
  for (const state of ['default', 'locked', 'readonly', 'action'])
    for (const indent of [0, 1, 2])
      for (const changed of [false, true])
        paramRows.push(
          row({
            indent,
            changed,
            help: true,
            locked: state === 'locked',
            needLevel: state === 'locked' ? 2 : null,
            readOnly: state === 'readonly',
            live: state === 'readonly',
            action: state === 'action',
            value: state === 'action' ? '' : changed ? '45 m/min' : '30 m/min',
          }),
        );
  paramRows.push(row({ help: false }));
  const paramRowHtml = paramRows.map(
    (r) => `<div class="w-[448px] grid">${renderParamRow({ ...r, last: true })}</div>`,
  );
  const groupHeaders = [`<div class="w-[448px] grid">${renderGroupHeader('Information')}</div>`];
  const optionRows = [
    renderOptionRow({
      id: 119,
      label: ctx.t(ctx.option(119).labelKey),
      selected: true,
      last: true,
    }),
    renderOptionRow({
      id: 120,
      label: ctx.t(ctx.option(120).labelKey),
      selected: false,
      last: true,
    }),
  ].map((h) => `<div class="w-[448px] grid">${h}</div>`);
  const sliderParam = ctx.param(122);
  const sliders = [30, 1, 60].map(
    (v) => `<div class="w-[448px] grid">${renderSlider(sliderParam, v)}</div>`,
  );
  const timeParam = ctx.param(700);
  const dateParam = ctx.param(701);
  const pickers = [
    [timeParam, { h: 16, m: 20 }],
    [dateParam, { d: 1, m: 1, y: 2027 }],
    [dateParam, { d: 31, m: 2, y: 2027 }],
  ].map(
    ([p, v]) =>
      `<div class="w-[448px] grid">${renderDateTimePicker(p, v, { error: pickerError(p, v) })}</div>`,
  );
  ctx.shell.setScreen({
    title: 'Components',
    back: true,
    bars: true,
    html: `
      <div class="scroll-y flex-1 p-4 flex flex-col gap-8" data-components>
        ${section('StatusBar · State', statusBars)}
        ${section('NavBar · Level × Line', navBars)}
        ${section('QuicklinkCard · State', quickCards)}
        ${section('TitleBar · Back × Subtitle × Branch', titleBars)}
        ${section('Toast · Kind', toasts)}
        ${section('Modal · Kind × Destructive', modals)}
        ${section('Sheet', sheets)}
        ${section('StartButton · Machine × Locked', startButtons)}
        ${section('StatePill · State', pills)}
        ${section('ProfileRow · Level × Enabled', profileRows)}
        ${section('ListRow · Divider', listRows)}
        ${section('Button · Tone × Icon', buttons)}
        ${section('Key · Kind × Content', keys)}
        ${section('NumpadKey · Kind × Content', numpadKeys)}
        ${section('ProgressBar · Tone', progress)}
        ${section('MenuTile · State × Link', menuTiles)}
        ${section('Pager · Position', pagers)}
        ${section('ParamRow · State × Indent × Changed', paramRowHtml)}
        ${section('GroupHeader', groupHeaders)}
        ${section('OptionRow · Selected', optionRows)}
        ${section('Slider · State', sliders)}
        ${section('DateTimePicker · Kind × State', pickers)}
      </div>`,
  });
}
