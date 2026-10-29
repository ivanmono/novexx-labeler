/**
 * Device shell: status bar · main (title bar + screen) · nav bar, laid out by the
 * [data-orientation] grid in components.css. Screens render into the main area through
 * `setScreen()`; hosts for toast, modal and sheet are attached to the shell.
 */
import { mountStatusBar } from './StatusBar.js';
import { mountNavBar } from './NavBar.js';
import { renderTitleBar } from './TitleBar.js';
import { createToaster } from './Toast.js';
import { createModalHost } from './ModalHost.js';
import { createSheetHost } from './SheetHost.js';
import { mountStandby } from './Standby.js';
import { onAction } from '../html.js';

export function mountAppShell(root, ctx) {
  root.className = 'hmi';
  root.innerHTML = `
    <div class="hmi__status"></div>
    <main class="hmi__main relative" data-main>
      <div class="hmi__title" data-title></div>
      <div class="hmi__screen flex-1 min-h-0 relative flex flex-col" data-screen></div>
    </main>
    <div class="hmi__nav"></div>`;

  const main = root.querySelector('[data-main]');
  const titleHost = root.querySelector('[data-title]');
  const screenHost = root.querySelector('[data-screen]');

  const status = mountStatusBar(root.querySelector('.hmi__status'), ctx);
  const nav = mountNavBar(root.querySelector('.hmi__nav'), ctx);
  const toast = createToaster(main);
  const modal = createModalHost(root);
  const sheet = createSheetHost(main);
  const unmountStandby = mountStandby(root, ctx);

  let currentUnmount = null;
  let disposeTitle = null;

  /**
   * @param {{title?:string|null, back?:boolean, branch?:string|null, subtitle?:string|null, right?:string,
   *          html?:string, mount?:(el:HTMLElement)=>void|(()=>void), bars?:boolean}} opts
   *  title null → no title bar (home); bars false → status and nav bars hidden (start-up).
   */
  function setScreen({ title = null, back = true, branch = null, subtitle = null, right = '', html = '', mount = null, bars = true } = {}) {
    currentUnmount?.();
    disposeTitle?.();
    root.dataset.bars = bars ? 'on' : 'off';
    titleHost.innerHTML = title != null ? renderTitleBar({ title, back, branch, subtitle, right }) : '';
    disposeTitle = onAction(titleHost, { back: () => ctx.back() });
    screenHost.innerHTML = html;
    screenHost.scrollTop = 0;
    const r = mount?.(screenHost);
    currentUnmount = typeof r === 'function' ? r : null;
  }

  return {
    root,
    main,
    screenHost,
    status,
    nav,
    toast,
    modal,
    sheet,
    setScreen,
    unmount() {
      currentUnmount?.();
      status.unmount();
      nav.unmount();
      unmountStandby();
    },
  };
}
