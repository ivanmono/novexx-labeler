/**
 * Styleguide (dev route #/styleguide): every token and, as components land, every
 * component in every state. This is the surface for design review gates.
 * Phase 0 shows the token sheet (G0-1); later tickets append sections.
 */
import { icon } from '../components/Icon.js';
import iconIndex from '../../assets/icons/index.json';

const COLOR_GROUPS = [
  ['Surfaces', ['bg', 'surface', 'surface-2', 'line', 'line-soft', 'overlay']],
  ['Text', ['text', 'muted', 'faint', 'chrome']],
  ['Brand', ['brand', 'brand-hi', 'brand-deep', 'on-brand']],
  ['Machine status', ['status-ready', 'status-run', 'status-pause', 'status-standby', 'status-warning', 'status-error']],
  ['Status ink (text on bg)', ['status-run-ink', 'status-standby-ink', 'status-warning-ink', 'status-error-ink']],
  ['Access levels', ['level-0', 'level-1', 'level-2', 'level-3', 'level-4']],
  ['Menu branches', ['branch-settings', 'branch-production', 'branch-info', 'branch-service', 'branch-help', 'branch-usermgmt']],
  ['Keyboard', ['key', 'key-pressed']],
];

const TYPE = [
  ['text-display', 'Display 48 · 1.1'],
  ['text-hero font-semibold', 'Hero 32 · 600'],
  ['text-title font-bold', 'Title 24 · 700'],
  ['text-body-lg', 'Body large 20'],
  ['text-body', 'Body 18 (base)'],
  ['text-body-sm', 'Body small 16'],
  ['text-label', 'Label 14'],
  ['t-caption', 'Caption 12 · 600 · caps'],
  ['t-param text-title', 'Fira Code 24 · 600  12.5 m/min'],
  ['t-param text-body', 'Fira Code 18 · 600  0.0.0.0'],
];

const RADII = ['xs', 'sm', 'md', 'card'];
const SPACING = [1, 2, 3, 4, 6, 8, 12, 15];

export function renderStyleguide() {
  return `
  <div class="scroll-y h-full p-4 flex flex-col gap-8 text-text">
    <header class="flex items-baseline justify-between">
      <h1 class="text-title font-bold">Styleguide · tokens</h1>
      <span class="text-label text-muted">theme <b data-sg-theme></b> · <b data-sg-orientation></b></span>
    </header>

    ${COLOR_GROUPS.map(
      ([title, names]) => `
      <section>
        <h2 class="t-caption text-muted mb-2">${title}</h2>
        <div class="grid grid-cols-3 gap-2">
          ${names
            .map(
              (n) => `
            <div class="card-border"><div class="p-2 flex flex-col gap-1">
              <div class="h-10 rounded-xs bg-${n} border border-line-soft"></div>
              <div class="text-label leading-tight">${n}</div>
              <div class="text-caption text-muted font-mono" data-sg-color="${n}"></div>
            </div></div>`,
            )
            .join('')}
        </div>
      </section>`,
    ).join('')}

    <section>
      <h2 class="t-caption text-muted mb-2">Type scale (Figtree / Fira Code, self-hosted)</h2>
      <div class="card-border"><div class="p-4 flex flex-col gap-3">
        ${TYPE.map(([cls, label]) => `<div class="${cls} truncate">${label} — Etikettierer Übersicht</div>`).join('')}
      </div></div>
    </section>

    <section>
      <h2 class="t-caption text-muted mb-2">Surfaces, radii, shadows</h2>
      <div class="grid grid-cols-2 gap-3">
        <div class="card-border"><div class="p-4 text-body-sm">card-border<br><span class="text-muted">gradient stroke 1 px, r 24/23</span></div></div>
        <div class="card-border card-border--strong card-border--surface"><div class="p-4 text-body-sm">strong + surface gradient</div></div>
        <div class="bg-surface rounded-card shadow-card p-4 text-body-sm">shadow-card</div>
        <div class="bg-surface rounded-card shadow-glow-brand p-4 text-body-sm">glow-brand</div>
        <div class="bg-surface rounded-card shadow-glow-error p-4 text-body-sm">glow-error</div>
        <div class="bg-surface-2 rounded-card p-4 text-body-sm">surface-2</div>
      </div>
      <div class="flex gap-3 mt-3 items-end">
        ${RADII.map((r) => `<div class="bg-surface-2 border border-line rounded-${r} size-14 grid place-items-center text-label">${r}</div>`).join('')}
      </div>
    </section>

    <section>
      <h2 class="t-caption text-muted mb-2">Spacing (4 px base)</h2>
      <div class="flex gap-2 items-end">
        ${SPACING.map((s) => `<div class="flex flex-col items-center gap-1"><div class="bg-brand w-${s} h-${s}"></div><span class="text-caption text-muted">${s * 4}</span></div>`).join('')}
      </div>
      <div class="flex gap-3 mt-3">
        <div class="bg-surface-2 rounded-sm h-touch px-4 grid place-items-center text-label">touch 60</div>
        <div class="bg-surface-2 rounded-sm h-touch-row px-4 grid place-items-center text-label">row 48</div>
      </div>
    </section>

    <section>
      <h2 class="t-caption text-muted mb-2">Status separators (gradient lines)</h2>
      <div class="flex flex-col gap-3">
        ${['run', 'standby', 'warning', 'error'].map((s) => `<div class="h-[3px] rounded-pill" style="background:var(--hmi-gradient-${s})"></div>`).join('')}
      </div>
    </section>

    <section>
      <h2 class="t-caption text-muted mb-2">Icons v1 · ${iconIndex.count} from Figma · 48 / 32 / 24 px</h2>
      <div class="card-border"><div class="p-3 grid grid-cols-6 gap-2">
        ${iconIndex.names
          .map(
            (n) => `<div class="flex flex-col items-center gap-1 py-1" title="${n}">
              ${icon(n, { size: 32 })}
              <span class="text-[9px] text-muted truncate w-full text-center">${n}</span></div>`,
          )
          .join('')}
      </div></div>
      <div class="flex gap-4 mt-3 items-center">
        ${icon('machine', { size: 48, class: 'text-brand' })}
        ${icon('machine', { size: 32, class: 'text-status-warning' })}
        ${icon('machine', { size: 24, class: 'text-muted' })}
        ${icon('alarm', { size: 48, class: 'text-status-error' })}
        ${icon('lock', { size: 32, class: 'text-level-3' })}
        <span class="text-label text-muted">currentColor binding</span>
      </div>
    </section>
  </div>`;
}

/** Fill in computed colour values after mount (so the sheet shows the resolved hex). */
export function hydrateStyleguide(root) {
  const probe = document.createElement('div');
  root.append(probe);
  for (const el of root.querySelectorAll('[data-sg-color]')) {
    probe.className = `bg-${el.dataset.sgColor}`;
    el.textContent = toHex(getComputedStyle(probe).backgroundColor);
  }
  probe.remove();
  const html = document.documentElement;
  root.querySelector('[data-sg-theme]').textContent = html.dataset.theme;
  root.querySelector('[data-sg-orientation]').textContent = html.dataset.orientation;
}

function toHex(rgb) {
  const m = rgb.match(/rgba?\(([^)]+)\)/);
  if (!m) return rgb;
  const [r, g, b, a] = m[1].split(/[\s,/]+/).map(Number);
  const hex = [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');
  return `#${hex}${a != null && a < 1 ? ` · ${Math.round(a * 100)}%` : ''}`;
}
