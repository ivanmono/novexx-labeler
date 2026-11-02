/**
 * Input validation for the editors (docx §7.3: an invalid entry is explained, never corrected
 * silently). Pure functions; the editors turn the `error` code into a text.
 */

/**
 * Validate a raw numeric entry against a parameter's type and range.
 * @returns {{ ok: boolean, value?: number, error?: 'empty'|'nan'|'integer'|'min'|'max' }}
 */
export function validateNumber(param, raw) {
  const s = String(raw ?? '').trim();
  if (s === '' || s === '-' || s === '.') return { ok: false, error: 'empty' };
  const n = Number(s);
  if (!Number.isFinite(n)) return { ok: false, error: 'nan' };
  if (param.type !== 'Float' && !Number.isInteger(n)) return { ok: false, error: 'integer' };
  if (param.min != null && n < param.min) return { ok: false, error: 'min' };
  if (param.max != null && n > param.max) return { ok: false, error: 'max' };
  return { ok: true, value: n };
}

/** Clamp a value into the parameter range and onto its step (sliders, steppers). */
export function snapToRange(param, value, step = 1) {
  const min = param.min ?? -Infinity;
  const max = param.max ?? Infinity;
  const v = Math.min(max, Math.max(min, value));
  const base = Number.isFinite(min) ? min : 0;
  const snapped = base + Math.round((v - base) / step) * step;
  const decimals = String(step).includes('.') ? String(step).split('.')[1].length : 0;
  return Number(Math.min(max, Math.max(min, snapped)).toFixed(decimals));
}

/** Slider step: the parameter's own step, else 0.5 for floats and 1 for integers. */
export function stepFor(param) {
  if (param.step != null) return param.step;
  return param.type === 'Float' ? 0.5 : 1;
}

/** IPv4 dotted quad. */
export function validateIp(raw) {
  const s = String(raw ?? '').trim();
  const parts = s.split('.');
  if (parts.length !== 4 || parts.some((p) => !/^\d{1,3}$/.test(p) || Number(p) > 255))
    return { ok: false, error: 'ip' };
  return { ok: true, value: parts.map((p) => String(Number(p))).join('.') };
}

/** Free text: trimmed, at most `max` characters (32 when the parameter has no limit). */
export function validateText(param, raw) {
  const s = String(raw ?? '').trim();
  const max = param.max ?? 32;
  if (s.length === 0) return { ok: false, error: 'empty' };
  if (s.length > max) return { ok: false, error: 'max' };
  return { ok: true, value: s };
}

/** "16:20:00" or "16:20" → { h, m }; null when it does not parse. */
export function parseTime(raw) {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(raw ?? '').trim());
  return m ? { h: Number(m[1]), m: Number(m[2]) } : null;
}

/** Info_Time is stored with seconds; the picker edits hours and minutes only. */
export function formatTime({ h, m }) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

/** "01.01.2027" or "1.1.2027" → { d, m, y }; null when it does not parse. */
export function parseDate(raw) {
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(String(raw ?? '').trim());
  return m ? { d: Number(m[1]), m: Number(m[2]), y: Number(m[3]) } : null;
}

export function formatDate({ d, m, y }) {
  return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
}

export function daysInMonth(m, y) {
  return new Date(y, m, 0).getDate();
}

/**
 * Date against the calendar and the parameter range (Info_Date 701: 1.1.2027 – 31.12.2099).
 * @returns {{ ok: boolean, value?: string, error?: 'day'|'min'|'max' }}
 */
export function validateDate(param, { d, m, y }) {
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(m, y)) return { ok: false, error: 'day' };
  const key = (x) => x.y * 10000 + x.m * 100 + x.d;
  const min = parseDate(param.min);
  const max = parseDate(param.max);
  if (min && key({ d, m, y }) < key(min)) return { ok: false, error: 'min' };
  if (max && key({ d, m, y }) > key(max)) return { ok: false, error: 'max' };
  return { ok: true, value: formatDate({ d, m, y }) };
}
