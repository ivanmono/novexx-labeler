/**
 * Table row for the IO test (docx §5.4 "Table row: input, output, forced"; §8.4 "modular elements —
 * row, group header, state indicator — for a scrollable list, not one fixed table"; plan P3-01).
 *
 * Columns: pin · function · state · force. The state indicator shows HIGH / LOW as text and colour
 * (colour is never the only carrier). Outputs carry a force switch; it is disabled below L3. A forced
 * output is marked: amber edge, "Forced" tag and the switch on — so it can be found in a long list.
 * Inputs have no switch; their last column stays empty so the columns line up.
 *
 * Figma: `TableRow · Kind=input|output × Value=high|low × Forced=yes|no`, `TableHeader`.
 */
import { t } from '../../core/i18n.js';
import { esc, cx } from '../html.js';

const GRID = 'grid grid-cols-[80px_minmax(0,1fr)_96px_88px] items-center gap-x-2';
// read-only face (below L3, docx §8.5): no force column
const GRID_RO = 'grid grid-cols-[80px_minmax(0,1fr)_96px] items-center gap-x-2';

export function renderTableHeader({ force = true } = {}) {
  return `<div class="${cx(force ? GRID : GRID_RO, 'io-header px-4 py-2 border-b border-line-soft t-caption text-muted')}" data-cmp="TableHeader" data-cmp-props="State=default">
      <span>${esc(t('io.pin'))}</span><span>${esc(t('io.function'))}</span><span class="text-center">${esc(t('io.state'))}</span>${force ? `<span class="text-center">${esc(t('io.force'))}</span>` : ''}
    </div>`;
}

/** State indicator: a lamp pill, filled dot + HIGH on green, ring + LOW on grey (colour is not the only cue). */
export function renderStateLamp(high) {
  return `<span class="${cx('justify-self-center flex items-center gap-1.5 t-param text-label pl-2 pr-3 pt-[5px] pb-[3px] rounded-pill', high ? 'bg-status-run text-on-brand' : 'bg-surface-2 text-muted')}" data-state="${high ? 'high' : 'low'}"><span class="${cx('size-2.5 rounded-pill', high ? 'bg-on-brand' : 'border-2 border-current')}" aria-hidden="true"></span>${esc(t(high ? 'io.high' : 'io.low'))}</span>`;
}

/** Force switch (also usable on its own): 64 × 36 track inside a 68 px touch area. */
export function renderSwitch({
  on = false,
  disabled = false,
  action = 'force',
  id = '',
  label = '',
} = {}) {
  return `<button type="button" role="switch" aria-checked="${on}" ${disabled ? 'aria-disabled="true"' : ''} aria-label="${esc(label)}" class="${cx('hmi-switch pressable grid place-items-center size-touch-row justify-self-center', disabled && 'opacity-40')}" data-action="${esc(action)}" data-id="${esc(String(id))}"><span class="hmi-switch__track"><span class="hmi-switch__knob"></span></span></button>`;
}

/**
 * @param {{ id?:string, pin:string, label:string, kind:'input'|'output', high:boolean,
 *           forced?:boolean, canForce?:boolean, force?:boolean, forcedNote?:string, last?:boolean }} row
 * `force` false = read-only face without the force column; `forcedNote` replaces "Forced" (e.g. the
 * time left before the output resets).
 */
export function renderTableRow(row) {
  const {
    id = row.pin,
    pin,
    label,
    kind,
    high,
    forced = false,
    canForce = false,
    force = true,
    forcedNote = null,
    last = false,
  } = row;
  const isOut = kind === 'output';
  const marked = isOut && forced;
  return `<div class="${cx(force ? GRID : GRID_RO, 'io-row relative px-4 min-h-touch-row', !last && 'border-b border-line-soft', marked && 'bg-status-warning/10')}" data-io="${esc(id)}" ${marked ? 'data-forced="true"' : ''} data-cmp="TableRow" data-cmp-props="Kind=${kind},Value=${high ? 'high' : 'low'},Forced=${marked ? 'yes' : 'no'}">
      ${marked ? '<span class="absolute inset-y-0 left-0 w-1.5 bg-status-warning" aria-hidden="true"></span>' : ''}
      <span class="flex flex-col gap-0.5">
        <span class="t-param text-label text-muted">${esc(pin)}</span>
        <span class="${cx('self-start t-caption px-1.5 pt-[2px] leading-[19px] rounded-xs', isOut ? 'bg-brand/20 text-brand-hi' : 'bg-surface-2 text-chrome')}" data-dir>${esc(t(isOut ? 'io.out' : 'io.in'))}</span>
      </span>
      <span class="min-w-0 flex flex-col py-2">
        <span class="text-body break-words line-clamp-2">${esc(label)}</span>
        ${marked ? `<span class="t-caption text-status-warning-ink" data-forced-note>${esc(forcedNote ?? t('io.forced'))}</span>` : ''}
      </span>
      ${renderStateLamp(high)}
      ${!force ? '' : isOut ? renderSwitch({ on: forced, disabled: !canForce, id, label: `${t('io.force')} ${pin}` }) : '<span></span>'}
    </div>`;
}
