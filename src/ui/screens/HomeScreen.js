/**
 * Home screen (docx §6.3) — Phase 1 shell version. Shows machine state, device name, the
 * start/pause control and the logo area. Quick links, error overlay and level-0 details are
 * completed in P1-12.
 */
import { icon } from '../components/Icon.js';
import { renderLogo } from '../components/Logo.js';
import { statusOf } from '../shell/StatusBar.js';
import { esc, onAction } from '../html.js';

export function render(ctx) {
  const draw = () => {
    const m = ctx.store.get('machine');
    const st = statusOf(m);
    const running = m.state === 'run';
    const name = ctx.store.getParam(600) ?? '';
    return `
      <div class="home flex-1 flex flex-col items-center justify-between p-6 gap-4 select-none" data-home>
        <div class="home__logo">${renderLogo(ctx, { size: 96, variant: 'word' })}</div>
        <div class="flex flex-col items-center gap-4">
          <button type="button" class="home__run pressable grid place-items-center rounded-pill size-40 card-border card-border--strong ${running ? 'shadow-glow-run' : st.key === 'alarm' ? 'shadow-glow-error' : 'shadow-glow-brand'}" data-action="toggle" aria-label="${esc(ctx.t(running ? 'action.pause' : 'action.start'))}" ${st.key === 'alarm' || st.key === 'booting' ? 'aria-disabled="true"' : ''}>
            <span class="grid place-items-center rounded-pill size-full ${running ? 'text-status-run' : 'text-brand-hi'}">${icon(running ? 'pause' : 'play', { size: 72 })}</span>
          </button>
          <div class="text-title font-bold truncate w-full text-center">${esc(name)}</div>
          <div class="home__pill inline-flex items-center gap-2 px-4 h-10 rounded-pill bg-surface-2 text-body-sm font-semibold">
            <span class="size-3 rounded-pill bg-${st.color}"></span><span class="t-caption">${esc(ctx.t(st.label))}</span>
          </div>
        </div>
        <div class="text-label text-muted">${esc(ctx.t('home.quicklinks'))} · P1-12</div>
      </div>`;
  };
  ctx.shell.setScreen({
    title: null,
    html: draw(),
    mount(el) {
      const dispose = onAction(el, {
        toggle: () => {
          if (!ctx.sim.toggleRun()) ctx.toast.reject(ctx.t('toast.rejected'));
        },
      });
      const unsub = ctx.store.subscribe((s) => `${s.machine.state}|${s.machine.standby}|${s.machine.booted}`, () => {
        el.innerHTML = draw();
      });
      return () => {
        dispose();
        unsub();
      };
    },
  });
}
