/**
 * Touch test (dev route #/touchtest, not part of the product UI): checks the touch panel of the
 * real device.
 * - Accuracy: 9 crosshairs, each twice, report where every touch landed. Tells a calibration or
 *   mapping fault (consistent offset, error growing towards the edges) apart from targets that
 *   are simply too small (scatter).
 * - Sizes: buttons from 5 to 12 mm at random places; hit rate per size.
 * - Draw: raw pointer positions and contact size over a 10 mm grid (measure the grid with a ruler
 *   to check the px/mm assumption).
 * Runs as a fixed layer over the whole panel in raw panel coordinates (the 180° orientations are
 * not applied), so the bar areas and edges are tested too. Results go to localStorage
 * `hmi.touchtest` and `window.__touchtest`; on the dev server each result is also posted to
 * /__touchtest (saved in touchtest-results/, see vite.config.js). English only, like the dev panel.
 */
import { esc } from '../html.js';
import {
  PX_PER_MM,
  SIZES_MM,
  VERDICT_TEXT,
  accuracyTargets,
  shuffle,
  summarizeAccuracy,
  summarizeSizes,
  toMm,
  toPx,
} from '../dev/touchtest.js';

const STORE_KEY = 'hmi.touchtest';
const PASSES = 2;
const SIZE_TRIALS = 6;
const BIG = 'min-h-[84px] px-5 rounded-md text-body-lg font-semibold pressable';
const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
const signed = (v) => `${v >= 0 ? '+' : '−'}${f1(Math.abs(v))}`;

export function render(ctx) {
  ctx.shell.setScreen({
    bars: false,
    html: '<div class="flex-1 bg-bg"></div>',
    mount: () => mountTouchTest({ onClose: () => ctx.go('home') }),
  });
}

function loadResults() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null') ?? {};
  } catch {
    return {};
  }
}
function saveResults(part, data) {
  const all = { ...loadResults(), [part]: data, device: deviceInfo() };
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(all));
  } catch {
    /* private mode: keep it in memory only */
  }
  window.__touchtest = all;
  console.info('[touchtest]', JSON.stringify(all));
  if (import.meta.env.DEV) {
    fetch('/__touchtest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ part, at: new Date().toISOString(), device: all.device, ...data }),
    }).catch(() => {});
  }
  return all;
}

function deviceInfo() {
  return {
    viewport: `${window.innerWidth}×${window.innerHeight}`,
    dpr: window.devicePixelRatio,
    screen: `${window.screen.width}×${window.screen.height}`,
    ua: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
  };
}

