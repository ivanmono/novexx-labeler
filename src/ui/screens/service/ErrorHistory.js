/**
 * Error History (docx §8.7, plan P3-09): what went wrong, when, and who was logged in.
 *
 *   - Search field first (Input, Kind=text); tapping it unfolds the alphabetical keyboard below it,
 *     the check key folds it away. Filtering starts at the second character, over ID and message,
 *     while typing; only the list is re-rendered so the keyboard stays put.
 *   - Rows newest first (fixed): severity (icon + word + colour), ID, time, role; the message is
 *     clamped to two lines and the row opens the full text with what to do.
 *   - Empty and no-match states, end-of-list marker, FIFO note.
 *   - Read L1; Clear history L3 (node accessAction), destructive.
 */
import { renderTextField } from '../../components/AlphaKeyboard.js';
import { mountKeyboard } from '../../components/Keyboard.js';
import { renderListEnd, mountScrollHint } from '../../components/ListRow.js';
import { renderPlaceholder } from '../../components/Placeholder.js';
import { renderButton } from '../../components/Button.js';
import { confirmAction } from '../../components/ConfirmDialog.js';
import { icon } from '../../components/Icon.js';
import { canActNode } from '../../../core/access.js';
import { currentLanguage } from '../../../core/i18n.js';
import { searchErrors, errorText, ERRLOG_CAPACITY, SEARCH_MIN } from '../../../core/errorlog.js';
import { esc, cx, onAction } from '../../html.js';

const SEV = {
  high: { tone: 'bg-status-error/20 text-status-error-ink', icon: 'alarm' },
  mid: { tone: 'bg-status-warning/20 text-status-warning-ink', icon: 'alarm' },
  low: { tone: 'bg-surface-2 text-chrome', icon: 'help' },
};

