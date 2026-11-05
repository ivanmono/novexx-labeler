/**
 * Sheet: the surface for editors (selection list, keypad, keyboard, pickers).
 * Portrait: slides up from the bottom of the main area and must not cover the field being
 * edited (docx §7.2) — callers pass `anchor` so the sheet height stays below it.
 * Landscape: docks to the inner edge next to the nav bar; `wide` sheets (keypad, keyboard) take the
 * whole main area so their keys reach touch size (DT-13).
 */
import { icon } from '../components/Icon.js';
import { t } from '../../core/i18n.js';
import { esc, el, onAction } from '../html.js';

export function renderSheet({ title, body = '', closeLabel, wide = false }) {
  return `
  <div class="sheet absolute inset-0 z-30 flex flex-col justify-end" data-sheet>
    <div class="sheet__backdrop absolute inset-0 bg-overlay" data-action="close" aria-hidden="true"></div>
    <section class="sheet__panel relative card-border card-border--strong rounded-b-none" ${wide ? 'data-wide ' : ''}role="dialog" aria-modal="true" aria-label="${esc(title ?? '')}" data-cmp="Sheet" data-cmp-props="State=default">
      <div class="flex flex-col min-h-0 w-full rounded-b-none!">
        <div class="flex items-center gap-2 px-4 pt-2">
          <span class="sheet__grip mx-auto absolute left-1/2 -translate-x-1/2 top-1.5 w-10 h-1 rounded-pill bg-line" aria-hidden="true"></span>
          <h2 class="text-body-lg font-semibold truncate flex-1 min-w-0">${esc(title ?? '')}</h2>
          <button type="button" class="pressable size-touch-row grid place-items-center rounded-md text-chrome -mr-2" data-action="close" aria-label="${esc(closeLabel ?? t('action.close'))}">${icon('plus', { size: 28, class: 'rotate-45' })}</button>
        </div>
        <div class="sheet__body px-4 pb-4 min-h-0 scroll-y" data-sheet-body data-cmp-slot="body">${body}</div>
      </div>
    </section>
  </div>`;
}

export function createSheetHost(host) {
  let node = null;
  let dispose = null;
  let onClose = null;

  function close(result) {
    dispose?.();
    node?.remove();
    node = null;
    const cb = onClose;
    onClose = null;
    cb?.(result);
  }
  /**
   * @param {{title:string, body?:string, wide?:boolean, mount?:(bodyEl:HTMLElement, close:(r?:any)=>void)=>void, maxHeight?:string}} opts
   */
  function open(opts) {
    close(undefined);
    node = el(renderSheet(opts));
    if (opts.maxHeight) node.querySelector('.sheet__panel').style.maxHeight = opts.maxHeight;
    host.append(node);
    dispose = onAction(node, { close: () => close(undefined) });
    opts.mount?.(node.querySelector('[data-sheet-body]'), close);
    return new Promise((res) => (onClose = res));
  }
  return { open, close, get isOpen() { return !!node; }, get el() { return node; } };
}
