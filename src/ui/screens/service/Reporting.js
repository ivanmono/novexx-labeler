/**
 * Reporting — service done (docx §8.8, plan P3-10): close out a service visit.
 *
 *   1. Read-only counters since the last service (719 distance, 720 time, 721 labels), formatted
 *      as on Information › Counters, plus when the last report was committed and by whom.
 *   2. The technician comment: a multi-line field; tapping it unfolds the alphabetical keyboard
 *      below it (the counters fold away meanwhile), the check key folds it back.
 *   3. Date and the logged-in user, filled in automatically and kept current.
 *   4. Commit (L3, node accessAction): confirmation, then one "service" entry in the log with the
 *      comment and the counter values, and the since-last-service counters go to 0.
 * Everything is visible without scrolling in all three layouts while the keyboard is folded.
 * The comment goes into the log, not into a parameter (docx §8.8 "Data source").
 */
import { mountKeyboard } from '../../components/Keyboard.js';
import { renderButton } from '../../components/Button.js';
import { confirmAction } from '../../components/ConfirmDialog.js';
import { icon } from '../../components/Icon.js';
import { canActNode } from '../../../core/access.js';
import { formatParamValue, fmtDate } from '../../format.js';
import { esc, cx, hhmm, onAction } from '../../html.js';

/** The "since last service" counters the commit resets (docx: "four", lists three; open point #55). */
export const SERVICE_COUNTERS = [719, 720, 721];
export const COMMENT_MAX = 240;
/** Short row labels: the block header already says "since the last service". */
const SHORT = { 719: 'report.distance', 720: 'report.time', 721: 'report.labels' };

