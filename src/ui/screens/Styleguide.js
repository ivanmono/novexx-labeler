/**
 * Styleguide (dev route #/styleguide): tokens plus every component in every state.
 * This is the surface for design review gates. Sections are appended as components land.
 */
import { icon } from '../components/Icon.js';
import iconIndex from '../../assets/icons/index.json';
import { renderStatusBar } from '../shell/StatusBar.js';
import { renderNavBar } from '../shell/NavBar.js';
import { renderTitleBar } from '../shell/TitleBar.js';
import { renderToast } from '../shell/Toast.js';
import { renderModal } from '../shell/ModalHost.js';
import { renderSheet } from '../shell/SheetHost.js';
import { renderListRow, renderListEnd, mountScrollHint } from '../components/ListRow.js';
import { renderTableHeader, renderTableRow } from '../components/TableRow.js';
import { confirmAction } from '../components/ConfirmDialog.js';
import { renderProgressResult } from '../components/ProgressResult.js';
import { renderPlaceholder } from '../components/Placeholder.js';
import { renderFileBrowser, mountFileBrowser } from '../components/FileBrowser.js';
import { renderButton } from '../components/Button.js';
import { esc, onAction } from '../html.js';

const COLOR_GROUPS = [
  ['Surfaces', ['bg', 'surface', 'surface-2', 'line', 'line-soft', 'overlay']],
  ['Text', ['text', 'muted', 'faint', 'chrome']],
  ['Brand', ['brand', 'brand-hi', 'brand-deep', 'on-brand']],
  [
    'Machine status',
    [
      'status-ready',
      'status-run',
      'status-pause',
      'status-standby',
      'status-warning',
      'status-error',
    ],
  ],
  [
    'Status ink (text on bg)',
    ['status-run-ink', 'status-standby-ink', 'status-warning-ink', 'status-error-ink'],
  ],
  ['Access levels', ['level-0', 'level-1', 'level-2', 'level-3', 'level-4']],
  [
    'Menu branches',
    [
      'branch-settings',
      'branch-production',
      'branch-info',
      'branch-service',
      'branch-help',
      'branch-usermgmt',
    ],
  ],
  ['Keyboard', ['key', 'key-pressed']],
];
const TYPE = [
  ['text-display', 'Display 48 · 1.1'],
  ['text-hero font-semibold', 'Hero 32 · 600'],
  ['text-title font-bold', 'Title 24 · 700'],
  ['text-body-lg', 'Body large 20'],
  ['text-body', 'Body 18 (base)'],
  ['text-body-sm', 'Body small 16'],
  ['text-label', 'Label 14'],
  ['t-caption', 'Caption 12 · 600 · caps'],
  ['t-param text-title', 'Ioskeley Mono 24 · 600  12.5 m/min'],
  ['t-param text-body', 'Ioskeley Mono 18 · 600  0.0.0.0'],
];
const RADII = ['xs', 'sm', 'md', 'card'];
const SPACING = [1, 2, 3, 4, 6, 8, 12, 15];

const MACHINES = {
  booting: { booted: false, state: 'online', errors: [], warnings: [], standby: false },
  ready: { booted: true, state: 'online', errors: [], warnings: [], standby: false },
  run: { booted: true, state: 'run', errors: [], warnings: [], standby: false },
  pause: { booted: true, state: 'pause', errors: [], warnings: [], standby: false },
  warning: {
    booted: true,
    state: 'warning',
    errors: [],
    warnings: [{ code: 'W-012' }],
    standby: false,
  },
  alarm: {
    booted: true,
    state: 'alarm',
    errors: [{ code: 'E-114' }],
    warnings: [],
    standby: false,
  },
  standby: { booted: true, state: 'online', errors: [], warnings: [], standby: true },
  offline: { booted: true, state: 'offline', errors: [], warnings: [], standby: false },
};

const sec = (title, body, note = '') => `
  <section class="flex flex-col gap-2">
    <h2 class="t-caption text-muted flex items-baseline gap-2">${esc(title)}${note ? `<span class="normal-case tracking-normal font-normal text-faint">${esc(note)}</span>` : ''}</h2>
    ${body}
  </section>`;
const frame = (inner, cls = '') =>
  `<div class="card-border ${cls}"><div class="relative overflow-hidden">${inner}</div></div>`;

