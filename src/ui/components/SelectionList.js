/**
 * Selection list editor (docx §5.4 / §7.2 "Selection List", plan P2-06): the options of a
 * discrete parameter in a sheet. Two to eight options normally; the 26-language list scrolls and
 * ends with a marker. Reserved options (Excel "reserved", e.g. Sensor_Type 226–232) are not
 * offered. Tapping an option applies it and closes the sheet.
 *
 * Figma component set `OptionRow · Selected=yes|no`.
 */
import { t } from '../../core/i18n.js';
import { esc, cx, onAction } from '../html.js';

export function renderOptionRow({ id, label, selected, last = false }) {
  return `<button type="button" class="${cx('option-row pressable w-full text-left flex items-center justify-between gap-3 px-4 min-h-touch-row', !last && 'border-b border-line-soft')}" data-action="pick" data-id="${esc(String(id))}" ${selected ? 'aria-selected="true"' : ''} data-cmp="OptionRow" data-cmp-props="Selected=${selected ? 'yes' : 'no'}">
      <span class="${cx('text-body break-words', selected ? 'font-semibold text-text' : 'text-text')}">${esc(label)}</span>
      <span class="${cx('size-5 rounded-pill border-2 border-brand shrink-0', selected && 'bg-brand')}" aria-hidden="true"></span>
    </button>`;
}

/** Options of a parameter without the reserved ones: [{ id, label }]. */
export function optionsFor(ctx, param) {
  return (param.options ?? [])
    .map((id) => ctx.option(id))
    .filter((o) => o && !o.reserved)
    .map((o) => ({ id: o.id, label: t(o.labelKey) }));
}

export function renderSelectionList(ctx, param, current) {
  const opts = optionsFor(ctx, param);
  const rows = opts
    .map((o, i) =>
      renderOptionRow({ ...o, selected: o.id === Number(current), last: i === opts.length - 1 }),
    )
    .join('');
  const end =
    opts.length > 8
      ? `<div class="t-caption text-faint text-center py-3" data-list-end>${esc(t('list.end'))}</div>`
      : '';
  return `<div class="selection-list card-border"><div class="py-1">${rows}</div></div>${end}`;
}

/** Open the sheet; resolves with the chosen option id or undefined. */
export function openSelectionList(ctx, param, { onPick } = {}) {
  const current = ctx.store.getParam(param.id);
  return ctx.sheet.open({
    title: t(param.labelKey),
    body: renderSelectionList(ctx, param, current),
    mount(body, close) {
      // bring the current option into view in long lists
      body.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'center' });
      return onAction(body, {
        pick: (btn) => {
          const id = Number(btn.dataset.id);
          onPick?.(id);
          close(id);
        },
      });
    },
  });
}
