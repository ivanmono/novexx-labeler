/**
 * Time and date picker (plan P2-13, OPEN-POINTS #3): Info_Time (700) and Info_Date (701) are
 * Strings with a numeric keypad in the Excel, and docx §7.2 has no date/time control. One column
 * per field (hours : minutes, day . month . year) with 60 px up / down steppers above and below
 * the value, so the finger never covers what it changes. Hours, minutes, day and month wrap;
 * the year stops at the parameter range. A date that does not exist (31.02.) or lies outside the
 * range is explained inline and Set stays disabled — never corrected (docx §7.3). "Now" takes
 * the device clock. Seconds are not edited; Info_Time is stored as hh:mm:00.
 *
 * Figma component set `DateTimePicker · Kind=time|date × State=default|error`.
 */
import { icon } from './Icon.js';
import { renderButton } from './Button.js';
import { parseTime, formatTime, parseDate, validateDate } from '../../core/validate.js';
import { t } from '../../core/i18n.js';
import { esc, cx, onAction } from '../html.js';

const pad = (n) => String(n).padStart(2, '0');
const wrap = (v, lo, hi) => (v > hi ? lo : v < lo ? hi : v);

/** Field specs per kind: key, label key, range, digits shown. */
function fieldsFor(param) {
  if (param.control === 'time')
    return [
      { key: 'h', label: 'picker.hour', min: 0, max: 23, wrap: true },
      { key: 'm', label: 'picker.minute', min: 0, max: 59, wrap: true },
    ];
  const lo = parseDate(param.min)?.y ?? 2000;
  const hi = parseDate(param.max)?.y ?? 2099;
  return [
    { key: 'd', label: 'picker.day', min: 1, max: 31, wrap: true },
    { key: 'm', label: 'picker.month', min: 1, max: 12, wrap: true },
    { key: 'y', label: 'picker.year', min: lo, max: hi, wrap: false, digits: 4 },
  ];
}

/** The value as picker fields; falls back to the default, then to the range start. */
export function pickerValue(param, raw) {
  if (param.control === 'time')
    return parseTime(raw) ?? parseTime(param.default) ?? { h: 0, m: 0 };
  return parseDate(raw) ?? parseDate(param.default) ?? parseDate(param.min) ?? { d: 1, m: 1, y: 2027 };
}

/** Step one field; wrapping fields roll over, the year stops at its range. */
export function stepField(param, value, key, dir) {
  const f = fieldsFor(param).find((x) => x.key === key);
  const next = value[key] + dir;
  return { ...value, [key]: f.wrap ? wrap(next, f.min, f.max) : Math.min(f.max, Math.max(f.min, next)) };
}

/** null when the value can be set, else the explanation. */
export function pickerError(param, value) {
  if (param.control === 'time') return null;
  const r = validateDate(param, value);
  if (r.ok) return null;
  if (r.error === 'day') return t('picker.noSuchDay', { date: `${pad(value.d)}.${pad(value.m)}.` });
  return t('picker.outOfRange', { min: param.min, max: param.max });
}

