/**
 * IO-Test (docx §8.5, plan P3-06): every digital IO with pin, direction, function and live state.
 *
 *   - Modular: a group filter (All / per IO group), a group header per group, TableRow rows. The
 *     groups and pins come from the machine configuration, so the list grows with the options.
 *   - Inputs and outputs are told apart by an IN / OUT tag; the state is a lamp pill (dot + HIGH/LOW).
 *     States update with the simulator tick (once a second).
 *   - Read L1 (read-only face: no force column, a line saying forcing needs L3). Forcing L3
 *     (node accessAction): the first force on a visit asks for an explicit warning; a forced output
 *     is marked with the seconds left before it resets; "All outputs back to normal" appears while
 *     any output is forced; leaving the screen resets every forced output.
 */
import { renderTableHeader, renderTableRow, renderStateLamp } from '../../components/TableRow.js';
import { renderGroupHeader } from '../../components/GroupHeader.js';
import { renderListEnd, mountScrollHint } from '../../components/ListRow.js';
import { renderButton } from '../../components/Button.js';
import { confirmAction } from '../../components/ConfirmDialog.js';
import { icon } from '../../components/Icon.js';
import { canActNode } from '../../../core/access.js';
import { FORCE_TIMEOUT_MS } from '../../../core/simulator.js';
import { esc, cx, onAction } from '../../html.js';