export function render(ctx, { arg }) {
  const node = ctx.node(arg);
  let comment = '';
  let keyboard = false;
  let kb = null;

  const lastReport = () => [...ctx.store.get('logs')].reverse().find((e) => e.type === 'service');
  const now = () => new Date();
  const stamp = (d) => `${fmtDate(d.toISOString())} ${hhmm(d)}`;
  const who = () => {
    const s = ctx.store.get('session');
    return s.user ? `L${s.level} · ${s.user.name}` : `L${s.level}`;
  };

  const counters = () => {
    const last = lastReport();
    const rows = SERVICE_COUNTERS.map((id, i) => {
      const p = ctx.param(id);
      return `<div class="${cx('flex items-baseline gap-3 px-4 py-2.5', i < SERVICE_COUNTERS.length - 1 && 'border-b border-line-soft')}" data-counter="${id}">
          <span class="flex-1 min-w-0 text-body-sm text-muted truncate">${esc(ctx.t(SHORT[id]))}</span>
          <span class="t-param text-body-sm text-text shrink-0" data-value>${esc(formatParamValue(ctx, p))}</span>
        </div>`;
    }).join('');
    return `
      <section class="card-border" data-counters><div class="py-1">
        <div class="t-caption text-muted px-4 pt-2 pb-1">${esc(ctx.t('report.counters'))}</div>
        ${rows}
      </div></section>
      <p class="t-caption text-faint px-1" data-last>${esc(last ? ctx.t('report.last', { when: stamp(new Date(last.at)), who: last.user ? `L${last.level} · ${last.user}` : `L${last.level}` }) : ctx.t('report.lastNone'))}</p>`;
  };

  const commentField = (editing = false) => `
    <div class="pressable" data-action="edit" role="textbox" aria-multiline="true" aria-label="${esc(ctx.t('report.comment'))}" data-comment>
      <div class="card-border card-border--strong"><div class="${cx('relative px-4 pt-3 pb-2 flex flex-col gap-1 min-h-[124px]', editing ? 'land:min-h-0 land:py-2' : 'land:min-h-[112px]')}">
        <span class="${cx('flex-1 text-body leading-snug break-words line-clamp-3 whitespace-pre-wrap', editing && 'land:line-clamp-2 land:pr-16', comment ? 'text-text' : 'text-faint/60')}" data-entry>${esc(comment || ctx.t('report.commentPlaceholder'))}</span>
        <span class="${cx('t-caption text-faint/60 self-end', editing && 'land:absolute land:right-4 land:bottom-2')}" data-count>${comment.length}/${COMMENT_MAX}</span>
      </div></div>
    </div>`;

  // filled in automatically: date and time on the first line, the logged-in user below
  const stampBlock = () => `
    <div class="flex items-start gap-3 px-1" data-stamp>
      ${icon('history', { size: 24, class: 'text-muted shrink-0 mt-px' })}
      <span class="flex flex-col gap-1 min-w-0">
        <span class="t-param text-label text-text whitespace-nowrap" data-now>${esc(stamp(now()))}</span>
        <span class="text-label font-semibold text-level-${Math.max(0, Math.min(4, ctx.level))} truncate" data-who>${esc(who())}</span>
      </span>
    </div>`;

  const view = () => {
    const canCommit = canActNode(node, ctx.level);
    const commit = `<div class="${cx('grid', !canCommit && 'opacity-40')}">${renderButton({ label: ctx.t('report.commit'), action: canCommit ? 'commit' : 'commitLocked', tone: 'primary', icon: canCommit ? 'check' : 'lock', iconStroke: canCommit ? 3 : null })}</div>`;
    if (keyboard)
      return `
      <div class="flex-1 min-h-0 flex flex-col px-3 pt-3 gap-2" data-reporting data-editing>
        ${commentField(true)}
        <div data-keys></div>
      </div>`;
    return `
      <div class="flex-1 min-h-0 flex flex-col land:flex-row gap-3 px-3 pt-3 pb-8 land:pb-3" data-reporting>
        <div class="flex flex-col gap-2 land:flex-1 land:basis-0 land:min-w-0">${counters()}</div>
        <div class="flex flex-col gap-3 flex-1 land:basis-0 land:min-w-0">
          <div class="flex flex-col gap-2">
            <div class="t-caption text-muted px-1">${esc(ctx.t('report.comment'))}</div>
            ${commentField()}
          </div>
          ${stampBlock()}
          <div class="mt-auto">${commit}</div>
        </div>
      </div>`;
  };

  ctx.shell.setScreen({
    title: ctx.t(`screen.${node.id}`),
    branch: node.branch,
    html: view(),
    mount(el) {
      const fieldText = () => {
        const f = el.querySelector('[data-entry]');
        if (!f) return;
        f.textContent = comment || ctx.t('report.commentPlaceholder');
        f.classList.toggle('text-faint/60', !comment);
        f.classList.toggle('text-text', !!comment);
        const c = el.querySelector('[data-count]');
        if (c) c.textContent = `${comment.length}/${COMMENT_MAX}`;
      };
      const openKeys = () => {
        kb = mountKeyboard(el.querySelector('[data-keys]'), {
          layout: 'upper',
          enterIcon: 'check',
          onInput: (k) => {
            if (comment.length >= COMMENT_MAX) return ctx.toast.reject(ctx.t('report.tooLong', { n: COMMENT_MAX }));
            comment += k;
            fieldText();
          },
          onBackspace: () => {
            comment = comment.slice(0, -1);
            fieldText();
          },
          onEnter: () => {
            keyboard = false;
            redraw();
          },
        });
      };
      const redraw = () => {
        kb?.dispose();
        kb = null;
        el.innerHTML = view();
        if (keyboard) openKeys();
      };
      redraw();
      // the date/time and the counters stay current while the screen is open
      const timer = setInterval(() => {
        for (const n of el.querySelectorAll('[data-now]')) n.textContent = stamp(now());
      }, 15_000);
      const offStore = ctx.store.subscribe(
        (s) => [...SERVICE_COUNTERS.map((id) => s.params[id]), s.session.level, s.session.user?.name].join('|'),
        () => {
          if (keyboard) return;
          for (const id of SERVICE_COUNTERS) {
            const v = el.querySelector(`[data-counter="${id}"] [data-value]`);
            if (v) v.textContent = formatParamValue(ctx, ctx.param(id));
          }
          const w = el.querySelector('[data-who]');
          if (w && w.textContent !== who()) redraw();
        },
      );
      const offAction = onAction(el, {
        edit: () => {
          if (keyboard) return;
          keyboard = true;
          redraw();
        },
        commitLocked: () => ctx.toast.reject(ctx.t('toast.needsLevel', { n: node.accessAction ?? 3 })),
        commit: async () => {
          const ok = await confirmAction(ctx, {
            title: ctx.t('report.confirmTitle'),
            text: ctx.t(comment.trim() ? 'report.confirmBody' : 'report.confirmBodyEmpty'),
            okLabel: ctx.t('report.commit'),
          });
          if (!ok) return;
          const values = Object.fromEntries(SERVICE_COUNTERS.map((id) => [id, ctx.store.getParam(id)]));
          const summary = SERVICE_COUNTERS.map((id) => `${ctx.param(id).name} ${formatParamValue(ctx, ctx.param(id))}`).join(', ');
          ctx.log('service', `Service done${comment.trim() ? `: ${comment.trim()}` : ''} (${summary})`, {
            comment: comment.trim(),
            counters: values,
          });
          for (const id of SERVICE_COUNTERS) ctx.store.setParam(id, 0, { source: 'service' });
          comment = '';
          redraw();
          ctx.toast.ok(ctx.t('report.done'));
        },
      });
      return () => {
        kb?.dispose();
        clearInterval(timer);
        offStore();
        offAction();
      };
    },
  });
}