const when = (ms) => {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** Full date for the detail dialog (the rows use the two-digit year, DT-62). */
const whenFull = (ms) => {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function render(ctx, { arg }) {
  const node = ctx.node(arg);
  let query = '';
  let keyboard = false;
  let kb = null;

  const who = (e) =>
    e.user ? `L${e.level} · ${e.user}` : e.level ? `L${e.level}` : ctx.t('err.nobody');

  const row = (e, i, last) => {
    const s = SEV[e.severity] ?? SEV.mid;
    const { text } = errorText(e.code, currentLanguage());
    // entry layout from Figma (DT-62): tag • ID • time / role / message, chevron centred at the right
    // line 1 may run over the chevron column (the chevron sits at mid-height, below it); lines 2–3 keep clear
    return `<button type="button" class="${cx('pressable relative w-full text-left pl-[13px] pr-4 py-3 block', !last && 'border-b border-line-soft')}" data-action="open" data-index="${i}" data-err="${esc(e.code)}">
        <span class="flex flex-col gap-[7px] [&>*:not(:first-child)]:pr-[30px]">
          <span class="flex items-center gap-[9px] min-w-0 whitespace-nowrap">
            <span class="${cx('flex items-center gap-2 t-caption px-2 pt-[3px] pb-px rounded-pill', s.tone)}" data-sev="${esc(e.severity)}">${icon(s.icon, { size: 18 })}${esc(ctx.t(`err.sev.${e.severity}`))}</span>
            <span class="t-param font-normal text-caption text-text" aria-hidden="true">•</span>
            <span class="t-param text-label">${esc(e.code)}</span>
            <span class="t-param font-normal text-caption text-text" aria-hidden="true">•</span>
            <span class="t-param text-label text-muted min-w-0 truncate">${esc(when(e.at))}</span>
          </span>
          <span class="text-label font-semibold text-level-${Math.max(0, Math.min(4, e.level ?? 0))}">${esc(who(e))}</span>
          <span class="text-body line-clamp-2 break-words">${esc(text)}</span>
        </span>
        ${icon('chevron', { size: 22, class: 'text-faint absolute right-4 top-1/2 -translate-y-1/2' })}
      </button>`;
  };

  const listHtml = () => {
    const all = ctx.store.get('errorlog');
    const shown = searchErrors(all, query, currentLanguage());
    const q = query.trim();
    const filtering = q.length >= SEARCH_MIN;
    const head = `<div class="t-caption text-muted px-1 pb-2" data-err-count>${esc(filtering ? ctx.t('err.results', { n: shown.length, total: all.length }) : q ? ctx.t('err.minChars') : ctx.t('err.results', { n: all.length, total: all.length }))}</div>`;
    if (!all.length)
      return `<div class="card-border"><div>${renderPlaceholder({ kind: 'empty', icon: 'history', title: ctx.t('err.empty'), text: ctx.t('err.emptyHint') })}</div></div>`;
    if (!shown.length)
      return `${head}<div class="card-border"><div>${renderPlaceholder({ kind: 'empty', icon: 'search', title: ctx.t('err.noMatch', { q }), text: ctx.t('err.noMatchHint') })}</div></div>`;
    return `${head}<div class="card-border"><div class="py-1">${shown.map((e, i) => row(e, i, i === shown.length - 1)).join('')}</div></div>${renderListEnd()}<p class="t-caption text-faint text-center pb-3">${esc(ctx.t('err.fifo', { total: ERRLOG_CAPACITY }))}</p>`;
  };

  const view = () => {
    const canClear = canActNode(node, ctx.level);
    const n = ctx.store.get('errorlog').length;
    return `
      <div class="flex-1 min-h-0 flex flex-col" data-error-history>
        <div class="px-3 pt-3">
          <div class="pressable" data-action="search" role="search" data-err-search>${renderTextField({ value: query, placeholder: ctx.t('err.search') })}</div>
          <div data-keys ${keyboard ? '' : 'hidden'}></div>
        </div>
        <div class="scroll-hint flex-1 min-h-0 mt-1">
          <div class="scroll-y h-full px-3" data-scroll>${listHtml()}</div>
        </div>
        ${
          keyboard
            ? ''
            : `<div class="px-3 pt-2 pb-8 land:pb-3 border-t border-line-soft" data-err-actions>
          <div class="${cx('grid', (!n || !canClear) && 'opacity-40')}">${renderButton({ label: ctx.t('err.clear'), action: !canClear ? 'clearLocked' : n ? 'clear' : 'nothing', tone: 'secondary', icon: canClear ? 'stop' : 'lock' })}</div>
        </div>`
        }
      </div>`;
  };

  ctx.shell.setScreen({
    title: ctx.t(`screen.${node.id}`),
    branch: node.branch,
    html: view(),
    mount(el) {
      let hint = () => {};
      const fieldText = () => {
        const f = el.querySelector('[data-entry]');
        if (!f) return;
        f.textContent = query || ctx.t('err.search');
        f.classList.toggle('text-faint/60', !query);
        f.classList.toggle('text-text', !!query);
      };
      const drawList = () => {
        const sc = el.querySelector('[data-scroll]');
        hint();
        sc.innerHTML = listHtml();
        sc.scrollTop = 0;
        hint = mountScrollHint(sc);
      };
      const openKeys = () => {
        const host = el.querySelector('[data-keys]');
        host.hidden = false;
        kb = mountKeyboard(host, {
          layout: 'lower',
          enterIcon: 'check',
          onInput: (k) => {
            query += k;
            fieldText();
            drawList();
          },
          onBackspace: () => {
            query = query.slice(0, -1);
            fieldText();
            drawList();
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
        hint();
        el.innerHTML = view();
        fieldText();
        hint = mountScrollHint(el.querySelector('[data-scroll]'));
        if (keyboard) openKeys();
      };
      redraw();
      const offStore = ctx.store.subscribe(
        (s) => [s.errorlog.length, s.errorlog.at(-1)?.at, s.session.level].join('|'),
        () => (keyboard ? drawList() : redraw()),
      );
      const offAction = onAction(el, {
        search: () => {
          if (keyboard) return;
          keyboard = true;
          redraw();
        },
        open: (btn) => {
          const e = searchErrors(ctx.store.get('errorlog'), query, currentLanguage())[
            Number(btn.dataset.index)
          ];
          if (!e) return;
          const { text, help } = errorText(e.code, currentLanguage());
          const details = [
            [ctx.t('err.sev.' + e.severity), whenFull(e.at)],
            [ctx.t('err.loggedIn', { who: who(e) }), ''],
          ];
          ctx.modal[e.severity === 'high' ? 'error' : 'info']({
            title: e.code,
            body: `<p class="font-semibold">${esc(text)}</p>${help ? `<p class="mt-3">${esc(help)}</p>` : ''}<p class="mt-4 text-label text-muted">${details.map(([a, b]) => esc([a, b].filter(Boolean).join(' · '))).join('<br>')}</p>`,
          });
        },
        clearLocked: () =>
          ctx.toast.reject(ctx.t('toast.needsLevel', { n: node.accessAction ?? 3 })),
        nothing: () => ctx.toast.reject(ctx.t('err.empty')),
        clear: async () => {
          const n = ctx.store.get('errorlog').length;
          const ok = await confirmAction(ctx, {
            title: ctx.t('err.clearTitle'),
            text: ctx.t('err.clearBody', { n }),
            okLabel: ctx.t('diag.clear'),
            destructive: true,
          });
          if (!ok) return;
          ctx.store.replace('errorlog', []);
          ctx.log('error-history', `cleared (${n} entries)`);
          ctx.toast.ok(ctx.t('err.cleared'));
        },
      });
      return () => {
        kb?.dispose();
        hint();
        offStore();
        offAction();
      };
    },
  });
}