export function renderDateTimePicker(param, value, { error = null } = {}) {
  const fields = fieldsFor(param);
  const sep = param.control === 'time' ? ':' : '.';
  const kind = param.control === 'time' ? 'time' : 'date';
  const state = error ? 'error' : 'default';
  const col = (f) => {
    const v = value[f.key];
    const atMin = !f.wrap && v <= f.min;
    const atMax = !f.wrap && v >= f.max;
    const text = f.digits === 4 ? String(v) : pad(v);
    return `
      <div class="flex flex-col items-center gap-1 ${f.digits === 4 ? 'w-[120px]' : 'w-[84px]'}" data-field="${f.key}">
        <span class="t-caption text-muted">${esc(t(f.label))}</span>
        <button type="button" class="pressable h-touch land:h-[60px] w-full grid place-items-center rounded-md bg-surface-2 text-chrome" data-action="step" data-key="${f.key}" data-dir="1" ${atMax ? 'aria-disabled="true"' : ''} aria-label="${esc(t(f.label))} +1">${icon('chevron', { size: 30, stroke: 3, class: '-rotate-90' })}</button>
        <span class="t-param text-hero font-semibold leading-none py-2 ${cx(error && f.key !== 'y' && kind === 'date' && 'text-status-error-ink')}" data-value="${f.key}">${esc(text)}</span>
        <button type="button" class="pressable h-touch land:h-[60px] w-full grid place-items-center rounded-md bg-surface-2 text-chrome" data-action="step" data-key="${f.key}" data-dir="-1" ${atMin ? 'aria-disabled="true"' : ''} aria-label="${esc(t(f.label))} -1">${icon('chevron', { size: 30, stroke: 3, class: 'rotate-90' })}</button>
      </div>`;
  };
  // separators sit on the value line (label + gap + stepper + gap + value padding above it);
  // padding, not align-self or a margin, so the Figma auto layout keeps the position
  const cols = fields
    .map(col)
    .join(`<span class="t-param text-hero text-faint leading-none pt-[118px] land:pt-[90px] pb-2" aria-hidden="true">${sep}</span>`);
  const hint = [
    kind === 'time' ? t('picker.clock24') : `${param.min} – ${param.max}`,
    `${t('common.default')} ${kind === 'time' ? String(param.default).slice(0, 5) : param.default}`,
  ].join(' · ');
  return `
    <div class="flex flex-col gap-2" data-picker="${kind}" data-state="${state}" data-cmp="DateTimePicker" data-cmp-props="Kind=${kind},State=${state}">
      <div class="flex items-start justify-center gap-2">${cols}</div>
      <div class="flex flex-col items-center gap-1 min-h-11">
        <span class="t-caption text-muted text-center">${esc(hint)}</span>
        <span class="text-label text-status-error-ink font-semibold text-center" data-error aria-live="polite">${esc(error ?? '')}</span>
      </div>
    </div>`;
}

/** Open the sheet; resolves with the stored string or undefined. */
export function openDateTimePicker(ctx, param, { onConfirm, now = () => new Date() } = {}) {
  let value = pickerValue(param, ctx.store.getParam(param.id));
  const footer = `<div class="grid grid-cols-2 gap-3 mt-3" data-picker-actions>
      ${renderButton({ label: t('picker.now'), action: 'now', icon: 'history' })}
      ${renderButton({ label: t('picker.set'), action: 'set', tone: 'primary', icon: 'check', iconStroke: 3 })}
    </div>`;
  return ctx.sheet.open({
    title: t(param.labelKey),
    wide: true,
    // steppers on top, Now / Set at the bottom in both orientations (DT-36)
    body: `<div><div data-picker-host>${renderDateTimePicker(param, value, { error: pickerError(param, value) })}</div>${footer}</div>`,
    mount(body, close) {
      const host = body.querySelector('[data-picker-host]');
      const setBtn = body.querySelector('[data-action="set"]');
      const show = () => {
        const error = pickerError(param, value);
        host.innerHTML = renderDateTimePicker(param, value, { error });
        if (error) setBtn.setAttribute('aria-disabled', 'true');
        else setBtn.removeAttribute('aria-disabled');
      };
      show();
      return onAction(body, {
        step: (btn) => {
          value = stepField(param, value, btn.dataset.key, Number(btn.dataset.dir));
          show();
        },
        now: () => {
          const d = now();
          value =
            param.control === 'time'
              ? { h: d.getHours(), m: d.getMinutes() }
              : { d: d.getDate(), m: d.getMonth() + 1, y: d.getFullYear() };
          show();
        },
        set: () => {
          if (pickerError(param, value)) return;
          const out = param.control === 'time' ? formatTime(value) : validateDate(param, value).value;
          onConfirm?.(out);
          close(out);
        },
      });
    },
  });
}
