/**
 * Stand-by layer (plan P1-16): after HMI_Standby_Timer minutes without touch the display dims
 * to the logo, device name and clock; any touch wakes it. The session is kept (auto log-off
 * is a separate timer per user).
 */
import { renderLogo } from '../components/Logo.js';
import { esc, el, hhmm } from '../html.js';

export function mountStandby(root, ctx) {
  let node = null;
  let clock = null;
  const show = () => {
    if (node) return;
    node = el(`
      <div class="standby absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 select-none" data-standby role="button" aria-label="${esc(ctx.t('standby.touch'))}">
        ${renderLogo(ctx, { size: 140 })}
        <div class="text-hero font-semibold text-muted truncate max-w-full px-6">${esc(ctx.store.getParam(600) ?? '')}</div>
        <div class="t-param text-display text-faint" data-clock>${hhmm(Date.now())}</div>
        <div class="t-caption text-faint">${esc(ctx.t('standby.touch'))}</div>
      </div>`);
    node.addEventListener('pointerdown', (e) => { e.stopPropagation(); ctx.sim.touch(); }, { passive: true });
    root.append(node);
    clock = setInterval(() => { const c = node?.querySelector('[data-clock]'); if (c) c.textContent = hhmm(Date.now()); }, 10_000);
  };
  const hide = () => { clearInterval(clock); node?.remove(); node = null; };
  const unsub = ctx.store.subscribe((s) => s.machine.standby, (on) => (on ? show() : hide()), { immediate: true });
  return () => { unsub(); hide(); };
}