export function renderTokens() {
  return `
    ${COLOR_GROUPS.map(([title, names]) =>
      sec(
        title,
        `<div class="grid grid-cols-3 gap-2">${names
          .map(
            (n) => `<div class="card-border"><div class="p-2 flex flex-col gap-1">
            <div class="h-10 rounded-xs bg-${n} border border-line-soft"></div>
            <div class="text-label leading-tight">${n}</div>
            <div class="text-caption text-muted font-mono" data-sg-color="${n}"></div></div></div>`,
          )
          .join('')}</div>`,
      ),
    ).join('')}
    ${sec('Type scale (Figtree / Ioskeley Mono, self-hosted)', frame(`<div class="p-4 flex flex-col gap-3">${TYPE.map(([cls, label]) => `<div class="${cls} truncate">${label} — Etikettierer Übersicht</div>`).join('')}</div>`))}
    ${sec(
      'Surfaces, radii, shadows',
      `
      <div class="grid grid-cols-2 gap-3">
        <div class="card-border"><div class="p-4 text-body-sm">card-border<br><span class="text-muted">gradient stroke 1 px, r 24/23</span></div></div>
        <div class="card-border card-border--strong card-border--surface"><div class="p-4 text-body-sm">strong + surface gradient</div></div>
        <div class="bg-surface rounded-card shadow-card p-4 text-body-sm">shadow-card</div>
        <div class="bg-surface rounded-card shadow-glow-brand p-4 text-body-sm">glow-brand</div>
        <div class="bg-surface rounded-card shadow-glow-error p-4 text-body-sm">glow-error</div>
        <div class="bg-surface-2 rounded-card p-4 text-body-sm">surface-2</div>
      </div>
      <div class="flex gap-3 mt-3 items-end">${RADII.map((r) => `<div class="bg-surface-2 border border-line rounded-${r} size-14 grid place-items-center text-label">${r}</div>`).join('')}</div>`,
    )}
    ${sec(
      'Spacing (4 px base)',
      `
      <div class="flex gap-2 items-end">${SPACING.map((s) => `<div class="flex flex-col items-center gap-1"><div class="bg-brand w-${s} h-${s}"></div><span class="text-caption text-muted">${s * 4}</span></div>`).join('')}</div>
      <div class="flex gap-3 mt-3">
        <div class="bg-surface-2 rounded-sm h-touch px-4 grid place-items-center text-label">touch 60</div>
        <div class="bg-surface-2 rounded-sm h-touch-row px-4 grid place-items-center text-label">row 48</div>
      </div>`,
    )}
    ${sec('Status separators (gradient lines)', `<div class="flex flex-col gap-3">${['run', 'standby', 'warning', 'error'].map((s) => `<div class="h-[3px] rounded-pill" style="background:var(--hmi-gradient-${s})"></div>`).join('')}</div>`)}
    ${sec(
      `Icons v1 · ${iconIndex.count} from Figma · 48 / 32 / 24 px`,
      `
      ${frame(`<div class="p-3 grid grid-cols-6 gap-2">${iconIndex.names.map((n) => `<div class="flex flex-col items-center gap-1 py-1" title="${n}">${icon(n, { size: 32 })}<span class="text-[9px] text-muted truncate w-full text-center">${n}</span></div>`).join('')}</div>`)}
      <div class="flex gap-4 mt-3 items-center">
        ${icon('machine', { size: 48, class: 'text-brand' })}${icon('machine', { size: 32, class: 'text-status-warning' })}${icon('machine', { size: 24, class: 'text-muted' })}
        ${icon('alarm', { size: 48, class: 'text-status-error' })}${icon('lock', { size: 32, class: 'text-level-3' })}
        <span class="text-label text-muted">currentColor binding</span>
      </div>`,
    )}`;
}

