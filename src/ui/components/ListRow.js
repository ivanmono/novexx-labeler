/**
 * Generic list row (docx §5.4 "List row: formats, files, users, log entries — default, selected,
 * disabled"; §8 "lists need a defined row height, a scroll indication and an end-of-list marker";
 * plan P3-01). Rows sit in a `card-border` list; height is at least the 68 px row target (DT-13).
 *
 * Kinds:
 *   - value  — label left, value right, not tappable (user screen, key/value blocks)
 *   - nav    — title + meta line, chevron: opens something (folder, sub-screen)
 *   - select — title + meta line, radio mark: picks this row (format, file); `selected` fills it
 * States: default · selected · disabled (greyed, `aria-disabled`, tapping does nothing).
 *
 * Also here: the end-of-list marker and the scroll indication (a fade plus "more" chevron at the
 * bottom edge of a scroll area while content continues below it).
 *
 * Figma: `ListRow · Kind × State × Icon × Divider`, `ListEnd`.
 */
import { icon } from './Icon.js';
import { t } from '../../core/i18n.js';
import { esc, cx } from '../html.js';

/**
 * @param {{ kind?:'value'|'nav'|'select', title:string, meta?:string, value?:string,
 *           icon?:string|null, state?:'default'|'selected'|'disabled', last?:boolean,
 *           action?:string, id?:string|number, valueHtml?:string, tag?:string }} row
 * `tag`: a short brand pill after the title, e.g. "Loaded" on the format the machine runs with.
 */
export function renderListRow(row) {
  const {
    kind = 'nav',
    title,
    meta = '',
    value = '',
    valueHtml = null,
    icon: iconName = null,
    state = 'default',
    last = false,
    action = kind === 'select' ? 'pick' : 'open',
    id = '',
    tag = '',
  } = row;
  const props = `Kind=${kind},State=${state},Icon=${iconName ? 'yes' : 'no'},Divider=${last ? 'no' : 'yes'}`;
  const divider = !last && 'border-b border-line-soft';
  if (kind === 'value') {
    return `<div class="${cx('list-row flex items-center justify-between gap-4 min-h-touch-row px-4', divider)}" data-cmp="ListRow" data-cmp-props="${props}"><span class="text-body text-muted">${esc(title)}</span><span class="text-body font-semibold text-right truncate">${valueHtml ?? esc(value)}</span></div>`;
  }
  const selected = state === 'selected';
  const disabled = state === 'disabled';
  const lead = iconName
    ? `<span class="${cx('grid place-items-center size-11 rounded-md shrink-0', selected ? 'bg-brand text-on-brand' : 'bg-surface-2 text-chrome')}">${icon(iconName, { size: 28 })}</span>`
    : '';
  const trail =
    kind === 'select'
      ? `<span class="${cx('size-6 rounded-pill border-2 border-brand shrink-0 grid place-items-center')}" aria-hidden="true">${selected ? '<span class="size-3 rounded-pill bg-brand"></span>' : ''}</span>`
      : icon('chevron', { size: 22, class: 'text-faint shrink-0' });
  return `<button type="button" class="${cx('list-row pressable w-full text-left flex items-center gap-3 px-4 py-2 min-h-touch-row', divider, selected && 'bg-brand/15', disabled && 'opacity-40')}" data-action="${esc(action)}" data-id="${esc(String(id))}" ${selected ? 'aria-selected="true"' : ''} ${disabled ? 'aria-disabled="true"' : ''} data-cmp="ListRow" data-cmp-props="${props}">
      ${lead}
      <span class="flex-1 min-w-0 flex flex-col">
        <span class="${cx('text-body break-words line-clamp-2', selected ? 'font-semibold' : '')}">${esc(title)}</span>
        ${meta ? `<span class="text-label text-muted truncate">${esc(meta)}</span>` : ''}
      </span>
      ${tag ? `<span class="list-row__tag shrink-0 px-3 py-1 rounded-pill bg-brand/20 text-brand-hi t-caption" data-tag>${esc(tag)}</span>` : ''}
      ${value ? `<span class="t-param text-label text-muted shrink-0">${esc(value)}</span>` : ''}
      ${trail}
    </button>`;
}

/** Rows in a card with the end-of-list marker after them. */
export function renderList(rows, { end = true } = {}) {
  const html = rows.map((r, i) => renderListRow({ ...r, last: i === rows.length - 1 })).join('');
  return `<div class="card-border"><div class="py-1">${html}</div></div>${end ? renderListEnd() : ''}`;
}

/** End-of-list marker (docx §8): a short rule with "End of list" under the last row. */
export function renderListEnd() {
  return `<div class="list-end flex items-center gap-3 px-4 py-4" data-list-end data-cmp="ListEnd" data-cmp-props="State=default"><span class="flex-1 h-px bg-line-soft"></span><span class="t-caption text-faint">${esc(t('list.end'))}</span><span class="flex-1 h-px bg-line-soft"></span></div>`;
}

/**
 * Scroll indication (docx §8): while there is more below, the scroll area's parent shows a fade and a
 * chevron at its bottom edge. Wrap the scroll area in `.scroll-hint` and call this on the scroller.
 * @returns {() => void} dispose
 */
export function mountScrollHint(scroller) {
  const host = scroller.closest('.scroll-hint') ?? scroller.parentElement;
  if (!host) return () => {};
  if (!host.querySelector(':scope > .scroll-hint__more')) {
    host.insertAdjacentHTML(
      'beforeend',
      `<span class="scroll-hint__more" aria-hidden="true">${icon('chevron', { size: 28 })}</span>`,
    );
  }
  const update = () => {
    const more = scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 4;
    host.toggleAttribute('data-more', more);
  };
  update();
  scroller.addEventListener('scroll', update, { passive: true });
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
  ro?.observe(scroller);
  return () => {
    scroller.removeEventListener('scroll', update);
    ro?.disconnect();
  };
}
