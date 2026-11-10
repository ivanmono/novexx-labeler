/**
 * Numeric editor (docx §5.4 / §7.2 "Number Keyboard", §7.3, plan P2-07): the entry with its unit,
 * the range and the default visible while typing, an inline message for an out-of-range value
 * (never corrected silently), one confirm. Integer parameters get no decimal point key.
 */
import { renderNumpad, mountNumpad } from './Keyboard.js';
import { validateNumber } from '../../core/validate.js';
import { t, fmtNumber } from '../../core/i18n.js';
import { esc } from '../html.js';

const fmt = (v, param) =>
  v == null ? '' : fmtNumber(v, param.type === 'Float' && !Number.isInteger(v) ? 1 : 0);

export function renderNumericField(param, { entry = '', current, error = null } = {}) {
  const unit = param.unit ? `<span class="text-body text-muted">${esc(param.unit)}</span>` : '';
  const hint = [
    param.min != null ? `${t('common.min')} ${fmt(param.min, param)}` : null,
    param.max != null ? `${t('common.max')} ${fmt(param.max, param)}` : null,
    param.default != null ? `${t('common.default')} ${fmt(param.default, param)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return `
    <div class="numeric-field flex flex-col gap-3" data-numeric-field data-cmp="Input" data-cmp-props="Kind=number,State=${error ? 'error' : entry === '' ? 'empty' : 'filled'}">
      <div class="card-border card-border--strong"><div class="flex items-center gap-2 pl-4 pr-4 h-16">
        <span class="flex-1 t-param text-title truncate ${entry === '' ? 'text-faint' : 'text-text'}" data-entry>${esc(entry === '' ? fmt(current, param) : entry)}</span>
        ${unit}
      </div></div>
      <div class="flex flex-col gap-1 px-1 min-h-10">
        <span class="t-caption text-muted truncate">${esc(hint)}</span>
        <span class="text-label text-status-error-ink font-semibold" data-error aria-live="polite">${esc(error ?? '')}</span>
      </div>
    </div>`;
}

/** Message for a validation error code. */
export function numericErrorText(param, error) {
  switch (error) {
    case 'min':
    case 'max':
      return t('edit.outOfRange', {
        min: fmt(param.min, param),
        max: fmt(param.max, param),
        unit: param.unit ?? '',
      }).trim();
    case 'integer':
      return t('edit.integerOnly');
    case 'empty':
    case 'nan':
      return t('edit.empty');
    default:
      return '';
  }
}

/** Open the sheet; resolves with the confirmed number or undefined. */
export function openNumericKeypad(ctx, param, { onConfirm } = {}) {
  const current = ctx.store.getParam(param.id);
  let entry = '';
  return ctx.sheet.open({
    title: t(param.labelKey),
    wide: true,
    // field on top, keypad at the bottom in both orientations (DT-35)
    body: `<div>${renderNumericField(param, { current })}<div class="mt-2" data-keys>${renderNumpad({
      allowDecimal: param.type === 'Float',
      allowSign: param.min != null && param.min < 0,
      showMinMax: param.min != null && param.max != null,
      enterIcon: 'activate',
    })}</div></div>`,
    mount(body, close) {
      const field = body.querySelector('[data-entry]');
      const err = body.querySelector('[data-error]');
      const show = (error = null) => {
        field.textContent = entry === '' ? fmt(current, param) : entry;
        field.classList.toggle('text-faint', entry === '');
        field.classList.toggle('text-text', entry !== '');
        err.textContent = error ? numericErrorText(param, error) : '';
      };
      return mountNumpad(body.querySelector('[data-keys]'), {
        onInput: (k) => {
          if (k === '.' && (entry.includes('.') || param.type !== 'Float')) return;
          if (k === '-') {
            entry = entry.startsWith('-') ? entry.slice(1) : `-${entry}`;
            return show();
          }
          if (entry.replace('-', '').length >= 9) return;
          entry += k;
          show();
        },
        onBackspace: () => {
          entry = entry.slice(0, -1);
          show();
        },
        onClear: () => {
          entry = '';
          show();
        },
        onMin: () => {
          entry = String(param.min);
          show();
        },
        onMax: () => {
          entry = String(param.max);
          show();
        },
        onEnter: () => {
          if (entry === '') return close(undefined); // nothing typed: keep the value
          const r = validateNumber(param, entry);
          if (!r.ok) return show(r.error);
          onConfirm?.(r.value);
          close(r.value);
        },
      });
    },
  });
}
