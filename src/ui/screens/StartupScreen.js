/**
 * Start-up screen (docx §8.17): logo area, device name, progress against previous boot
 * durations (smooth, never jumps), discreet machine type + FW line, "still starting" and
 * failed-start states. Not operable; works in every orientation (no bars).
 */
import { esc } from '../html.js';
import { renderLogo } from '../components/Logo.js';

export function render(ctx) {
  const m = ctx.store.get('machine');
  const name = ctx.store.getParam(600) ?? ctx.data.machine.hmiDeviceNameDefault;
  ctx.shell.setScreen({
    bars: false,
    html: `
      <div class="startup flex-1 flex flex-col items-center justify-center gap-8 p-8 text-center select-none" data-startup>
        <div class="startup__logo">${renderLogo(ctx, { size: 160 })}</div>
        <div class="text-hero font-semibold truncate w-full text-center">${esc(name)}</div>
        <div class="w-full max-w-[320px] flex flex-col gap-2">
          <div class="h-2 rounded-pill bg-surface-2 overflow-hidden"><div class="h-full rounded-pill bg-brand transition-[width] duration-200" data-bar style="width:0%"></div></div>
          <div class="text-label text-muted" data-msg>${esc(ctx.t('startup.booting'))}</div>
        </div>
        <div class="text-caption text-faint t-caption" data-id>${esc(`${m.identity.type} · FW ${m.identity.firmware}`)}</div>
      </div>`,
    mount(el) {
      const bar = el.querySelector('[data-bar]');
      const msg = el.querySelector('[data-msg]');
      const unsub = ctx.store.subscribe((s) => s.machine, (mm) => {
        bar.style.width = `${Math.round((mm.bootProgress ?? 0) * 100)}%`;
        if (mm.bootError) {
          bar.className = 'h-full rounded-pill bg-status-error';
          msg.innerHTML = `<span class="text-status-error-ink font-semibold">${esc(ctx.t('startup.failed'))}</span><br>${esc(mm.bootError)}`;
        } else if (mm.bootLong) msg.textContent = ctx.t('startup.stillStarting');
        else msg.textContent = ctx.t('startup.booting');
      }, { immediate: true });
      return unsub;
    },
  });
}
