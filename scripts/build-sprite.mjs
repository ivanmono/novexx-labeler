#!/usr/bin/env node
/**
 * Normalise the SVGs in src/assets/icons (exported from Figma page "Icons v1", 48 px canvas,
 * 2 px stroke) and build src/assets/icons/sprite.svg plus src/assets/icons/index.json.
 *
 * Normalisation (ICON_RULES.md §1 and §5):
 *   - drop background rectangles (any <rect> with a fill) and the frame wrapper
 *   - stroke colour → currentColor, keep stroke-width 2, round caps and joins
 *   - no ids, no fills other than "none"
 * Idempotent: running it twice yields the same files.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'src/assets/icons');

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
  const inner = normalise(fs.readFileSync(file, 'utf8'));
  if (!inner.includes('stroke="currentColor"') && !inner.includes('fill="currentColor"')) {
    console.warn(`warn: ${name}.svg has no currentColor stroke after normalisation`);
  }
  const clean = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">\n${inner}\n</svg>\n`;
  fs.writeFileSync(file, clean);
  symbols.push(`<symbol id="icon-${name}" viewBox="0 0 48 48" fill="none">\n${inner}\n</symbol>`);
  index[name] = { paths: (inner.match(/<path/g) ?? []).length };
}
const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">\n${symbols.join('\n')}\n</svg>\n`;
fs.writeFileSync(path.join(DIR, 'sprite.svg'), sprite);
fs.writeFileSync(path.join(DIR, 'index.json'), JSON.stringify({ count: names.length, names }, null, 2) + '\n');
console.log(`sprite: ${names.length} icons, ${(sprite.length / 1024).toFixed(1)} KB`);
