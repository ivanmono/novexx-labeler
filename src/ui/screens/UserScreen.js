/**
 * User screen (nav badge at level ≥1): who is logged in, level, auto log-off, elevated access
 * window, log out. User Management (docx §8.14) is linked from here in Phase 3.
 */
import { icon } from '../components/Icon.js';
import { renderButton } from '../components/Button.js';
import { renderListRow } from '../components/ListRow.js';
import { esc, onAction, hhmm } from '../html.js';
import { confirmAction } from '../components/ConfirmDialog.js';

export function render(ctx) {
  const s = ctx.session;
  if (!s.user && s.level === 0) {
    ctx.router.replace('login');
    return;
  }
  const u = s.user ?? { name: ctx.t(`level.${s.level}`), level: s.level, autoLogoffMin: 0 };
  const row = (label, value, last = false) =>
    renderListRow({ kind: 'value', title: label, valueHtml: value, last });
  const elevated = s.level === 4 && s.elevatedUntil;
  ctx.shell.setScreen({
    title: ctx.t('user.title'),
    html: `
      <div class="flex-1 scroll-y p-4 pb-8 land:pb-4 flex flex-col gap-4">
        <div class="card-border"><div class="flex items-center gap-4 p-4">
          <span class="grid place-items-center size-14 rounded-pill bg-level-${s.level} text-black font-bold text-body-lg">${esc(`L${s.level}`)}</span>
          <div class="min-w-0"><div class="t-caption text-muted">${esc(ctx.t('user.loggedInAs'))}</div><div class="text-title font-bold truncate">${esc(u.name)}</div></div>
        </div></div>
        <div class="card-border"><div class="py-1">
          ${row(ctx.t('user.level'), `<span class="text-level-${s.level}">${esc(`L${s.level} · ${ctx.t(`level.${s.level}`)}`)}</span>`)}
          ${row(ctx.t('user.autoLogoff'), esc(u.autoLogoffMin ? ctx.t('user.minutes', { n: u.autoLogoffMin }) : ctx.t('user.never')), !elevated)}
          ${elevated ? row(ctx.t('level.4'), `<span class="text-level-4">${esc(ctx.t('user.secureUntil', { time: hhmm(s.elevatedUntil) }))}</span>`, true) : ''}
        </div></div>
        <!-- landscape: management and log out share the bottom row, so log out needs no scrolling (DT-44) -->
        <div class="contents land:mt-auto land:grid land:grid-cols-[3fr_2fr] land:gap-4">
          <button type="button" class="card-border pressable text-left" data-action="manage">
            <div class="flex items-center gap-3 px-4 min-h-touch">${icon('usermanage', { size: 32, class: 'text-branch-usermgmt' })}<span class="flex-1 text-body font-semibold">${esc(ctx.t('user.manage'))}</span>${icon('chevron', { size: 24, class: 'text-faint' })}</div>
          </button>
          ${renderButton({ label: ctx.t('user.logout'), action: 'logout', icon: 'lock', extra: 'mt-auto land:mt-0' })}
        </div>
      </div>`,
    mount(el) {
      return onAction(el, {
        manage: () => ctx.goScreen('usermanage'),
        logout: async () => {
          if (
            await confirmAction(ctx, {
              title: ctx.t('user.logout'),
              text: ctx.t('user.logoutConfirm', { name: u.name }),
              okLabel: ctx.t('user.logout'),
            })
          )
            ctx.logout();
        },
      });
    },
  });
}
