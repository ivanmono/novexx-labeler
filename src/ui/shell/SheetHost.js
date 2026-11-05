/**
 * Sheet host: the surface for editors (selection list, keypad, keyboard, pickers).
 * Editors open as a page of their own over the screen area (portrait DT-28, landscape DT-33): a title
 * bar with back (closes the editor) and the parameter name; keypads, keyboards and pickers sit at the
 * bottom, lists start at the top. `page: false` keeps the older docked sheet (portrait: slides up
 * below the edited row, docx §7.2; landscape: docks to the inner edge, `wide` takes the whole main
 * area, DT-13); no editor uses it any more.
 */
import { icon } from '../components/Icon.js';
import { t } from '../../core/i18n.js';
import { esc, el, onAction } from '../html.js';

export function renderSheet({
  title,
  body = '',
  closeLabel,
  wide = false,
  page = false,
  branch = '',
}) {
  if (page)
    return `
  <div class="sheet sheet--page absolute inset-0 z-30 flex flex-col" data-sheet data-page>
    <header class="title-bar h-title shrink-0 flex items-center gap-2 px-3 border-b border-line-soft"${branch ? ` style="box-shadow:inset 6px 0 0 var(--hmi-branch-${esc(branch)})"` : ''}>
      <button type="button" class="pressable h-title w-touch -ml-3 grid place-items-center rounded-md text-chrome" data-action="close" aria-label="${esc(closeLabel ?? t('nav.back'))}">${icon('back', { size: 32 })}</button>
      <h2 class="title-bar__title text-title font-bold truncate leading-tight min-w-0 flex-1">${esc(title ?? '')}</h2>
    </header>
    <section class="sheet__panel flex-1 min-h-0" role="dialog" aria-modal="true" aria-label="${esc(title ?? '')}" data-cmp="Sheet" data-cmp-props="State=page"${wide ? ' data-wide' : ''}>
      <div class="sheet__body flex-1 min-h-0 scroll-y p-4 pb-7 land:pb-4 flex flex-col" data-sheet-body data-cmp-slot="body">
        <div class="${wide ? 'mt-auto' : ''}">${body}</div>
      </div>
    </section>
  </div>`;
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
    const page = opts.page ?? true;
    const branch = host.querySelector('.title-bar')?.dataset.branch ?? '';
    node = el(renderSheet({ ...opts, page, branch }));
    if (opts.maxHeight && !page)
      node.querySelector('.sheet__panel').style.maxHeight = opts.maxHeight;
    host.append(node);
    dispose = onAction(node, { close: () => close(undefined) });
    opts.mount?.(node.querySelector('[data-sheet-body]'), close);
    return new Promise((res) => (onClose = res));
  }
  return {
    open,
    close,
    get isOpen() {
      return !!node;
    },
    get el() {
      return node;
    },
  };
}
