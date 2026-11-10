#!/usr/bin/env node
/**
 * Normalise the SVGs in src/assets/icons (exported from Figma page "Icons v1 – 24 px": 24 px canvas,
 * 1.5 px stroke, see docs/FIGMA.md) and build src/assets/icons/sprite.svg plus src/assets/icons/index.json.
 *
 * Normalisation (ICON_RULES.md §1 and §5):
 *   - drop background rectangles (any <rect> with a fill) and the frame wrapper
 *   - stroke colour → currentColor, keep the exported stroke-width (1.5), caps and joins
 *   - canvas size read from the source viewBox; a file on another canvas is reported
 *   - no ids, no fills other than "none"
 *   - in the sprite only: vector-effect="non-scaling-stroke" on stroked shapes, so the stroke stays
 *     1.5 px at any rendered size (icons are drawn at 24 px but shown at 24–48 px; DT-48)
 * Idempotent: running it twice yields the same files.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'src/assets/icons');
const CANVAS = 24;

const names = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith('.svg') && f !== 'sprite.svg')
  .map((f) => f.replace(/\.svg$/, ''))
  .sort();

function normalise(svg) {
  let body = svg
    .replace(/<\?xml[^>]*>/g, '')
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '');
  // background / frame rects
  body = body.replace(/<rect[^>]*fill="(?:#[0-9A-Fa-f]{3,8}|white|black)"[^>]*\/>/g, '');
  // unwrap <g> wrappers (keep their children)
  body = body.replace(/<g[^>]*>/g, '').replace(/<\/g>/g, '');
  body = body
    .replace(/\s*id="[^"]*"/g, '')
    .replace(/stroke="(?:black|#000|#000000)"/g, 'stroke="currentColor"')
    .replace(/fill="(?:black|#000|#000000)"/g, 'fill="currentColor"');
  // collapse whitespace
  body = body
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');
  return body;
}

const symbols = [];
const index = {};
for (const name of names) {
  const file = path.join(DIR, `${name}.svg`);
  const raw = fs.readFileSync(file, 'utf8');
  const size = Number(raw.match(/viewBox="0 0 (\d+) (\d+)"/)?.[1] ?? CANVAS);
  if (size !== CANVAS) console.warn(`warn: ${name}.svg is on a ${size} px canvas, expected ${CANVAS}`);
  const inner = normalise(raw);
  if (!inner.includes('stroke="currentColor"') && !inner.includes('fill="currentColor"')) {
    console.warn(`warn: ${name}.svg has no currentColor stroke after normalisation`);
  }
  const clean = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none">\n${inner}\n</svg>\n`;
  fs.writeFileSync(file, clean);
  const fixed = inner.replace(/<(path|circle|line|polyline|polygon|rect|ellipse)\b(?![^>]*vector-effect)(?=[^>]*stroke-width)/g, '<$1 vector-effect="non-scaling-stroke"');
  symbols.push(`<symbol id="icon-${name}" viewBox="0 0 ${size} ${size}" fill="none">\n${fixed}\n</symbol>`);
  index[name] = { paths: (inner.match(/<path/g) ?? []).length };
}
const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">\n${symbols.join('\n')}\n</svg>\n`;
fs.writeFileSync(path.join(DIR, 'sprite.svg'), sprite);
fs.writeFileSync(path.join(DIR, 'index.json'), JSON.stringify({ count: names.length, names }, null, 2) + '\n');
console.log(`sprite: ${names.length} icons, ${(sprite.length / 1024).toFixed(1)} KB`);
