/** Value formatting shared by rows, quick links, search results and sheets. */
import { t, fmtNumber } from '../core/i18n.js';

/** Human label of a parameter (TextResID key or generated key). */
export function paramLabel(ctx, param) {
  return t(param.labelKey);
}

/** Display value for a parameter's current value, with option label or unit. */
export function formatParamValue(ctx, param, value = ctx.store.getParam(param.id)) {
  if (value == null || value === '') return '—';
  if (param.unit === 'ParamID') {
    const target = ctx.param(value);
    return target ? paramLabel(ctx, target) : String(value);
  }
  switch (param.control) {
    case 'toggle':
      return t(value ? 'common.on' : 'common.off');
    case 'select': {
      const opt = ctx.option(value);
      return opt ? t(opt.labelKey) : String(value);
    }
    case 'number':
    case 'slider': {
      const decimals = param.type === 'Float' ? (Number.isInteger(Number(value)) ? 0 : 1) : 0;
      return `${fmtNumber(value, decimals)}${param.unit ? ` ${param.unit}` : ''}`;
    }
    case 'display':
    case 'state': {
      if (typeof value === 'number')
        return `${fmtNumber(value, Number.isInteger(value) ? 0 : 1)}${param.unit ? ` ${param.unit}` : ''}`;
      if (typeof value === 'boolean') return t(value ? 'common.yes' : 'common.no');
      return String(value);
    }
    default:
      return String(value);
  }
}

/** Short relative time for log rows. */
export function relTime(ts, now = Date.now()) {
  const min = Math.round((now - ts) / 60_000);
  if (min < 1) return t('time.justNow');
  if (min < 60) return t('time.minAgo', { n: min });
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}
