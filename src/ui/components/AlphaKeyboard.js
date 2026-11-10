/**
 * Text editor (docx §5.4 / §7.2 "Alphabetical Keyboard", plan P2-08): the field stays visible
 * above the keyboard inside the sheet (portrait: bottom sheet, landscape: side panel), layouts
 * lower · upper · symbols with umlauts. IP addresses use the same editor with the symbols layout
 * and a dotted-quad check.
 */
import { mountKeyboard } from './Keyboard.js';
import { validateIp, validateText } from '../../core/validate.js';
import { t } from '../../core/i18n.js';
import { esc } from '../html.js';

/** `wrap`: a long value breaks onto a second line instead of being cut (file names, P3-11). */
export function renderTextField({ value = '', placeholder = '', error = null, max = null, wrap = false }) {
  return `
    <div class="text-field flex flex-col gap-1" data-text-field data-cmp="Input" data-cmp-props="Kind=text,State=${error ? 'error' : value === '' ? 'empty' : 'filled'}">
      <div class="card-border card-border--strong"><div class="flex items-center gap-2 px-4 ${wrap ? 'min-h-16 py-[14px]' : 'h-16'}">
        <span class="flex-1 t-param text-body-sm leading-[35px] ${wrap ? '[overflow-wrap:anywhere]' : 'truncate'} ${value === '' ? 'text-faint/60' : 'text-text'}" data-entry>${esc(value === '' ? placeholder : value)}</span>
        ${max ? `<span class="t-caption text-faint/60 shrink-0" data-count>${value.length}/${max}</span>` : ''}
      </div></div>
      <div class="text-label text-status-error-ink font-semibold min-h-5 px-1" data-error aria-live="polite">${esc(error ?? '')}</div>
    </div>`;
}

/** Open the sheet; resolves with the confirmed string or undefined. */
export function openAlphaKeyboard(ctx, param, { onConfirm } = {}) {
  const isIp = param.control === 'ip';
  const max = isIp ? 15 : (param.max ?? 32);
  const current = String(ctx.store.getParam(param.id) ?? '');
  let value = current;
  return ctx.sheet.open({
    title: t(param.labelKey),
    wide: true,
    body: `${renderTextField({ value, max })}<div class="mt-2" data-keys></div>`,
    mount(body, close) {
      const field = body.querySelector('[data-entry]');
      const count = body.querySelector('[data-count]');
      const err = body.querySelector('[data-error]');
      const show = (error = null) => {
        field.textContent = value;
        if (count) count.textContent = `${value.length}/${max}`;
        err.textContent = error
          ? error === 'ip'
            ? t('edit.invalidIp')
            : error === 'max'
              ? t('edit.tooLong', { n: max })
              : t('edit.empty')
          : '';
      };
      const kb = mountKeyboard(body.querySelector('[data-keys]'), {
        layout: isIp ? 'symbols' : 'lower',
        enterIcon: 'check',
        onInput: (k) => {
          if (value.length >= max) return show('max');
          if (isIp && !/[\d.]/.test(k)) return show('ip'); // explained, not silently dropped (§7.3)
          value += k;
          show();
        },
        onBackspace: () => {
          value = value.slice(0, -1);
          show();
        },
        onEnter: () => {
          const r = isIp ? validateIp(value) : validateText(param, value);
          if (!r.ok) return show(r.error);
          onConfirm?.(r.value);
          close(r.value);
        },
      });
      return kb.dispose;
    },
  });
}