export function render(ctx, { arg }) {
  const node = ctx.node(arg);
  const groups = ctx.data.machine?.io?.groups ?? [];
  let filter = 'all';
  let warned = false; // the forcing warning is shown once per visit

  const io = () => ctx.store.get('machine').io;
  const forcedPins = () => Object.values(io()).filter((p) => p.dir === 'out' && p.forced != null);
  const secondsLeft = (p) =>
    Math.max(0, Math.ceil((FORCE_TIMEOUT_MS - (Date.now() - (p.forcedAt ?? 0))) / 1000));

  const rowsFor = (g, canForce) =>
    g.pins
      .map((pin, i) => {
        const p = io()[pin.pin] ?? { ...pin, state: false, forced: null };
        const forced = p.dir === 'out' && p.forced != null;
        return renderTableRow({
          pin: p.pin,
          label: p.fn,
          kind: p.dir === 'out' ? 'output' : 'input',
          high: forced ? !!p.forced : !!p.state,
          forced,
          forcedNote: forced ? ctx.t('io.forcedFor', { s: secondsLeft(p) }) : null,
          canForce,
          force: canForce,
          last: i === g.pins.length - 1,
        });
      })
      .join('');

  let shapeAtRender = null;
  const view = () => {
    shapeAtRender = [ctx.level, ...forcedPins().map((p) => p.pin)].join('|');
    const canForce = canActNode(node, ctx.level);
    const shown = filter === 'all' ? groups : groups.filter((g) => g.id === filter);
    const chips = [{ id: 'all', name: ctx.t('io.all') }, ...groups]
      .map(
        (g) =>
          `<button type="button" class="${cx('pressable shrink-0 h-touch-row px-5 rounded-pill text-label font-semibold', g.id === filter ? 'bg-brand text-on-brand' : 'bg-surface-2 text-text')}" data-action="filter" data-id="${esc(g.id)}" ${g.id === filter ? 'aria-pressed="true"' : ''}>${esc(g.name)}</button>`,
      )
      .join('');
    const list = shown
      .map(
        (g) =>
          `${filter === 'all' ? renderGroupHeader(g.name) : ''}<div class="card-border" data-group="${esc(g.id)}"><div class="py-1">${renderTableHeader({ force: canForce })}${rowsFor(g, canForce)}</div></div>`,
      )
      .join('');
    const n = forcedPins().length;
    const strip = canForce
      ? `<div class="flex flex-col land:flex-row land:items-center gap-2 land:gap-4" data-io-forcing>
          <div class="${cx('flex items-center gap-2 text-label px-1 land:flex-1', n ? 'text-status-warning-ink font-semibold' : 'text-muted')}" data-forced-count="${n}">${icon('alarm', { size: 24, class: 'shrink-0' })}<span>${esc(n ? (n === 1 ? ctx.t('io.forcedOne') : ctx.t('io.forcedCount', { n })) : ctx.t('speed.moves'))}</span></div>
          <div class="${cx('grid land:w-[320px] land:shrink-0', !n && 'opacity-40')}">${renderButton({ label: ctx.t('io.resetAll'), action: n ? 'resetAll' : 'noneForced', tone: 'secondary', icon: 'back' })}</div>
        </div>`
      : `<div class="flex items-center gap-2 text-label text-muted px-1" data-io-readonly>${icon('lock', { size: 24, class: 'shrink-0' })}<span>${esc(ctx.t('io.readOnly'))}</span></div>`;
    return `
      <div class="flex-1 min-h-0 flex flex-col" data-io-test>
        <div class="flex gap-2 px-3 pt-3 overflow-x-auto scroll-y" role="tablist" data-io-filter>${chips}</div>
        <div class="scroll-hint flex-1 min-h-0">
          <div class="scroll-y h-full px-3 pt-1" data-scroll>
            <div class="flex items-center gap-2 t-caption text-muted px-1 pt-2"><span class="size-2.5 rounded-pill bg-status-run" aria-hidden="true"></span>${esc(ctx.t('io.live'))}</div>
            ${list}${renderListEnd()}
          </div>
        </div>
        <div class="px-3 pt-2 pb-8 land:pb-3 border-t border-line-soft" data-io-actions>${strip}</div>
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
      // live values are patched in place every tick, so a tap is never lost to a redraw and the list
      // keeps its scroll position; the page is redrawn only when its shape changes (level, which
      // outputs are forced)
      const patch = () => {
        for (const row of el.querySelectorAll('[data-io]')) {
          const p = io()[row.dataset.io];
          if (!p) continue;
          const forced = p.dir === 'out' && p.forced != null;
          const high = forced ? !!p.forced : !!p.state;
          const lamp = row.querySelector('[data-state]');
          if (lamp && lamp.dataset.state !== (high ? 'high' : 'low'))
            lamp.outerHTML = renderStateLamp(high);
          const note = row.querySelector('[data-forced-note]');
          if (note && forced) note.textContent = ctx.t('io.forcedFor', { s: secondsLeft(p) });
        }
      };
      const shape = (s) =>
        [
          s.session.level,
          ...Object.values(s.machine.io)
            .filter((p) => p.forced != null)
            .map((p) => p.pin),
        ].join('|');
      const offShape = ctx.store.subscribe(shape, redraw);
      // the HTML was built before the previous screen unmounted (which may reset forced outputs)
      if (shapeAtRender !== shape(ctx.store.state)) redraw();
      const offIo = ctx.store.subscribe((s) => s.machine.io, patch);
      const offAction = onAction(el, {
        filter: (btn) => {
          filter = btn.dataset.id;
          redraw();
        },
        noneForced: () => ctx.toast.reject(ctx.t('io.forcedCount', { n: 0 })),
        force: async (btn) => {
          const pin = btn.dataset.id;
          const p = io()[pin];
          if (!p || p.dir !== 'out') return;
          if (p.forced != null) {
            ctx.sim.forceOutput(pin, null); // back to normal
            ctx.log('io', `${pin} released`);
            return;
          }
          if (!warned) {
            const ok = await confirmAction(ctx, {
              title: ctx.t('io.forceTitle'),
              text: ctx.t('io.forceBody', { s: FORCE_TIMEOUT_MS / 1000 }),
              okLabel: ctx.t('io.ok'),
            });
            if (!ok) return;
            warned = true;
          }
          ctx.sim.forceOutput(pin, true);
          ctx.log('io', `${pin} forced on`);
        },
        resetAll: () => {
          ctx.sim.resetForced();
          ctx.log('io', 'all outputs back to normal');
        },
      });
      return () => {
        // leaving the screen puts every forced output back to normal (docx §8.5)
        if (forcedPins().length) ctx.sim.resetForced();
        hint();
        offIo();
        offShape();
        offAction();
      };
    },
  });
}
