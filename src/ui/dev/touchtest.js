/**
 * Touch test analysis (dev tool, see TouchTest.js): pure functions, unit-tested.
 * Distances are in panel pixels; the summaries report millimetres on the spec display
 * (docx §3: 4.3", 800 × 480 px → 8.54 px/mm, 217 ppi).
 */
export const PX_PER_MM = Math.hypot(800, 480) / 4.3 / 25.4;
export const toMm = (px) => px / PX_PER_MM;
export const toPx = (mm) => Math.round(mm * PX_PER_MM);

/** Button sizes for the size test, in mm (60 px ≈ 7 mm and 48 px ≈ 5.6 mm are today's tokens). */
export const SIZES_MM = [5, 6, 7, 8, 10, 12];

/** 3 × 3 crosshair positions, `inset` px from the edges; region = centre · edge · corner. */
export function accuracyTargets(w, h, inset = 40) {
  const xs = [inset, Math.round(w / 2), w - inset];
  const ys = [inset, Math.round(h / 2), h - inset];
  const out = [];
  ys.forEach((y, j) =>
    xs.forEach((x, i) => {
      const off = (i !== 1) + (j !== 1);
      out.push({ x, y, region: off === 0 ? 'centre' : off === 1 ? 'edge' : 'corner' });
    }),
  );
  return out;
}

export function shuffle(list, rnd = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const mean = (xs) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0);
const median = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Accuracy summary from samples `{ tx, ty, x, y, region, drift? }` (target and touch, px).
 * Verdict:
 * - offset   — touches land consistently to one side (≥ 1.5 mm, and the shift explains most of the
 *              error): calibration / mapping
 * - scaling  — corners clearly worse than the centre: touch range does not match the display
 * - accurate — mean error ≤ 2 mm: the panel is fine, misses come from target size
 * - scatter  — no direction, but large spread: finger / glove on small targets, sensitivity
 */
export function summarizeAccuracy(samples) {
  const dx = samples.map((s) => s.x - s.tx);
  const dy = samples.map((s) => s.y - s.ty);
  const err = samples.map((s, i) => Math.hypot(dx[i], dy[i]));
  const region = (r) => toMm(mean(err.filter((_, i) => samples[i].region === r)));
  const biasX = toMm(mean(dx));
  const biasY = toMm(mean(dy));
  const out = {
    n: samples.length,
    biasX,
    biasY,
    bias: Math.hypot(biasX, biasY),
    meanErr: toMm(mean(err)),
    maxErr: toMm(Math.max(0, ...err)),
    centre: region('centre'),
    edge: region('edge'),
    corner: region('corner'),
    drift: toMm(median(samples.map((s) => s.drift ?? 0))),
  };
  out.verdict =
    out.bias >= 1.5 && out.bias >= 0.6 * out.meanErr
      ? 'offset'
      : out.corner >= 2.5 && out.corner > 1.8 * Math.max(out.centre, 0.5)
        ? 'scaling'
        : out.meanErr <= 2
          ? 'accurate'
          : 'scatter';
  return out;
}

/**
 * Size summary from samples `{ mm, hit, clicked, x, y, cx, cy }`: per size the hits, the mean
 * distance from the button centre and the "lost" clicks (pressed inside, but no click event —
 * usually the finger moved while pressing). `smallestSafe` is the smallest size hit every time
 * that every larger size also hit every time.
 */
export function summarizeSizes(samples) {
  const rows = SIZES_MM.map((size) => {
    const s = samples.filter((x) => x.mm === size);
    return {
      mm: size,
      px: toPx(size),
      n: s.length,
      hits: s.filter((x) => x.hit).length,
      lost: s.filter((x) => x.hit && !x.clicked).length,
      offset: toMm(mean(s.map((x) => Math.hypot(x.x - x.cx, x.y - x.cy)))),
    };
  });
  let smallestSafe = null;
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    if (!r.n || r.hits < r.n || r.lost) break;
    smallestSafe = r.mm;
  }
  return { rows, smallestSafe };
}

export const VERDICT_TEXT = {
  offset:
    'Touches land consistently to one side. The touch input is mis-mapped or uncalibrated (touch calibration, rotation or scaling on the device). Fix on the device, not in the app.',
  scaling:
    'Errors grow towards the edges and corners. The touch range does not match the 800 × 480 display (scaling or calibration on the device).',
  accurate:
    'The panel reports touches accurately. Misses come from targets that are too small for a finger or glove: make targets bigger.',
  scatter:
    'Touches scatter without a direction. Typical for small targets with a glove or low sensitivity: make targets bigger, check the glove / sensitivity mode of the touch controller.',
};
