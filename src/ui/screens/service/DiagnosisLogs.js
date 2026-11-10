/**
 * Diagnosis Logs (docx §8.6, plan P3-08).
 *
 *   1. The recording toggle comes first, with its state in words ("On · recording" / "Off") next to
 *      the switch. Switching needs L3 (parameter 900 W3); below that the switch is shown disabled.
 *   2. How long recording has run (or ran, with the stop time) and how much of the area is used,
 *      with the FIFO note.
 *   3. The events, newest first: time, a type tag and the role, the detail text wrapping (never cut).
 *   4. Export to USB (L2, CSV) and Clear (L3, destructive confirmation).
 * Opens at L2 (node accessRead). Empty states: "Recording is off" and "Nothing recorded yet".
 */
import { renderSwitch } from '../../components/TableRow.js';
import { renderListEnd, mountScrollHint } from '../../components/ListRow.js';
import { renderPlaceholder } from '../../components/Placeholder.js';
import { renderProgressBar } from '../StartupScreen.js';
import { renderButton } from '../../components/Button.js';
import { confirmAction } from '../../components/ConfirmDialog.js';
import { icon } from '../../components/Icon.js';
import { canActNode, canWriteParam } from '../../../core/access.js';
import {
  DIAG_CAPACITY,
  DIAG_PARAM,
  recordedFor,
  fmtDuration,
  clearDiag,
  toCsv,
} from '../../../core/diag.js';
import { esc, cx, hhmm, onAction } from '../../html.js';

const TYPE_TONE = {
  error: 'bg-status-error/20 text-status-error-ink',
  loginFailed: 'bg-status-error/20 text-status-error-ink',
  secure: 'bg-level-4/20 text-level-4',
  state: 'bg-status-warning/20 text-status-warning-ink',
  param: 'bg-brand/20 text-brand-hi',
};

const stamp = (ms) => {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}. ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

