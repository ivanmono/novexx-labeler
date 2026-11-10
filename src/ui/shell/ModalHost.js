/**
 * Modal dialogs (docx §5.4 / §5.5): info, error, confirmation (normal or destructive), and
 * the parameter help pop-up. Overlay covers the whole device shell so it rotates with it.
 * Promise-based: `await ctx.modal.confirm({...})` resolves true/false.
 */
import { icon } from '../components/Icon.js';
import { t } from '../../core/i18n.js';
import { esc, el, onAction, cx } from '../html.js';

export function renderModal({ kind = 'info', title, body = '', destructive = false, okLabel, cancelLabel, scroll = true, extraClass = '' }) {
  const isConfirm = kind === 'confirm';
  const iconName = kind === 'error' ? 'alarm' : kind === 'help' ? 'help' : kind === 'confirm' ? (destructive ? 'alarm' : 'activate') : 'help';
  const tone = kind === 'error' || destructive ? 'text-status-error-ink' : 'text-brand-hi';
  return `
  <div class="modal absolute inset-0 z-40 grid place-items-center p-4 bg-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title" data-kind="${kind}">
    <div class="card-border card-border--strong w-full max-w-[440px] max-h-full flex ${extraClass}" data-cmp="Modal" data-cmp-props="Kind=${kind},Destructive=${destructive ? 'yes' : 'no'}">
      <div class="flex flex-col min-h-0 w-full">
        <div class="flex items-start gap-3 px-6 pt-7 pb-6">
          <span class="${tone} shrink-0 pt-0.5">${icon(iconName, { size: 32 })}</span>
          <h2 id="modal-title" class="text-title font-bold leading-tight flex-1 min-w-0 line-clamp-2">${esc(title ?? t(kind === 'error' ? 'dialog.errorTitle' : isConfirm ? 'dialog.confirmTitle' : 'dialog.infoTitle'))}</h2>
        </div>
        <div class="modal__body px-6 text-body text-text leading-snug ${scroll ? 'scroll-y' : ''} min-h-0" data-cmp-slot="body">${body}
          ${destructive ? `<p class="mt-4 text-label text-status-error-ink font-semibold">${esc(t('dialog.destructiveHint'))}</p>` : ''}
        </div>
        <div class="flex gap-3 px-6 pt-8 pb-7"> <!-- gap outside the scroll area so it shows when the body scrolls (DT-23); buttons 78 px (DT-49) -->
          ${isConfirm ? `<button type="button" class="pressable flex-1 h-[78px] rounded-md bg-surface-2 text-body font-semibold" data-action="cancel">${esc(cancelLabel ?? t('action.cancel'))}</button>` : ''}
          <button type="button" class="${cx('pressable flex-1 h-[78px] rounded-md text-body font-semibold', destructive ? 'bg-status-error text-white' : 'bg-brand text-on-brand')}" data-action="ok">${esc(okLabel ?? (isConfirm ? t('action.confirm') : t('action.ok')))}</button>
        </div>
      </div>
    </div>
  </div>`;
}

export function createModalHost(host) {
  let node = null;
  let dispose = null;
  let resolver = null;

  function close(result) {
    dispose?.();
    node?.remove();
    node = null;
    resolver?.(result);
    resolver = null;
  }
  function open(opts) {
    close(false);
    node = el(renderModal(opts));
    host.append(node);
    dispose = onAction(node, { ok: () => close(true), cancel: () => close(false) });
    node.addEventListener('click', (e) => { if (e.target === node && opts.kind !== 'confirm') close(false); });
    opts.mount?.(node.querySelector('.modal__body'));
    node.querySelector('[data-action="ok"]')?.focus({ preventScroll: true });
    return new Promise((res) => (resolver = res));
  }
  return {
    info: (o) => open({ kind: 'info', ...o }),
    error: (o) => open({ kind: 'error', ...o }),
    help: (o) => open({ kind: 'help', scroll: true, ...o }),
    confirm: (o) => open({ kind: 'confirm', ...o }),
    close,
    get isOpen() {
      return !!node;
    },
  };
}
