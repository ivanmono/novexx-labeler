/**
 * Parameter row (docx §5.4 "Parameter row", §6.2 ParamID visible, §7.1, §7.3): the one row pattern
 * for all parameter screens. Label with the small low-contrast ParamID, value with unit, and an
 * affordance that tells the state before touching: chevron (editable), lock (needs a higher
 * level; tapping toasts "needs level n"), nothing (read-only / live value), play (action).
 * Label and value wrap to two lines instead of truncating at the XL type scale (DT-15).
 * A value that differs from its default carries a marker. Indent 0–2 nests conditional rows
 * under their switch.
 *
 * Figma component set `ParamRow · State=default|locked|readonly|action × Indent=0|1|2 × Help × Changed`.
 */
import { icon } from './Icon.js';
import { esc, cx } from '../html.js';

const INDENT = ['pl-4', 'pl-9', 'pl-14'];

/**
 * @param {{ pid:number, label:string, value:string, indent?:number, locked?:boolean,
 *           readOnly?:boolean, action?:boolean, live?:boolean, changed?:boolean,
 *           favourite?:boolean, help?:boolean, needLevel?:number|null, last?:boolean }} row
 */
export function renderParamRow(row) {
  const {
    pid,
    label,
    value,
    indent = 0,
    locked = false,
    readOnly = false,
    action = false,
    live = false,
    changed = false,
    favourite = false,
    help = false,
    needLevel = null,
    last = false,
  } = row;
  const state = locked ? 'locked' : action ? 'action' : readOnly ? 'readonly' : 'default';
  const interactive = !readOnly || locked;
  const tag = interactive ? 'button' : 'div';
  const affordance = locked
    ? icon('lock', { size: 22, class: 'text-muted shrink-0' })
    : action
      ? icon('activate', { size: 24, class: 'text-brand-hi shrink-0' })
      : readOnly
        ? ''
        : icon('chevron', { size: 22, class: 'text-faint shrink-0' });
  const main = `<${tag} ${interactive ? 'type="button"' : ''} class="${cx('param-row flex-1 min-w-0 text-left flex items-center gap-3 pr-2 min-h-touch-row', INDENT[Math.min(indent, 2)], interactive && 'pressable')}" data-row="${pid}" ${interactive ? `data-action="${locked ? 'locked' : action ? 'run' : 'edit'}" data-pid="${pid}"` : ''} ${locked && needLevel != null ? `data-need-level="${needLevel}"` : ''} ${changed ? 'data-changed="true"' : ''} ${live ? 'data-live="true"' : ''}>
      <span class="flex-1 min-w-0 py-2.5 flex items-baseline gap-2">
        <span class="${cx('text-body line-clamp-2 break-words min-w-0', locked ? 'text-muted' : 'text-text')}">${esc(label)} <span class="t-param text-caption text-faint whitespace-nowrap" aria-label="ParamID">${pid}</span></span>
        ${favourite ? '<span class="text-brand text-label shrink-0" aria-label="favourite">★</span>' : ''}
      </span>
      <span class="flex items-center gap-2 shrink-0 max-w-[45%]">
        ${changed ? '<span class="size-2 rounded-pill bg-brand shrink-0" aria-label="changed from default"></span>' : ''}
        <span class="${cx('text-body font-semibold text-right line-clamp-2 break-words', readOnly && !live ? 'text-muted' : 'text-text')}" data-value>${esc(value)}</span>
        ${affordance}
      </span>
    </${tag}>`;
  // the help indicator is its own touch target (docx §7.1), so the row keeps one action
  const helpBtn = help
    ? `<button type="button" class="pressable size-touch-row grid place-items-center rounded-md text-faint shrink-0" data-action="help" data-help-for="${pid}" aria-label="Help">${icon('help', { size: 20 })}</button>`
    : '';
  return `<div class="${cx('param-row-wrap flex items-stretch pr-1', !last && 'border-b border-line-soft')}" data-cmp="ParamRow" data-cmp-props="State=${state},Indent=${Math.min(indent, 2)},Help=${help ? 'yes' : 'no'},Changed=${changed ? 'yes' : 'no'}">${main}${helpBtn}</div>`;
}
