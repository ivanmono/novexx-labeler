/**
 * Parameter row (docx §5.4 "Parameter row", §6.2 ParamID visible, §7.1, §7.3): the one row pattern
 * for all parameter screens. Label with the small low-contrast ParamID, value with unit, and an
 * affordance that tells the state before touching: chevron (editable), lock (needs a higher
 * level; tapping toasts "needs level n"), nothing (read-only / live value), play (action).
 * Label and value wrap to two lines instead of truncating at the XL type scale (DT-15); both are label
 * size (20 px, DT-30); the ParamID always has its own line under the name (DT-31). Dependent rows
 * carry a corner mark (└) before the name (DT-30).
 * A value that differs from its default carries a marker. Indent 0–2 nests conditional rows
 * under their switch.
 *
 * Figma component set `ParamRow · State=default|locked|readonly|action × Indent=0|1|2 × Help × Changed`.
 */
import { icon } from './Icon.js';
import { esc, cx } from '../html.js';

// dependent rows: one step in per level, minus the corner mark's width, so names line up as before
const INDENT = ['pl-4', 'pl-4', 'pl-9'];

/**
 * @param {{ pid:number, label:string, value:string, indent?:number, locked?:boolean,
 *           readOnly?:boolean, action?:boolean, live?:boolean, changed?:boolean,
 *           favourite?:boolean, help?:boolean, needLevel?:number|null, last?:boolean,
 *           context?:{label:string, branch:string}|null }} row
 * `context` (Favourites, DT-25/27/29): the screen the parameter lives on, in its branch colour, above the
 * label; value and chevron sit on the name's line, help stays in its right-hand column.
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
    context = null,
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
  const attrs = `data-row="${pid}" ${interactive ? `data-action="${locked ? 'locked' : action ? 'run' : 'edit'}" data-pid="${pid}"` : ''} ${locked && needLevel != null ? `data-need-level="${needLevel}"` : ''} ${changed ? 'data-changed="true"' : ''} ${live ? 'data-live="true"' : ''}`;
  const valueBox = (cls, valueCls) => `<span class="${cls}">
        ${changed ? '<span class="size-2 rounded-pill bg-brand shrink-0" aria-label="changed from default"></span>' : ''}
        <span class="${cx('font-semibold text-right', valueCls, readOnly && !live ? 'text-muted' : 'text-text')}" data-value>${esc(value)}</span>
        ${affordance}
      </span>`;
  // Favourites card (DT-25/27/29): screen name, name, ParamID stacked on the left; value and chevron
  // on the name's line; help in its own column at the right, as in the list rows
  const card = context
    ? `<${tag} ${interactive ? 'type="button"' : ''} class="${cx('param-row flex-1 min-w-0 text-left grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 pl-4 pr-0 py-3 min-h-[100px]', interactive && 'pressable')}" ${attrs}>
      <span class="col-start-1 row-start-1 mb-2 text-label font-semibold text-branch-${esc(context.branch)} truncate">${esc(context.label)}</span>
      <span class="${cx('col-start-1 row-start-2 text-label font-semibold line-clamp-2 break-words min-w-0', locked ? 'text-muted' : 'text-text')}">${esc(label)}</span>
      <span class="col-start-1 row-start-3 t-param text-caption text-faint" aria-label="ParamID">${pid}</span>
      ${valueBox('col-start-2 row-start-2 flex items-center gap-2 max-w-[260px]', 'text-label truncate')}
    </${tag}>`
    : '';
  const main =
    card ||
    `<${tag} ${interactive ? 'type="button"' : ''} class="${cx('param-row flex-1 min-w-0 text-left flex items-center gap-3 pr-0 min-h-touch-row', INDENT[Math.min(indent, 2)], interactive && 'pressable')}" ${attrs}>
      <span class="flex-1 min-w-0 py-2 flex items-start gap-2">
        ${indent > 0 ? '<span class="size-3 shrink-0 mt-[3px] border-l-2 border-b-2 border-faint rounded-bl-[3px]" aria-hidden="true" data-indent-mark></span>' : ''}
        <span class="min-w-0 flex flex-col">
          <span class="flex items-baseline gap-2">
            <span class="${cx('text-label line-clamp-2 break-words min-w-0', locked ? 'text-muted' : 'text-text')}">${esc(label)}</span>
            ${favourite ? '<span class="text-brand text-label shrink-0" aria-label="favourite">★</span>' : ''}
          </span>
          <span class="t-param text-caption text-faint" aria-label="ParamID">${pid}</span>
        </span>
      </span>
      ${valueBox('flex items-center gap-2 shrink-0 max-w-[45%]', 'text-label line-clamp-2')}
    </${tag}>`;
  // the help indicator is its own touch target (docx §7.1), so the row keeps one action
  const helpBtn = help
    ? `<button type="button" class="${cx('pressable h-touch-row grid place-items-center rounded-md text-faint shrink-0', 'w-12 justify-items-end pr-3', context ? 'self-start mt-[22px]' : 'self-center')}" data-action="help" data-help-for="${pid}" aria-label="Help">${icon('help', { size: 20 })}</button>`
    : '';
  return `<div class="${cx('param-row-wrap flex items-stretch pr-1', !last && 'border-b border-line-soft')}" data-cmp="ParamRow" data-cmp-props="State=${state},Indent=${Math.min(indent, 2)},Help=${help ? 'yes' : 'no'},Changed=${changed ? 'yes' : 'no'}">${main}${helpBtn}</div>`;
}
