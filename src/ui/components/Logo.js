/**
 * Logo area (docx §5.3): a defined area with a maximum size, filled by the configured logo
 * (HMI_Logo_Selection 608: NOVEXX, ETIPACK, custom). NOVEXX is the real logo (white PNG from the
 * Figma file "Novexx Presentations", node 0:155, DT-18; darkened in the light theme by CSS);
 * ETIPACK and custom are still dummy SVG wordmarks.
 */
import { esc } from '../html.js';
import novexxLogo from '../../assets/logos/novexx.png';

const MARKS = {
  609: { name: 'NOVEXX', color: 'var(--hmi-brand)', src: novexxLogo, ratio: 300 / 107 },
  610: { name: 'ETIPACK', color: 'var(--hmi-level-1)' },
  611: { name: 'CUSTOM', color: 'var(--hmi-text-muted)' },
};

export function renderLogo(ctx, { size = 120, variant = 'mark' } = {}) {
  const sel = Number(ctx.store.getParam(608) ?? 609);
  const mark = MARKS[sel] ?? MARKS[609];
  const h = Math.round(size * 0.35);
  if (mark.src) {
    // image logos keep their own aspect ratio inside the size box
    return `<div class="logo inline-flex items-center justify-center" style="max-width:${size}px" aria-label="${esc(mark.name)}">
      <img class="logo__img block w-full h-auto" src="${mark.src}" width="${size}" height="${Math.round(size / mark.ratio)}" alt="${esc(mark.name)}" draggable="false"></div>`;
  }
  if (variant === 'word') {
    return `<div class="logo logo--word inline-flex items-center justify-center" style="max-width:${size}px;height:${h}px" aria-label="${esc(mark.name)}">
      <span class="font-bold tracking-[0.2em]" style="color:${mark.color};font-size:${Math.round(h * 0.6)}px">${esc(mark.name)}</span></div>`;
  }
  return `<div class="logo grid place-items-center" style="width:${size}px;height:${size}px" aria-label="${esc(mark.name)}">
    <svg viewBox="0 0 160 160" width="${size}" height="${size}" fill="none" aria-hidden="true">
      <circle cx="80" cy="80" r="72" stroke="${mark.color}" stroke-width="4" opacity="0.5"/>
      <circle cx="80" cy="80" r="56" stroke="${mark.color}" stroke-width="2" opacity="0.3"/>
      <text x="80" y="90" text-anchor="middle" font-family="Figtree, sans-serif" font-weight="700" font-size="26" letter-spacing="3" fill="${mark.color}">${esc(mark.name)}</text>
    </svg></div>`;
}