export function renderShellSections(ctx) {
  const getParam = (id) => ({ 105: 107, 112: true, 238: true, 146: true })[id];
  const bars = Object.entries(MACHINES)
    .map(
      ([k, m]) =>
        `<div class="flex flex-col gap-1"><span class="text-caption text-muted">${k}</span>${frame(`<div class="h-bar grid">${renderStatusBar({ machine: m, getParam: k === 'ready' ? getParam : () => null, session: k === 'run' ? { level: 4, elevatedUntil: Date.now() + 1800000 } : {} })}</div>`)}</div>`,
    )
    .join('');
  const navs = [0, 1, 2, 3, 4]
    .map((l) =>
      frame(
        `<div class="h-bar grid">${renderNavBar({ level: l, userName: l ? ['', 's.operator', 'a.supervisor', 'm.mustermann', 'm.mustermann'][l] : null, canBack: l > 0, machine: MACHINES[l === 4 ? 'alarm' : l === 2 ? 'run' : 'ready'] })}</div>`,
      ),
    )
    .join('');
  const titles = [
    { title: ctx.t('screen.speed'), branch: 'settings' },
    {
      title: ctx.t('screen.selectformat'),
      branch: 'production',
      subtitle: '3 formats · running: blocked',
    },
    {
      title: 'Applicator test with a very long title that must truncate cleanly',
      branch: 'service',
    },
    {
      title: ctx.t('screen.root'),
      back: false,
      right: `<span class="text-label text-muted px-2">2 / 3</span>`,
    },
  ]
    .map((p) => frame(renderTitleBar(p)))
    .join('');
  const toasts = `<div class="flex flex-col gap-2">${frame(`<div class="h-20 relative">${renderToast({ text: ctx.t('toast.saved'), kind: 'ok' })}</div>`)}${frame(`<div class="h-20 relative">${renderToast({ text: ctx.t('toast.needsLevel', { n: 3 }), kind: 'reject' })}</div>`)}</div>`;
  const modals = [
    {
      kind: 'info',
      title: ctx.t('dialog.infoTitle'),
      body: '<p>Format <b>Bottle 330 ml</b> loaded.</p>',
    },
    {
      kind: 'error',
      title: 'E-207',
      body: '<p>Missing label at the dispensing edge. Check the label roll and the sensor.</p>',
    },
    {
      kind: 'confirm',
      title: 'Load format?',
      body: '<p>Load <b>Bottle 330 ml</b>? Unsaved changes to the live settings are lost.</p>',
      okLabel: ctx.t('action.load'),
    },
    {
      kind: 'confirm',
      destructive: true,
      title: 'Overwrite format?',
      body: '<p><b>Bottle 330 ml</b> will be overwritten with the live values. 12 parameters differ.</p>',
      okLabel: ctx.t('action.overwrite'),
    },
    {
      kind: 'help',
      title: 'Fixed Speed',
      body:
        '<p class="text-body">Dispensing speed used when Speed Selection is set to Fixed. Placeholder help text up to 600 characters; the body scrolls beyond that. ' +
        'Lorem ipsum dolor sit amet. '.repeat(10) +
        '</p>',
    },
  ]
    .map(
      (m) =>
        `<div class="card-border"><div class="relative h-[360px] overflow-hidden">${renderModal(m)}</div></div>`,
    )
    .join('');
  const sheet = `<div class="card-border"><div class="relative h-[360px] overflow-hidden">${renderSheet({ title: ctx.t('tr6'), body: '<div class="text-muted text-body-sm py-6 text-center">editor content (P2-06 … P2-09)</div>' })}</div></div>`;
  return `
    ${sec('Status bar · all states', `<div class="flex flex-col gap-3">${bars}</div>`, 'docx §5.4')}
    ${sec('Navigation bar · levels 0–4', `<div class="flex flex-col gap-3">${navs}</div>`, 'badge always visible, docx §4.1')}
    ${sec('Title bar', `<div class="flex flex-col gap-3">${titles}</div>`, 'with / without back · truncation · branch mark')}
    ${sec('Toast', toasts, 'confirmation · rejection, 2.2 s')}
    ${sec('Modal dialog', `<div class="flex flex-col gap-3">${modals}</div>`, 'info · error · confirm · destructive · help')}
    ${sec('Sheet', sheet, 'portrait: bottom, landscape: side')}`;
}

