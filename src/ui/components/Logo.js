/**
 * Logo area (docx §5.3): a defined area with a maximum size, filled by the configured logo
 * (HMI_Logo_Selection 608: NOVEXX, ETIPACK, custom). Dummy marks are inline SVG wordmarks.
 */
import { esc } from '../html.js';

const MARKS = {
  609: { name: 'NOVEXX', color: 'var(--hmi-brand)' },
  610: { name: 'ETIPACK', color: 'var(--hmi-level-1)' },
  611: { name: 'CUSTOM', color: 'var(--hmi-text-muted)' },
};

export function renderLogo(ctx, { size = 120, variant = 'mark' } = {}) {
  const sel = Number(ctx.store.getParam(608) ?? 609);
  const mark = MARKS[sel] ?? MARKS[609];
  const h = Math.round(size * 0.35);
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
