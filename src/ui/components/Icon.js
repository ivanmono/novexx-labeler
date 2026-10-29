/**
 * Icon from the sprite (src/assets/icons/sprite.svg, built by scripts/build-sprite.mjs).
 * Single colour, inherits `currentColor`; size via font-size or an explicit class.
 *
 *   icon('settings')                      → <svg class="icon"> 1em
 *   icon('settings', { size: 48, class: 'text-brand' })
 */
import spriteUrl from '../../assets/icons/sprite.svg?url';
import iconIndex from '../../assets/icons/index.json';

const KNOWN = new Set(iconIndex.names);
let injected = false;

/** Inline the sprite once so <use href="#icon-x"> works offline and in any base path. */
export async function injectSprite() {
  if (injected) return;
  injected = true;
  const res = await fetch(spriteUrl);
  const svg = await res.text();
  const holder = document.createElement('div');
  holder.setAttribute('data-sprite', '');
  holder.innerHTML = svg;
  document.body.prepend(holder);
}

export function iconExists(name) {
  return KNOWN.has(name);
}

/**
 * @param {string} name
 * @param {{ size?: number | string, class?: string, label?: string }} [opts]
 * @returns {string} HTML
 */
export function icon(name, opts = {}) {
  const safe = KNOWN.has(name) ? name : 'tbd';
  const size = opts.size != null ? `width:${toPx(opts.size)};height:${toPx(opts.size)}` : '';
  const aria = opts.label ? `role="img" aria-label="${escape(opts.label)}"` : 'aria-hidden="true"';
  return `<svg class="icon ${opts.class ?? ''}" ${aria} style="${size}" data-icon="${safe}"><use href="#icon-${safe}"></use></svg>`;
}

function toPx(v) {
  return typeof v === 'number' ? `${v}px` : v;
}
function escape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