/** Demo USB drive for the file browser section (P3-01; the real one comes with P3-11 / P3-12). */
const DEMO_USB = {
  USB: [
    { type: 'folder', name: 'firmware' },
    { type: 'folder', name: 'backups' },
    { type: 'file', name: 'readme.txt', size: '1 KB', allowed: false },
  ],
  'USB/firmware': [
    { type: 'folder', name: 'archive' },
    { type: 'file', name: 'XLS22x_v0.98.fw', size: '18.1 MB', date: '02.07.26' },
    { type: 'file', name: 'XLS22x_v1.01.fw', size: '18.4 MB', date: '21.09.26' },
    { type: 'file', name: 'notes.pdf', size: '240 KB', allowed: false },
  ],
  'USB/firmware/archive': [],
  'USB/backups': [
    { type: 'file', name: 'XLS224_SN1043_2026-08-12.pid', size: '2.1 MB', date: '12.08.26' },
    { type: 'file', name: 'format_pharma.pid', size: '12 KB', date: '02.09.26' },
  ],
};

/** Phase 3 shared pieces (P3-01): every state from docx §5.4, live where it can be. */
function renderSharedSections(ctx) {
  const formats = [
    ['Standard 100x50', '12.09.26 · L3 · loaded'],
    ['Pharma small', '02.09.26 · L2'],
    ['Carton side', '28.08.26 · L3'],
    ['Test roll', '14.08.26 · L2'],
    ['Bottle 330 ml', '01.08.26 · L2'],
    ['Bottle 500 ml', '01.08.26 · L2'],
  ];
  const list = `<div class="card-border"><div class="py-1">${formats
    .map(([title, meta], i) =>
      renderListRow({
        kind: 'select',
        title,
        meta,
        id: title,
        state: i === 1 ? 'selected' : i === 3 ? 'disabled' : 'default',
        last: i === formats.length - 1,
      }),
    )
    .join('')}</div></div>${renderListEnd()}`;
  const ios = [
    ['IN 1', 'Start sensor', 'input', true],
    ['IN 2', 'Stop sensor', 'input', false],
    ['IN 3', 'Inhibit', 'input', false],
    ['OUT 1', 'Printer start', 'output', true, true],
    ['OUT 2', 'Cycle signal', 'output', false],
    ['OUT 3', 'Alarm', 'output', false],
  ];
  const table = `<div class="card-border"><div class="py-1">${renderTableHeader()}${ios
    .map(([pin, label, kind, high, forced], i) =>
      renderTableRow({
        pin,
        label,
        kind,
        high,
        forced,
        canForce: ctx.level >= 3,
        last: i === ios.length - 1,
      }),
    )
    .join('')}</div></div>${renderListEnd()}`;
  const scroller = (inner, h) =>
    `<div class="scroll-hint"><div class="scroll-y" style="height:${h}px" data-sg-scroll>${inner}</div></div>`;
  const progress = [
    renderProgressResult({
      state: 'running',
      title: 'Installing firmware',
      phase: 'Writing image · step 2 of 4',
      value: 0.42,
      warning: 'Do not remove the USB drive or switch off the machine.',
    }),
    renderProgressResult({
      state: 'success',
      title: 'Firmware installed',
      message: 'Version 1.01 is installed. Restart the machine to use it.',
      actions: [{ label: 'Restart machine', action: 'noop', tone: 'primary' }],
    }),
    renderProgressResult({
      state: 'failure',
      title: 'Update failed',
      message: 'The image was rejected: its signature is not valid.',
      steps: [
        'Copy the firmware file again from the PID download area.',
        'Try the update again. Version 1.00 is still installed.',
      ],
      actions: [
        { label: ctx.t('action.close'), action: 'noop' },
        { label: ctx.t('action.retry'), action: 'noop', tone: 'primary' },
      ],
    }),
  ].join('');
  const placeholders = [
    renderPlaceholder({
      kind: 'empty',
      icon: 'recipe',
      title: 'No format stored yet',
      text: 'Save the current settings as a format to see it here.',
    }),
    renderPlaceholder({ kind: 'loading' }),
    renderPlaceholder({
      kind: 'error',
      text: 'The format list could not be read from the internal storage.',
    }),
    renderFileBrowser({ path: ['USB'], entries: [], usb: false }),
  ]
    .map((h) => `<div class="card-border"><div>${h}</div></div>`)
    .join('');
  const confirms = `<div class="grid grid-cols-2 gap-3">${renderButton({ label: 'Load format…', action: 'sgConfirm' })}${renderButton({ label: 'Delete format…', action: 'sgDestroy', tone: 'danger' })}</div>`;
  return `
    ${sec('List · rows, scroll indication, end of list', scroller(list, 300), 'docx §5.4 list row: default · selected · disabled; §8 scroll indication and end marker')}
    ${sec('Table row · IO test', scroller(table, 300), 'input · output · forced; switches need L3')}
    ${sec('File browser · USB', `<div data-sg-files>${renderFileBrowser({ path: ['USB'], entries: DEMO_USB.USB })}</div>`, 'path bar · one level up · folders · files · foreign files greyed')}
    ${sec('Confirmation · shared pattern', confirms, 'normal · destructive; load is refused while the machine runs')}
    ${sec('Progress / result', `<div class="flex flex-col gap-3">${progress}</div>`, 'running · success · failure')}
    ${sec('Screen placeholders', `<div class="flex flex-col gap-3">${placeholders}</div>`, 'nothing stored yet · loading · could not be read · no USB drive')}`;
}

