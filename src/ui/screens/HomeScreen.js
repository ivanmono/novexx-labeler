/**
 * Home screen (docx §6.3, plan P1-12): the production state. Machine state, device name,
 * start/pause control, four quick links (HMI_Quicklink_1–4 hold ParamIDs), the logo area,
 * and the error/warning banner + overlay carried forward from the first draft.
 * Level 0 (the state the machine spends most time in): everything visible, operating
 * controls lead to login.
 */
import { icon } from '../components/Icon.js';
import { renderLogo } from '../components/Logo.js';
import { statusOf } from '../shell/StatusBar.js';
import { formatParamValue, paramLabel, relTime } from '../format.js';
import { esc, onAction, cx } from '../html.js';

const QUICKLINK_IDS = [614, 615, 616, 617];

/**
 * Quicklink card (Figma component set QuicklinkCard · State=filled|empty). Geometry per DT-05:
 * 116 px tall (114 inner + ring), 12 px padding, 4 px line gap, 20 px title on up to two lines,
 * 14 px bold value.
 */
export function renderQuickCard(ctx, p) {
  const screen = p.screens[0];
  const node = screen ? ctx.node(screen) : null;
  return `
        <button type="button" class="card-border card-border--surface pressable text-left" data-action="quick" data-pid="${p.id}" data-screen="${esc(screen ?? '')}" data-cmp="QuicklinkCard" data-cmp-props="State=filled">
          <div class="p-3 min-h-[114px] flex items-center gap-3">
            ${node ? icon(node.icon, { size: 32, class: `text-branch-${node.branch ?? 'settings'} shrink-0` }) : ''}
            <span class="min-w-0 flex-1 flex flex-col gap-1">
              <span class="block text-label text-muted truncate">${esc(node ? ctx.t(`screen.${node.id}`) : '')}</span>
              <span class="block text-body-lg font-semibold line-clamp-2">${esc(paramLabel(ctx, p))}</span>
              <span class="block t-param font-bold text-label text-brand-hi truncate" data-quick-value="${p.id}">${esc(formatParamValue(ctx, p))}</span>
            </span>
          </div>
        </button>`;
}

export function renderQuickEmpty(ctx) {
  return `<div class="card-border opacity-50" data-cmp="QuicklinkCard" data-cmp-props="State=empty"><div class="p-3 min-h-[114px] flex flex-col justify-center gap-1"><div class="text-label text-muted">${esc(ctx.t('home.quicklinkEmpty'))}</div><div class="text-caption text-faint">${esc(ctx.t('home.quicklinkHint'))}</div></div></div>`;
}