/** Mounts the layer; returns the unmount function. */
export function mountTouchTest({ onClose }) {
  const layer = document.createElement('div');
  layer.dataset.touchtest = 'menu';
  layer.className = 'fixed inset-0 z-[10000] bg-bg text-text select-none overflow-hidden';
  layer.style.touchAction = 'none';
  document.body.append(layer);

  const W = () => window.innerWidth;
  const H = () => window.innerHeight;
  let last = { type: '—', w: 0, h: 0 };
  let handlers = {};
  let timer = null;

  const show = (mode, html, h = {}) => {
    clearTimeout(timer);
    layer.dataset.touchtest = mode;
    layer.innerHTML = html;
    handlers = h;
  };

  // ---- menu ------------------------------------------------------------------------------
  function menu() {
    const d = deviceInfo();
    const scaled = !['480×800', '800×480'].includes(d.viewport) || d.dpr !== 1;
    const r = loadResults();
    const acc = r.accuracy?.summary;
    const siz = r.sizes?.summary;
    show(
      'menu',
      `
      <div class="absolute inset-0 overflow-auto flex flex-col gap-4 p-6">
        <div class="flex items-center justify-between gap-4">
          <h1 class="text-title font-bold">Touch test</h1>
          <button type="button" class="${BIG} bg-surface-2" data-tt="close">Close</button>
        </div>
        <div class="text-label text-muted flex flex-col gap-1">
          <div>Viewport ${esc(d.viewport)} · DPR ${esc(d.dpr)} · screen ${esc(d.screen)} · ${esc(d.maxTouchPoints)} touch points</div>
          <div>Assumed display 4.3" 800 × 480: ${f1(PX_PER_MM)} px/mm (60 px = ${f1(toMm(60))} mm, 48 px = ${f1(toMm(48))} mm)</div>
          <div data-tt-last>Last pointer: ${esc(last.type)} · contact ${Math.round(last.w)}×${Math.round(last.h)} px</div>
          ${scaled ? '<div class="text-status-error-ink font-semibold">Not 1:1 with the 800 × 480 panel (expected viewport 480×800 or 800×480 at DPR 1): the browser scales CSS pixels, so everything renders smaller or larger than designed. Fine on a desktop browser; on the device, check the browser zoom / scale factor.</div>' : ''}
        </div>
        <button type="button" class="${BIG} bg-brand text-on-brand text-left" data-tt="accuracy">Accuracy<span class="block text-label font-normal">${9 * PASSES} crosshairs over the whole panel: is the touch mapped correctly?</span></button>
        <button type="button" class="${BIG} bg-surface-2 text-left" data-tt="sizes">Sizes<span class="block text-label font-normal text-muted">${SIZES_MM.length * SIZE_TRIALS} buttons from 5 to 12 mm: which size is hit reliably?</span></button>
        <button type="button" class="${BIG} bg-surface-2 text-left" data-tt="draw">Draw<span class="block text-label font-normal text-muted">Raw touch points over a 10 mm grid</span></button>
        ${acc ? `<div class="text-label"><b>Last accuracy:</b> ${accuracyLine(acc)}</div>` : ''}
        ${siz ? `<div class="text-label"><b>Last sizes:</b> ${siz.smallestSafe ? `reliable from ${siz.smallestSafe} mm (${toPx(siz.smallestSafe)} px)` : 'no size was hit every time'}</div>` : ''}
      </div>`,
      {
        tap(e) {
          const b = e.target.closest('[data-tt]');
          if (!b) return;
          ({ close: onClose, accuracy, sizes, draw })[b.dataset.tt]?.();
        },
      },
    );
  }

  const accuracyLine = (s) =>
    `mean error ${f1(s.meanErr)} mm, offset x ${signed(s.biasX)} / y ${signed(s.biasY)} mm, corners ${f1(s.corner)} mm → ${esc(s.verdict)}`;

  // ---- accuracy --------------------------------------------------------------------------
  function accuracy() {
    const base = accuracyTargets(W(), H());
    const queue = Array.from({ length: PASSES }, () => shuffle(base)).flat();
    const samples = [];
    let down = null;
    const next = () => {
      const t = queue[samples.length];
      if (!t) return accuracyResult(samples);
      const textY = t.y < H() / 2 ? '68%' : '28%';
      show(
        'accuracy',
        `
        <svg class="absolute text-brand-hi pointer-events-none" style="left:${t.x - 30}px;top:${t.y - 30}px" width="60" height="60" viewBox="0 0 60 60" data-tt-target="${t.x},${t.y}" aria-hidden="true">
          <line x1="0" y1="30" x2="60" y2="30" stroke="currentColor" stroke-width="2"/><line x1="30" y1="0" x2="30" y2="60" stroke="currentColor" stroke-width="2"/>
          <circle cx="30" cy="30" r="10" fill="none" stroke="currentColor" stroke-width="2"/></svg>
        <div class="absolute inset-x-0 text-center pointer-events-none" style="top:${textY}">
          <div class="text-title font-semibold">${samples.length + 1} / ${queue.length}</div>
          <div class="text-body text-muted">Tap the centre of the cross</div>
        </div>
        <span class="absolute size-3 -ml-1.5 -mt-1.5 rounded-pill bg-status-error hidden" data-tt-dot></span>`,
        {
          down(e) {
            down = { x: e.clientX, y: e.clientY };
            const dot = layer.querySelector('[data-tt-dot]');
            dot.style.left = `${e.clientX}px`;
            dot.style.top = `${e.clientY}px`;
            dot.classList.remove('hidden');
          },
          up(e) {
            if (!down) return;
            samples.push({ tx: t.x, ty: t.y, region: t.region, x: down.x, y: down.y, drift: Math.hypot(e.clientX - down.x, e.clientY - down.y), type: e.pointerType });
            down = null;
            timer = setTimeout(next, 150);
          },
        },
      );
    };
    next();
  }

  function accuracyResult(samples) {
    const s = summarizeAccuracy(samples);
    saveResults('accuracy', { samples, summary: s });
    const w = W();
    const h = H();
    const k = 2; // offsets drawn ×2
    const vec = samples
      .map((p) => `<line x1="${p.tx}" y1="${p.ty}" x2="${p.tx + (p.x - p.tx) * k}" y2="${p.ty + (p.y - p.ty) * k}" stroke="currentColor" stroke-width="3" class="text-status-error"/><circle cx="${p.tx + (p.x - p.tx) * k}" cy="${p.ty + (p.y - p.ty) * k}" r="5" class="text-status-error" fill="currentColor"/>`)
      .join('');
    const crosses = accuracyTargets(w, h)
      .map((t) => `<path d="M${t.x - 12} ${t.y}h24M${t.x} ${t.y - 12}v24" stroke="currentColor" stroke-width="3" class="text-muted"/>`)
      .join('');
    resultView(
      'accuracy-result',
      `
      <svg viewBox="0 0 ${w} ${h}" class="w-full max-h-[45%] shrink-0 rounded-md border border-line bg-surface" aria-hidden="true">${crosses}${vec}</svg>
      <div class="text-label text-muted">Crosses = targets, red = where the touch landed (offset drawn ×2)</div>
      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body" data-tt-summary>
        <dt class="text-muted">Mean error</dt><dd><b>${f1(s.meanErr)} mm</b> · max ${f1(s.maxErr)} mm</dd>
        <dt class="text-muted">Offset</dt><dd>x ${signed(s.biasX)} mm · y ${signed(s.biasY)} mm (right / down positive)</dd>
        <dt class="text-muted">By area</dt><dd>centre ${f1(s.centre)} · edges ${f1(s.edge)} · corners ${f1(s.corner)} mm</dd>
        <dt class="text-muted">Drift</dt><dd>${f1(s.drift)} mm while pressed (median)</dd>
        <dt class="text-muted">Pointer</dt><dd>${esc(last.type)} · contact ${Math.round(last.w)}×${Math.round(last.h)} px</dd>
      </dl>
      <div class="text-body font-semibold" data-tt-verdict="${s.verdict}">${esc(VERDICT_TEXT[s.verdict])}</div>`,
      accuracy,
    );
  }

  // ---- sizes -----------------------------------------------------------------------------
  function sizes() {
    const queue = shuffle(SIZES_MM.flatMap((mm) => Array(SIZE_TRIALS).fill(mm)));
    const samples = [];
    let cur = null;
    const next = () => {
      const mm = queue[samples.length];
      if (mm === undefined) return sizesResult(samples);
      const px = toPx(mm);
      const m = px / 2 + 12;
      const cx = Math.round(m + Math.random() * (W() - 2 * m));
      const cy = Math.round(m + Math.random() * (H() - 2 * m));
      cur = { mm, cx, cy, hit: false, clicked: false, x: 0, y: 0, pressed: false };
      const textY = cy < H() / 2 ? '72%' : '22%';
      show(
        'sizes',
        `
        <div class="absolute inset-x-0 text-center pointer-events-none" style="top:${textY}">
          <div class="text-title font-semibold">${samples.length + 1} / ${queue.length}</div>
          <div class="text-body text-muted">Tap the button</div>
        </div>
        <button type="button" class="absolute rounded-sm bg-brand text-on-brand text-label font-semibold pressable" style="left:${cx - px / 2}px;top:${cy - px / 2}px;width:${px}px;height:${px}px" data-tt-button="${mm}">${mm}</button>`,
        {
          down(e) {
            const r = layer.querySelector('[data-tt-button]').getBoundingClientRect();
            Object.assign(cur, { pressed: true, x: e.clientX, y: e.clientY, hit: e.clientX >= r.left && e.clientX < r.right && e.clientY >= r.top && e.clientY < r.bottom });
          },
          click(e) {
            if (e.target.closest('[data-tt-button]')) cur.clicked = true;
          },
          up() {
            if (!cur.pressed) return;
            cur.pressed = false;
            // the click event follows pointerup; wait for it before scoring the trial
            timer = setTimeout(() => {
              const { mm, cx, cy, hit, clicked, x, y } = cur;
              samples.push({ mm, cx, cy, hit, clicked, x, y });
              next();
            }, 180);
          },
        },
      );
    };
    next();
  }

  function sizesResult(samples) {
    const s = summarizeSizes(samples);
    saveResults('sizes', { samples, summary: s });
    resultView(
      'sizes-result',
      `
      <table class="w-full text-body" data-tt-summary>
        <thead class="text-label text-muted text-left"><tr><th class="py-1">Size</th><th>Hits</th><th>Off centre</th><th>Lost clicks</th></tr></thead>
        <tbody>${s.rows
          .map(
            (r) => `<tr class="border-t border-line-soft ${r.hits === r.n && !r.lost ? '' : 'text-status-error-ink'}"><td class="py-2">${r.mm} mm <span class="text-muted">(${r.px} px)</span></td><td>${r.hits} / ${r.n}</td><td>${f1(r.offset)} mm</td><td>${r.lost}</td></tr>`,
          )
          .join('')}</tbody>
      </table>
      <div class="text-label text-muted">Today: primary targets 60 px = ${f1(toMm(60))} mm, list rows 48 px = ${f1(toMm(48))} mm. "Lost clicks": pressed inside, but the browser sent no click (the finger moved while pressing).</div>
      <div class="text-body font-semibold" data-tt-verdict="${s.smallestSafe ?? 'none'}">${s.smallestSafe ? `Hit every time from ${s.smallestSafe} mm (${toPx(s.smallestSafe)} px) upwards.` : 'No size was hit every time: check the Accuracy test for a calibration fault.'}</div>`,
      sizes,
    );
  }

  // ---- shared result view ----------------------------------------------------------------
  function resultView(mode, body, again) {
    show(
      mode,
      `
      <div class="absolute inset-0 overflow-auto flex flex-col gap-3 p-5">
        ${body}
        <div class="flex flex-wrap gap-3 mt-auto pt-2">
          <button type="button" class="${BIG} bg-brand text-on-brand" data-tt="again">Again</button>
          <button type="button" class="${BIG} bg-surface-2" data-tt="copy">Copy JSON</button>
          <button type="button" class="${BIG} bg-surface-2" data-tt="back">Back</button>
        </div>
      </div>`,
      {
        tap(e) {
          const b = e.target.closest('[data-tt]');
          if (!b) return;
          if (b.dataset.tt === 'again') again();
          else if (b.dataset.tt === 'back') menu();
          else if (b.dataset.tt === 'copy') {
            navigator.clipboard?.writeText(JSON.stringify(loadResults(), null, 1)).then(
              () => (b.textContent = 'Copied'),
              () => (b.textContent = 'See console'),
            );
          }
        },
      },
    );
  }

  // ---- draw ------------------------------------------------------------------------------
  function draw() {
    const grid = PX_PER_MM * 10;
    show(
      'draw',
      `
      <div class="absolute inset-0" style="background-image:linear-gradient(var(--hmi-line-soft) 1px,transparent 1px),linear-gradient(90deg,var(--hmi-line-soft) 1px,transparent 1px);background-size:${grid}px ${grid}px"></div>
      <canvas class="absolute inset-0" data-tt-canvas></canvas>
      <div class="absolute left-3 top-3 text-label text-muted pointer-events-none" data-tt-read>Grid = 10 mm. Touch and drag anywhere.</div>
      <div class="absolute right-3 bottom-3 flex gap-3">
        <button type="button" class="${BIG} bg-surface-2" data-tt="clear">Clear</button>
        <button type="button" class="${BIG} bg-surface-2" data-tt="back">Back</button>
      </div>`,
    );
    const canvas = layer.querySelector('[data-tt-canvas]');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W() * dpr;
    canvas.height = H() * dpr;
    canvas.style.width = `${W()}px`;
    canvas.style.height = `${H()}px`;
    const g = canvas.getContext('2d');
    g.scale(dpr, dpr);
    const css = getComputedStyle(layer);
    const brand = css.getPropertyValue('--hmi-brand-hi').trim() || '#2bd4b0';
    const error = css.getPropertyValue('--hmi-status-error').trim() || '#ff4d5e';
    const read = layer.querySelector('[data-tt-read]');
    const pts = new Map();
    const onButton = (e) => e.target.closest('[data-tt]');
    const readout = (e) =>
      (read.textContent = `x ${Math.round(e.clientX)} · y ${Math.round(e.clientY)} · contact ${Math.round(e.width)}×${Math.round(e.height)} px (${f1(toMm(e.width))}×${f1(toMm(e.height))} mm) · ${e.pointerType} · ${pts.size} down`);
    handlers = {
      tap(e) {
        const b = onButton(e);
        if (b?.dataset.tt === 'back') menu();
        else if (b?.dataset.tt === 'clear') g.clearRect(0, 0, W(), H());
      },
      down(e) {
        if (onButton(e)) return;
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        g.strokeStyle = error;
        g.lineWidth = 2;
        g.beginPath();
        g.ellipse(e.clientX, e.clientY, Math.max(e.width, 8) / 2, Math.max(e.height, 8) / 2, 0, 0, Math.PI * 2);
        g.stroke();
        readout(e);
      },
      move(e) {
        const p = pts.get(e.pointerId);
        if (!p) return;
        g.strokeStyle = brand;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(p.x, p.y);
        g.lineTo(e.clientX, e.clientY);
        g.stroke();
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        readout(e);
      },
      up(e) {
        pts.delete(e.pointerId);
      },
    };
  }

  // ---- events ----------------------------------------------------------------------------
  const onDown = (e) => {
    last = { type: e.pointerType, w: e.width, h: e.height };
    if (e.isPrimary || layer.dataset.touchtest === 'draw') handlers.down?.(e);
  };
  const onMove = (e) => handlers.move?.(e);
  const onUp = (e) => {
    if (e.isPrimary || layer.dataset.touchtest === 'draw') handlers.up?.(e);
  };
  const onClick = (e) => {
    handlers.click?.(e);
    handlers.tap?.(e);
  };
  layer.addEventListener('pointerdown', onDown);
  layer.addEventListener('pointermove', onMove);
  layer.addEventListener('pointerup', onUp);
  layer.addEventListener('pointercancel', onUp);
  layer.addEventListener('click', onClick);

  menu();
  return () => {
    clearTimeout(timer);
    layer.remove();
  };
}
