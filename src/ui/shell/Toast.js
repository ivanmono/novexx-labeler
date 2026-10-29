/**
 * Toast (docx §5.4): short feedback, kinds `ok` (confirmation) and `reject` (rejection).
 * Lives inside the main area above the nav bar, 2.2 s, never stacks more than one.
 */
import { icon } from '../components/Icon.js';
import { esc, el } from '../html.js';

export function renderToast({ text, kind = 'ok' }) {
  const reject = kind === 'reject';
  return `
  <div class="toast pointer-events-none absolute inset-x-4 bottom-4 z-30 flex justify-center" role="status" aria-live="assertive" data-kind="${kind}">
    <div class="toast__box flex items-center gap-2 px-4 py-3 rounded-md shadow-card text-body-sm font-semibold ${reject ? 'bg-status-error text-white' : 'bg-brand text-on-brand'}">
      ${icon(reject ? 'alarm' : 'activate', { size: 24 })}<span>${esc(text)}</span>
    </div>
  </div>`;
}

export function createToaster(host, { duration = 2200 } = {}) {
  let node = null;
  let timer = null;
  return {
    show(text, kind = 'ok') {
      this.hide();
      node = el(renderToast({ text, kind }));
      host.append(node);
      timer = setTimeout(() => this.hide(), duration);
    },
    ok(text) {
      this.show(text, 'ok');
    },
    reject(text) {
      this.show(text, 'reject');
    },
    hide() {
      clearTimeout(timer);
      node?.remove();
      node = null;
    },
  };
}