export function render(ctx) {
  const quickLinks = () =>
    QUICKLINK_IDS.map((qid) => {
      const pid = Number(ctx.store.getParam(qid));
      const p = pid ? ctx.param(pid) : null;
      return p ? renderQuickCard(ctx, p) : renderQuickEmpty(ctx);
    }).join('');

  const draw = () => {
    const m = ctx.store.get('machine');
    const st = statusOf(m);
    const running = m.state === 'run';
    const name = ctx.store.getParam(600) ?? '';
    const nErr = m.errors.length;
    const nWarn = m.warnings.length;
    const glow =
      st.key === 'alarm' ? 'shadow-glow-error' : running ? 'shadow-glow-run' : 'shadow-glow-brand';
    const btnDisabled = st.key === 'alarm' || st.key === 'booting';
    return `
      <div class="home flex-1 min-h-0 flex flex-col select-none" data-home data-state="${st.key}">
        <div class="home__top flex items-center justify-between px-6 py-2">
          ${renderLogo(ctx, { size: 110, variant: 'word' })}
          <div class="text-right min-w-0 flex flex-col gap-1"><div class="text-body font-semibold truncate">${esc(name)}</div><div class="text-label text-muted truncate">${esc(`${m.identity.type} · ${m.identity.serial}`)}</div></div>
        </div>
        <div class="home__center flex-1 min-h-0 flex flex-col items-center justify-center gap-8 py-2">
          <button type="button" class="${cx('home__run pressable grid place-items-center rounded-pill size-36 card-border card-border--strong', glow)}" data-action="toggle" aria-label="${esc(ctx.t(running ? 'home.pause' : 'home.start'))}" ${btnDisabled ? 'aria-disabled="true"' : ''}>
            <span class="grid place-items-center rounded-pill size-full ${running ? 'text-status-run' : ctx.level < 1 ? 'text-muted' : 'text-brand-hi'}">${icon(running ? 'pause' : 'play', { size: 64 })}</span>
          </button>
          <div class="home__pill inline-flex items-center gap-2 px-2 h-7 rounded-pill bg-surface-2" role="status">
            <span class="size-3 rounded-pill bg-${st.color}"></span><span class="t-caption leading-none">${esc(ctx.t(st.label))}</span>
          </div>
          ${ctx.level < 1 ? `<div class="text-label text-muted flex items-center gap-1">${icon('lock', { size: 18 })}${esc(ctx.t('home.loginToOperate'))}</div>` : ''}
        </div>
        <div class="home__quick grid grid-cols-2 gap-3 px-4 pb-8" data-quicklinks>${quickLinks()}</div>
        ${
          nErr || nWarn
            ? `
        <button type="button" class="${cx('home__banner pressable flex items-center gap-3 px-4 min-h-touch-row border-t text-body-sm font-semibold', nErr ? 'bg-status-error/15 border-status-error/40 text-status-error-ink' : 'bg-status-warning/15 border-status-warning/40 text-status-warning-ink')}" data-action="errors">
          ${icon('alarm', { size: 24 })}<span class="flex-1 text-left">${esc([nErr ? ctx.t('home.errors', { n: nErr }) : '', nWarn ? ctx.t('home.warnings', { n: nWarn }) : ''].filter(Boolean).join(' · '))}</span><span class="t-caption">${esc(ctx.t('home.showErrors'))}</span>
        </button>`
            : ''
        }
      </div>`;
  };

  const errorOverlay = () => {
    const m = ctx.store.get('machine');
    const rows = [
      ...m.errors.map((e) => ({ ...e, kind: 'error' })),
      ...m.warnings.map((w) => ({ ...w, kind: 'warning' })),
    ];
    const sevColor = {
      high: 'bg-status-error',
      mid: 'bg-status-warning',
      low: 'bg-status-standby',
    };
    return `
      <div class="absolute inset-0 z-30 flex flex-col justify-end bg-overlay" data-error-overlay role="dialog" aria-modal="true" aria-label="${esc(ctx.t('home.errorsTitle'))}">
        <div class="card-border card-border--strong m-3 max-h-[80%] flex"><div class="flex flex-col min-h-0 w-full">
          <div class="flex items-center gap-3 px-4 pt-4 pb-2"><span class="text-status-error-ink">${icon('alarm', { size: 32 })}</span><h2 class="text-title font-bold flex-1">${esc(ctx.t('home.errorsTitle'))}</h2>
            <button type="button" class="pressable size-touch-row grid place-items-center rounded-md text-chrome" data-action="closeErrors" aria-label="${esc(ctx.t('action.close'))}">${icon('plus', { size: 28, class: 'rotate-45' })}</button></div>
          <div class="scroll-y min-h-0 px-2 pb-2">
            ${
              rows.length
                ? rows
                    .map(
                      (r) => `
              <div class="flex items-start gap-3 px-2 py-3 border-b border-line-soft last:border-0 min-h-touch-row">
                <span class="mt-1.5 size-3 rounded-pill shrink-0 ${sevColor[r.severity] ?? 'bg-status-warning'}"></span>
                <span class="min-w-0 flex-1"><span class="block t-param text-body-sm">${esc(r.code)} <span class="text-muted font-normal">· ${esc(ctx.t(`severity.${r.severity}`))}</span></span><span class="block text-body">${esc(r.text)}</span></span>
                <span class="text-label text-muted shrink-0">${esc(relTime(r.at))}</span>
              </div>`,
                    )
                    .join('')
                : `<div class="p-6 text-center text-muted">${esc(ctx.t('home.noErrors'))}</div>`
            }
          </div>
          <div class="flex gap-3 p-4">
            ${m.warnings.length ? `<button type="button" class="pressable flex-1 h-touch rounded-md bg-surface-2 text-body font-semibold" data-action="ackWarnings">${esc(ctx.t('home.ackWarnings'))}</button>` : ''}
            ${m.errors.length ? `<button type="button" class="pressable flex-1 h-touch rounded-md bg-status-error text-white text-body font-semibold" data-action="resetAlarm">${esc(ctx.t('home.resetAlarm'))}</button>` : ''}
          </div>
        </div></div>
      </div>`;
  };

  ctx.shell.setScreen({
    title: null,
    html: draw(),
    mount(el) {
      let overlay = null;
      const openOverlay = () => {
        closeOverlay();
        el.insertAdjacentHTML('beforeend', errorOverlay());
        overlay = el.querySelector('[data-error-overlay]');
      };
      const closeOverlay = () => {
        overlay?.remove();
        overlay = null;
      };
      const needLogin = () => {
        ctx.toast.reject(ctx.t('home.loginToOperate'));
        ctx.go('login');
      };

      const dispose = onAction(el, {
        toggle: async () => {
          if (ctx.level < 1) return needLogin();
          const m = ctx.store.get('machine');
          if (m.state === 'run') return ctx.sim.command('Pause');
          const ok = await ctx.modal.confirm({
            title: ctx.t('home.start'),
            body: `<p>${esc(ctx.t('home.startConfirm'))}</p>`,
            okLabel: ctx.t('action.start'),
          });
          if (ok && !ctx.sim.command('Run')) ctx.toast.reject(ctx.t('toast.rejected'));
        },
        quick: (btn) => {
          if (ctx.level < 1) return needLogin();
          ctx.focusParam = Number(btn.dataset.pid);
          if (btn.dataset.screen) ctx.goScreen(btn.dataset.screen);
        },
        errors: openOverlay,
        closeErrors: closeOverlay,
        ackWarnings: () => {
          if (ctx.level < 1) return needLogin();
          ctx.sim.acknowledgeWarnings();
          refresh();
        },
        resetAlarm: () => {
          if (ctx.level < 1) return needLogin();
          ctx.sim.resetAlarm();
          refresh();
        },
      });
      const refresh = () => {
        const wasOpen = !!overlay;
        el.innerHTML = draw();
        overlay = null;
        if (
          wasOpen &&
          (ctx.store.get('machine').errors.length || ctx.store.get('machine').warnings.length)
        )
          openOverlay();
      };
      const unsubs = [
        ctx.store.subscribe(
          (s) =>
            `${s.machine.state}|${s.machine.standby}|${s.machine.booted}|${s.machine.errors.length}|${s.machine.warnings.length}|${s.session.level}`,
          refresh,
        ),
        ctx.store.onAnyParam((id, value) => {
          const node = el.querySelector(`[data-quick-value="${id}"]`);
          if (node) node.textContent = formatParamValue(ctx, ctx.param(id), value);
          if (QUICKLINK_IDS.includes(Number(id)) || Number(id) === 600 || Number(id) === 608)
            refresh();
        }),
      ];
      return () => {
        dispose();
        unsubs.forEach((u) => u());
      };
    },
  });
}