/** Live parts of the shared sections. */
function mountSharedSections(root, ctx) {
  const disposers = [...root.querySelectorAll('[data-sg-scroll]')].map((el) => mountScrollHint(el));
  const host = root.querySelector('[data-sg-files]');
  let path = ['USB'];
  let selected = null;
  const draw = () => {
    host.innerHTML = renderFileBrowser({ path, entries: DEMO_USB[path.join('/')] ?? [], selected });
  };
  disposers.push(
    mountFileBrowser(host, {
      onUp: () => {
        path = path.slice(0, -1);
        selected = null;
        draw();
      },
      onOpen: (name) => {
        path = [...path, name];
        selected = null;
        draw();
      },
      onPick: (name) => {
        selected = name;
        draw();
      },
    }),
    onAction(root, {
      sgConfirm: () =>
        confirmAction(ctx, {
          title: 'Load format?',
          text: 'Load Pharma small? Unsaved changes to the live settings are lost.',
          okLabel: ctx.t('action.load'),
          whenStopped: true,
        }),
      sgDestroy: () =>
        confirmAction(ctx, {
          title: 'Delete format?',
          text: 'Pharma small will be deleted from the machine.',
          okLabel: ctx.t('action.delete'),
          destructive: true,
        }),
    }),
  );
  return () => disposers.forEach((d) => d());
}

export function render(ctx) {
  ctx.shell.setScreen({
    title: 'Styleguide',
    back: true,
    bars: true,
    html: `
      <div class="scroll-y flex-1 p-4 flex flex-col gap-8 text-text" data-styleguide>
        <header class="flex items-baseline justify-between">
          <h1 class="text-title font-bold">Styleguide · tokens</h1>
          <span class="text-label text-muted">theme <b data-sg-theme></b> · <b data-sg-orientation></b></span>
        </header>
        ${renderTokens()}
        <h1 class="text-title font-bold">Styleguide · shell</h1>
        ${renderShellSections(ctx)}
        <h1 class="text-title font-bold">Styleguide · shared pieces (Phase 3)</h1>
        ${renderSharedSections(ctx)}
      </div>`,
    mount: (el) => {
      hydrateStyleguide(el);
      return mountSharedSections(el, ctx);
    },
  });
}

/** Fill in resolved colour values after mount. */
export function hydrateStyleguide(root) {
  const probe = document.createElement('div');
  root.append(probe);
  for (const el of root.querySelectorAll('[data-sg-color]')) {
    probe.className = `bg-${el.dataset.sgColor}`;
    el.textContent = toHex(getComputedStyle(probe).backgroundColor);
  }
  probe.remove();
  const html = document.documentElement;
  root.querySelector('[data-sg-theme]').textContent = html.dataset.theme;
  root.querySelector('[data-sg-orientation]').textContent = html.dataset.orientation;
}

function toHex(rgb) {
  const m = rgb.match(/rgba?\(([^)]+)\)/);
  if (!m)
    return rgb
      .replace(/^color\(srgb\s*/, '')
      .replace(/\)$/, '')
      .split(/\s+/)
      .slice(0, 3)
      .map((x) =>
        Math.round(Number(x) * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
      .replace(/^/, '#');
  const [r, g, b, a] = m[1].split(/[\s,/]+/).map(Number);
  const hex = [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');
  return `#${hex}${a != null && a < 1 ? ` · ${Math.round(a * 100)}%` : ''}`;
}
