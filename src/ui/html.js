/** Tiny HTML helpers shared by all UI modules. */

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/** Join class names, dropping falsy entries. */
export function cx(...parts) {
  return parts.flat().filter(Boolean).join(' ');
}

/** Parse an HTML string into a single element. */
export function el(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  return tpl.content.firstElementChild;
}

/** Delegate click handling by `data-action` inside a root. Returns a disposer. */
export function onAction(root, handlers) {
  const fn = (e) => {
    const target = e.target.closest('[data-action]');
    if (!target || !root.contains(target)) return;
    if (target.matches('[aria-disabled="true"], :disabled')) return;
    const h = handlers[target.dataset.action];
    if (h) {
      e.preventDefault();
      h(target, e);
    }
  };
  root.addEventListener('click', fn);
  return () => root.removeEventListener('click', fn);
}

/** Format minutes-since-midnight or a Date as hh:mm. */
export function hhmm(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
