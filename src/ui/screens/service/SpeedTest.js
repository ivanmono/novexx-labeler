/**
 * Speed Test (docx §8.4, plan P3-05): verify the external encoder.
 *
 *   - Live block: m/min and Hz from the encoder, refreshed with the simulator tick (once a second).
 *     No encoder signal → "—" and a "No encoder signal" line, never a 0 that looks like a reading.
 *   - Result block, set apart in its own card: time to the next label and the rated product rate
 *     (Info_Calc_Product_rate 728, only when Calc_Product_Rate_Enable 136 is on).
 *   - Run (L2, node accessAction): warns first that the test moves the machine, measures for
 *     TEST_SECONDS with a progress bar and Stop; leaving the screen aborts a running test.
 * Read L1.
 */
import { renderProgressBar } from '../StartupScreen.js';
import { renderButton } from '../../components/Button.js';
import { confirmAction } from '../../components/ConfirmDialog.js';
import { icon } from '../../components/Icon.js';
import { canActNode } from '../../../core/access.js';
import { fmtNumber } from '../../../core/i18n.js';
import { esc, cx, hhmm, onAction } from '../../html.js';

export const TEST_SECONDS = 5;

export function render(ctx, { arg }) {
  const node = ctx.node(arg);
  const m = () => ctx.store.get('machine');
  let startedAt = null; // this screen's own test run

  const tile = (value, unit, attr) => `
    <div class="flex-1 min-w-0 rounded-card-inner bg-surface-2/60 px-4 py-3 flex flex-col">
      <span class="t-param text-display leading-none truncate" ${attr}>${esc(value)}</span>
      <span class="text-label text-muted">${esc(unit)}</span>
    </div>`;

  const live = () => {
    const e = m().encoder;
    const ok = e.signal !== false;
    return `
      <section class="card-border" data-live data-signal="${ok ? 'yes' : 'no'}"><div class="p-4 flex flex-col gap-3">
        <div class="flex items-center gap-2 t-caption text-muted">
          <span class="${cx('size-2.5 rounded-pill', ok ? 'bg-status-run' : 'bg-status-error')}" aria-hidden="true"></span>${esc(ctx.t('speed.live'))}
        </div>
        <div class="flex gap-3">
          ${tile(ok ? fmtNumber(e.mmin, 1) : '—', ctx.t('speed.mmin'), 'data-live-mmin')}
          ${tile(ok ? fmtNumber(e.hz, 0) : '—', ctx.t('speed.hz'), 'data-live-hz')}
        </div>
        ${
          ok
            ? ''
            : `<div class="flex items-start gap-2 text-label font-semibold text-status-error-ink" data-no-signal>${icon('alarm', { size: 24, class: 'shrink-0' })}<span>${esc(ctx.t('speed.noSignal'))}. <span class="font-normal text-muted">${esc(ctx.t('speed.noSignalHint'))}</span></span></div>`
        }
      </div></section>`;
  };

  const result = () => {
    const st = m().speedTest;
    const r = st.result;
    const row = (label, value, attr = '') =>
      `<div class="flex items-baseline justify-between gap-4 min-h-touch-row border-b border-line-soft last:border-b-0" ${attr}><span class="text-body text-muted">${esc(label)}</span><span class="t-param text-body-lg text-right whitespace-nowrap">${value}</span></div>`;
    let body;
    if (st.running)
      body = `<p class="text-body text-muted py-4" data-result-state="running">${esc(ctx.t('list.loading'))}</p>`;
    else if (!r)
      body = `<p class="text-body text-muted py-4" data-result-state="none">${esc(ctx.t('speed.none'))}</p>`;
    else if (r.nextLabelMs == null)
      body = `<p class="text-body text-status-error-ink py-4" data-result-state="nosignal">${esc(ctx.t('speed.noResult'))}</p>`;
    else {
      const rateOn = !!ctx.store.getParam(136);
      body = `<div data-result-state="done">
        ${row(ctx.t('speed.nextLabel'), `${esc(fmtNumber(r.nextLabelMs, 0))} <span class="text-label text-muted">ms</span>`, 'data-next-label')}
        ${row(ctx.t('speed.rate'), rateOn ? `${esc(fmtNumber(r.ratePerMin, 0))} <span class="text-label text-muted">${esc(ctx.t('speed.rateUnit'))}</span>` : `<span class="text-label text-muted font-sans">${esc(ctx.t('speed.rateOff'))}</span>`, 'data-rate')}
        <p class="t-caption text-faint pt-2">${esc(ctx.t('speed.at', { time: hhmm(r.at) }))}</p>
      </div>`;
    }
    return `<section class="card-border card-border--strong" data-result><div class="px-4 pt-3 pb-2 flex flex-col">
        <h2 class="t-caption text-muted">${esc(ctx.t('speed.result'))}</h2>${body}
      </div></section>`;
  };

  const actions = () => {
    const st = m().speedTest;
    if (st.running) {
      const s = Math.min(TEST_SECONDS, Math.floor((Date.now() - (startedAt ?? Date.now())) / 1000));
      return `<div class="flex flex-col land:flex-row land:items-center gap-3 land:gap-4" data-measuring>
        <div class="flex-1 min-w-0 flex flex-col gap-2">
          <span class="text-label text-muted" data-measure-text>${esc(ctx.t('speed.measuring', { s, total: TEST_SECONDS }))}</span>
          ${renderProgressBar({ value: s / TEST_SECONDS })}
        </div>
        <div class="grid land:w-[220px] land:shrink-0">${renderButton({ label: ctx.t('speed.stop'), action: 'stop', tone: 'secondary', icon: 'stop' })}</div>
      </div>`;
    }
    const allowed = canActNode(node, ctx.level);
    return `<div class="flex flex-col land:flex-row land:items-center gap-2 land:gap-4">
        <div class="flex items-center gap-2 text-label text-status-warning-ink px-1 land:flex-1">${icon('alarm', { size: 24, class: 'shrink-0' })}<span>${esc(ctx.t('speed.moves'))}</span></div>
        <div class="${cx('grid land:w-[300px] land:shrink-0', !allowed && 'opacity-40')}">${renderButton({ label: ctx.t('speed.run'), action: allowed ? 'run' : 'locked', tone: 'primary', icon: allowed ? 'play' : 'lock' })}</div>
      </div>`;
  };

  const view = () => `
    <div class="flex-1 min-h-0 flex flex-col" data-speed-test>
      <div class="scroll-y flex-1 min-h-0 p-3 flex flex-col land:grid land:grid-cols-2 land:items-start gap-3">${live()}${result()}</div>
      <div class="px-3 pt-2 pb-8 land:pb-3 border-t border-line-soft" data-speed-actions>${actions()}</div>
    </div>`;

  ctx.shell.setScreen({
    title: ctx.t(`screen.${node.id}`),
    branch: node.branch,
    html: view(),
    mount(el) {
      // full redraw when the shape changes; the live numbers and the progress are patched every tick
      const shape = (s) =>
        [
          s.machine.encoder.signal,
          s.machine.speedTest.running,
          s.machine.speedTest.result?.at,
          s.session.level,
          s.params['136'],
        ].join('|');
      const offShape = ctx.store.subscribe(shape, () => (el.innerHTML = view()));
      const offTick = ctx.store.subscribe(
        (s) => s.machine.encoder,
        (e) => {
          if (e.signal === false) return;
          const a = el.querySelector('[data-live-mmin]');
          const b = el.querySelector('[data-live-hz]');
          if (a) a.textContent = fmtNumber(e.mmin, 1);
          if (b) b.textContent = fmtNumber(e.hz, 0);
          if (m().speedTest.running && startedAt != null) {
            const s = Math.floor((Date.now() - startedAt) / 1000);
            if (s >= TEST_SECONDS) return ctx.sim.stopSpeedTest();
            const txt = el.querySelector('[data-measure-text]');
            if (txt) txt.textContent = ctx.t('speed.measuring', { s, total: TEST_SECONDS });
            const bar = el.querySelector('[data-bar]');
            if (bar) bar.style.width = `${Math.round((s / TEST_SECONDS) * 100)}%`;
          }
        },
      );
      const offAction = onAction(el, {
        locked: () => ctx.toast.reject(ctx.t('toast.needsLevel', { n: node.accessAction ?? 2 })),
        run: async () => {
          const ok = await confirmAction(ctx, {
            title: ctx.t('speed.confirmTitle'),
            text: ctx.t('speed.confirmBody', { s: TEST_SECONDS }),
            okLabel: ctx.t('action.run'),
          });
          if (!ok) return;
          startedAt = Date.now();
          ctx.sim.startSpeedTest();
          ctx.log('test', 'speed test started');
        },
        stop: () => {
          ctx.sim.abortSpeedTest();
          startedAt = null;
        },
      });
      return () => {
        // leaving the screen stops the measurement (docx §8.4)
        if (m().speedTest.running) ctx.sim.abortSpeedTest();
        offShape();
        offTick();
        offAction();
      };
    },
  });
}