export function render(ctx, { arg }) {
  const node = ctx.node(arg);
  const typeLabel = (type) => {
    const k = `diag.type.${type}`;
    const s = ctx.t(k);
    return s === k ? ctx.t('diag.type.other') : s;
  };

  const row = (e, last) => `
    <div class="${cx('px-4 py-3 flex flex-col gap-1', !last && 'border-b border-line-soft')}" data-diag-entry>
      <div class="flex items-center gap-2 flex-wrap">
        <span class="t-param text-label text-muted">${esc(stamp(e.at))}</span>
        <span class="${cx('t-caption px-2 py-0.5 rounded-xs', TYPE_TONE[e.type] ?? 'bg-surface-2 text-chrome')}" data-type="${esc(e.type)}">${esc(typeLabel(e.type))}</span>
        <span class="ml-auto text-label font-semibold text-level-${Math.max(0, Math.min(4, e.level ?? 0))}">L${esc(String(e.level ?? 0))}${e.user ? ` · ${esc(e.user)}` : ''}</span>
      </div>
      <div class="text-body break-words">${esc(e.detail)}</div>
    </div>`;

  const view = () => {
    const d = ctx.store.get('diag');
    const on = !!ctx.store.getParam(DIAG_PARAM);
    const canToggle = canWriteParam(ctx.param(DIAG_PARAM), ctx.level);
    const canClear = canActNode(node, ctx.level);
    const n = d.entries.length;
    const free = Math.round(((DIAG_CAPACITY - n) / DIAG_CAPACITY) * 100);
    const toggle = `
      <section class="card-border card-border--strong" data-diag-toggle><div class="flex items-center gap-3 pl-4 pr-2 min-h-touch">
        <span class="flex-1 min-w-0 flex flex-col">
          <span class="text-body font-semibold">${esc(ctx.t('diag.recording'))}</span>
          <span class="${cx('text-label font-semibold', on ? 'text-status-run-ink' : 'text-muted')}" data-diag-state="${on ? 'on' : 'off'}">${esc(ctx.t(on ? 'diag.on' : 'diag.off'))}</span>
        </span>
        ${canToggle ? '' : icon('lock', { size: 22, class: 'text-muted shrink-0' })}
        ${renderSwitch({ on, disabled: !canToggle, action: canToggle ? 'toggle' : 'locked', id: 'diag', label: ctx.t('diag.recording') }).replace('hmi-switch ', 'hmi-switch hmi-switch--brand ')}
      </div></section>`;
    const status = d.since
      ? `<div class="flex flex-col gap-2 px-1" data-diag-status>
          <span class="text-label text-muted">${esc(ctx.t(d.stoppedAt ? 'diag.stopped' : 'diag.since', { d: fmtDuration(recordedFor(d)), time: hhmm(d.stoppedAt ?? d.since) }))}</span>
          ${renderProgressBar({ value: n / DIAG_CAPACITY, tone: free < 10 ? 'error' : 'brand' })}
          <span class="t-caption text-faint">${esc(ctx.t('diag.space', { n, total: DIAG_CAPACITY, free }))} · ${esc(ctx.t('diag.fifo'))}</span>
        </div>`
      : '';
    const list = n
      ? `<div class="card-border"><div class="py-1">${[...d.entries]
          .reverse()
          .map((e, i) => row(e, i === n - 1))
          .join('')}</div></div>${renderListEnd()}`
      : `<div class="card-border"><div>${renderPlaceholder({
          kind: 'empty',
          icon: 'logs',
          title: ctx.t(on ? 'diag.onEmpty' : 'diag.offEmpty'),
          text: ctx.t(on ? 'diag.onEmptyHint' : 'diag.offEmptyHint'),
        })}</div></div>`;
    const actions = `<div class="grid grid-cols-2 gap-3">
        <div class="${cx('grid', !n && 'opacity-40')}">${renderButton({ label: ctx.t('diag.export'), action: n ? 'export' : 'nothing', tone: 'secondary', icon: 'usb' })}</div>
        <div class="${cx('grid', (!n || !canClear) && 'opacity-40')}">${renderButton({ label: ctx.t('diag.clear'), action: !canClear ? 'clearLocked' : n ? 'clear' : 'nothing', tone: 'secondary', icon: canClear ? 'stop' : 'lock' })}</div>
      </div>`;
    return `
      <div class="flex-1 min-h-0 flex flex-col" data-diag>
        <div class="px-3 pt-3 flex flex-col gap-3">${toggle}${canToggle ? '' : `<p class="text-label text-muted px-1">${esc(ctx.t('diag.needsL3'))}</p>`}</div>
        <div class="scroll-hint flex-1 min-h-0 mt-2">
          <div class="scroll-y h-full px-3 flex flex-col gap-3" data-scroll>${status}${list}</div>
        </div>
        <div class="px-3 pt-2 pb-8 land:pb-3 border-t border-line-soft" data-diag-actions>${actions}</div>
      </div>`;
  };

  ctx.shell.setScreen({
    title: ctx.t(`screen.${node.id}`),
    branch: node.branch,
    html: view(),
    mount(el) {
      let hint = mountScrollHint(el.querySelector('[data-scroll]'));
      const redraw = () => {
        const top = el.querySelector('[data-scroll]')?.scrollTop ?? 0;
        hint();
        el.innerHTML = view();
        const sc = el.querySelector('[data-scroll]');
        sc.scrollTop = top;
        hint = mountScrollHint(sc);
      };
      const offStore = ctx.store.subscribe(
        (s) =>
          [
            s.diag.entries.length,
            s.diag.entries.at(-1)?.at,
            s.diag.since,
            s.diag.stoppedAt,
            s.session.level,
            s.params[String(DIAG_PARAM)],
          ].join('|'),
        redraw,
      );
      // the duration line moves on while recording
      const timer = setInterval(() => {
        const d = ctx.store.get('diag');
        if (d.since && !d.stoppedAt) redraw();
      }, 30_000);
      const offAction = onAction(el, {
        toggle: () => ctx.setParam(DIAG_PARAM, !ctx.store.getParam(DIAG_PARAM)),
        locked: () =>
          ctx.toast.reject(
            ctx.t('toast.needsLevel', { n: ctx.param(DIAG_PARAM)?.accessWrite ?? 3 }),
          ),
        clearLocked: () =>
          ctx.toast.reject(ctx.t('toast.needsLevel', { n: node.accessAction ?? 3 })),
        nothing: () => ctx.toast.reject(ctx.t('diag.onEmpty')),
        export: () => {
          const d = ctx.store.get('diag');
          const file = `USB/diag_${new Date().toISOString().slice(0, 10)}.csv`;
          // the prototype has no USB drive: the CSV is built (and kept for the dev tools) but not written
          window.__lastDiagExport = toCsv(d.entries);
          ctx.toast.ok(ctx.t('diag.exported', { n: d.entries.length, file }));
        },
        clear: async () => {
          const n = ctx.store.get('diag').entries.length;
          const ok = await confirmAction(ctx, {
            title: ctx.t('diag.clearTitle'),
            text: ctx.t('diag.clearBody', { n }),
            okLabel: ctx.t('diag.clear'),
            destructive: true,
          });
          if (!ok) return;
          ctx.store.replace('diag', clearDiag(ctx.store.get('diag')));
          ctx.log('diag', `log cleared (${n} entries)`);
          ctx.toast.ok(ctx.t('diag.cleared'));
        },
      });
      return () => {
        clearInterval(timer);
        hint();
        offStore();
        offAction();
      };
    },
  });
}
