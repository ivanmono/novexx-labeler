/**
 * Status bar (docx §5.4): connection/option icons and the machine state.
 * States: ready · running · paused · warning · alarm · stand-by (plus offline and booting).
 * Portrait: horizontal strip at the top. Landscape: vertical strip on the outer edge.
 */
import { icon } from '../components/Icon.js';
import { layoutOf, onDisplayChange } from '../../core/theme.js';
import { t } from '../../core/i18n.js';
import { esc, cx, el, hhmm } from '../html.js';

/** machine.state (+ standby) → { key, colour token, label key } */
export function statusOf(machine) {
  if (!machine?.booted) return { key: 'booting', color: 'status-pause', label: 'state.booting' };
  if (machine.standby) return { key: 'standby', color: 'status-standby', label: 'state.standby' };
  switch (machine.state) {
    case 'run':
      return { key: 'run', color: 'status-run', label: 'state.run' };
    case 'pause':
      return { key: 'pause', color: 'status-pause', label: 'state.pause' };
    case 'alarm':
      return { key: 'alarm', color: 'status-error', label: 'state.alarm' };
    case 'warning':
      return { key: 'warning', color: 'status-warning', label: 'state.warning' };
    case 'offline':
      return { key: 'offline', color: 'status-pause', label: 'state.offline' };
    default:
      return { key: 'ready', color: 'status-ready', label: 'state.online' };
  }
}

/** Option icons shown on the bar, derived from parameters and machine options. */
export function statusIcons({ getParam, machine }) {
  const out = [];
  if (Number(getParam(105)) === 107 || getParam(108))
    out.push({ name: 'network', title: 'Network' });
  if (getParam(113)) out.push({ name: 'signal', title: 'WLAN' });
  if (getParam(112)) out.push({ name: 'webserver', title: 'Web server' });
  if (getParam(238)) out.push({ name: 'can', title: 'CAN' });
  if (machine?.options?.busCard)
    out.push({ name: 'card', title: machine.options.busCardName ?? 'Bus card' });
  if (getParam(146)) out.push({ name: 'printer', title: 'Printer' });
  if (getParam(900)) out.push({ name: 'logs', title: t('status.recording'), accent: true });
  return out;
}

export function renderStatusBar({ machine, getParam, session, orientation = layoutOf() }) {
  const st = statusOf(machine);
  const icons = statusIcons({ getParam, machine });
  const secure = session?.level === 4 && session.elevatedUntil ? hhmm(session.elevatedUntil) : null;
  return `
  <div class="hmi__status status-bar flex items-center justify-between gap-2 px-6 text-chrome select-none" data-status="${st.key}" data-cmp="StatusBar" data-cmp-props="State=${st.key},Orientation=${orientation}" role="status" aria-live="polite">
    <div class="status-bar__state flex items-center gap-2 min-w-0">
      <span class="status-bar__dot size-3 rounded-pill bg-${st.color} shrink-0" aria-hidden="true"></span>
      <span class="status-bar__label text-body-sm font-semibold text-text truncate">${esc(t(st.label))}</span>
    </div>
    ${secure ? `<span class="status-bar__secure text-label text-level-4 font-semibold truncate" data-secure>${esc(t('status.secureUntil', { time: secure }))}</span>` : ''}
    <div class="status-bar__icons flex items-center gap-3" data-icons>
      ${icons.map((i) => icon(i.name, { size: 24, label: i.title, class: cx(i.accent && 'text-status-error') })).join('')}
    </div>
  </div>`;
}

/** Mount once; patches itself on store changes. */
export function mountStatusBar(host, ctx) {
  let current = el(renderStatusBar(snapshot(ctx)));
  host.replaceWith(current);
  const rerender = () => {
    const fresh = el(renderStatusBar(snapshot(ctx)));
    current.replaceWith(fresh);
    current = fresh;
  };
  const unsubs = [
    ctx.store.subscribe((s) => s.machine, rerender),
    ctx.store.subscribe((s) => s.session, rerender),
    ctx.store.onAnyParam((id) => {
      if (['105', '108', '112', '113', '146', '238', '900'].includes(id)) rerender();
    }),
    ctx.onLanguage(rerender),
    onDisplayChange((key) => key === 'orientation' && rerender()),
  ];
  return {
    get el() {
      return current;
    },
    unmount: () => unsubs.forEach((u) => u()),
  };
}

function snapshot(ctx) {
  return {
    machine: ctx.store.get('machine'),
    getParam: ctx.store.getParam,
    session: ctx.store.get('session'),
  };
}
