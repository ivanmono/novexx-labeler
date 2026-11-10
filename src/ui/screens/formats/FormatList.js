/**
 * Shared page for Select Format and Modify Format (docx §8.1 / §8.2 "same list component"):
 * the stored formats newest first (name, date, who saved it, the loaded one tagged), a status line
 * and one primary action at the bottom. Built from the P3-01 pieces (ListRow, ListEnd, scroll
 * indication, Placeholder, Button).
 */
import { renderListRow, renderListEnd } from '../../components/ListRow.js';
import { renderPlaceholder } from '../../components/Placeholder.js';
import { renderButton } from '../../components/Button.js';
import { icon } from '../../components/Icon.js';
import { sortedFormats } from '../../../core/formats.js';
import { fmtDate } from '../../format.js';
import { esc, cx } from '../../html.js';

/** "12.09.2026 · m.mustermann (L3)": what tells two similar formats apart (§8.1). */
export function formatMeta(f) {
  return [fmtDate(f.savedAt), f.by ? `${f.by}${f.level ? ` (L${f.level})` : ''}` : null]
    .filter(Boolean)
    .join(' · ');
}

/**
 * @param {object} ctx
 * @param {{ formats:object[], loadedId:string|null, selectedId:string|null,
 *           status?:{ text:string, tone?:'muted'|'warning'|'ok' }|null,
 *           button:{ label:string, action:string, enabled:boolean, icon?:string|null } }} o
 */
export function renderFormatPage(ctx, { formats, loadedId, selectedId, status = null, button }) {
  if (!formats.length) {
    return `<div class="flex-1 min-h-0 grid place-items-center p-4 pb-8 land:pb-4" data-formats-empty>${renderPlaceholder(
      {
        kind: 'empty',
        icon: 'recipe',
        title: ctx.t('format.empty'),
        text: ctx.t('format.emptyHint'),
        action: { label: ctx.t('screen.createformat'), action: 'create', tone: 'secondary' },
      },
    )}</div>`;
  }
  const list = sortedFormats(formats);
  const rows = list
    .map((f, i) =>
      renderListRow({
        kind: 'select',
        title: f.name,
        meta: formatMeta(f),
        tag: f.id === loadedId ? ctx.t('format.loaded') : '',
        id: f.id,
        state: f.id === selectedId ? 'selected' : 'default',
        last: i === list.length - 1,
      }),
    )
    .join('');
  const tone = status?.tone ?? 'muted';
  const statusLine = status
    ? `<div class="${cx('flex items-center gap-2 min-h-8 px-1 text-label land:flex-1 land:min-w-0', tone === 'warning' ? 'text-status-warning-ink font-semibold' : tone === 'ok' ? 'text-status-run-ink' : 'text-muted')}" data-format-status="${tone}">${tone === 'warning' ? icon('alarm', { size: 24, class: 'shrink-0' }) : tone === 'ok' ? icon('check', { size: 24, class: 'shrink-0' }) : ''}<span>${esc(status.text)}</span></div>`
    : '';
  return `
    <div class="flex-1 min-h-0 flex flex-col" data-formats>
      <div class="scroll-hint flex-1 min-h-0">
        <div class="scroll-y h-full px-3 pt-3" data-scroll>
          <div class="card-border"><div class="py-1">${rows}</div></div>
          ${renderListEnd()}
        </div>
      </div>
      <div class="px-3 pt-2 pb-8 land:pb-3 flex flex-col land:flex-row land:items-center gap-2 land:gap-4 border-t border-line-soft" data-format-actions>
        ${statusLine}
        <div class="${cx('grid land:w-[280px] land:shrink-0', !button.enabled && 'opacity-40')}" data-primary="${button.enabled ? 'on' : 'off'}">${renderButton({ label: button.label, action: button.action, tone: 'primary', icon: button.icon ?? null })}</div>
      </div>
    </div>`;
}

/** A translated sentence with the format name in bold (escaped). */
export function withName(ctx, key, name, extra = {}) {
  const MARK = '@@name@@';
  return esc(ctx.t(key, { ...extra, name: MARK })).replace(MARK, `<b>${esc(name)}</b>`);
}

/** Store key that changes when the format pages must redraw. */
export function formatsKey(s) {
  return [
    s.machine.state,
    s.session.level,
    s.settings.loadedFormat,
    s.formats.map((f) => f.id + f.savedAt).join(','),
  ].join('|');
}

/**
 * Redraw on store changes and when a format-relevant parameter changes (the "n parameters differ"
 * line); parameter bursts are folded into one redraw.
 */
export function watchFormats(ctx, ids, redraw) {
  const relevant = new Set(ids);
  let queued = false;
  const later = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      redraw();
    });
  };
  const offStore = ctx.store.subscribe(formatsKey, later);
  const offParams = ctx.store.onAnyParam((key) => relevant.has(String(key)) && later());
  return () => {
    offStore();
    offParams();
  };
}

/** Re-render in place, keeping the list's scroll position. */
export function redrawKeepingScroll(el, html) {
  const top = el.querySelector('[data-scroll]')?.scrollTop ?? 0;
  el.innerHTML = html;
  const sc = el.querySelector('[data-scroll]');
  if (sc) sc.scrollTop = top;
}
