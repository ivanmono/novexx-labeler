/**
 * Assemble code strings for the Desktop Bridge `figma_execute` call.
 *
 *   node scripts/figma/payload.mjs --store
 *       → code that stores build-frames.js in the file's pluginData (`hmi.builder`), once per
 *         builder change (100 kB limit per entry).
 *   node scripts/figma/payload.mjs --frames <captureDir> "<page name>" <file.json> [more.json…]
 *       → code that loads the stored builder and builds the given captures on <page name>.
 *   node scripts/figma/payload.mjs --inline <captureDir> "<page name>" <file.json> [more.json…]
 *       → same, with the builder inlined (no pluginData needed).
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [mode, dir, page, ...files] = process.argv.slice(2);
const builder = readFileSync(resolve(here, 'build-frames.js'), 'utf8');
/** Drop default-valued keys so a frame payload stays small (the builder treats missing as default). */
const prune = (n) => {
  if (Array.isArray(n)) return n.map(prune);
  if (n && typeof n === 'object') {
    const o = {};
    for (const [k, v] of Object.entries(n)) {
      if (v == null || v === false) continue;
      if (k === 'opacity' && v === 1) continue;
      if (k === 'radius' && v.every((x) => x === 0)) continue;
      if ((k === 'fills' || k === 'children') && v.length === 0) continue;
      if (k === 'lines' && v === 1) continue;
      if (k === 'children' && n.type === 'instance') continue; // the component set holds the subtree
      o[k] = prune(v);
    }
    return o;
  }
  return n;
};
const compact = (c) => JSON.stringify(prune(c));

if (mode === '--store') {
  process.stdout.write(
    `figma.root.setPluginData('hmi.builder', ${JSON.stringify(builder)});\nreturn { stored: figma.root.getPluginData('hmi.builder').length };\n`,
  );
} else if (mode === '--components') {
  // node payload.mjs --components <captureDir> "<page name>"  → builds the component sets from components.json
  // optional filters: [set name] [variant substring] → smaller payloads per call
  const [onlySet, onlyVariant] = files;
  const sets = JSON.parse(readFileSync(resolve(dir, 'components.json'), 'utf8')).filter(
    (v) =>
      (!onlySet || v.set === onlySet) &&
      (!onlyVariant ||
        Object.entries(v.props).some(([k, val]) => `${k}=${val}`.includes(onlyVariant))),
  );
  process.stdout.write(
    `const buildFrames = new Function(figma.root.getPluginData('hmi.builder') + '\\nreturn buildFrames;')();\nreturn await buildFrames(${compact(sets)}, ${JSON.stringify(page)}, { components: true });\n`,
  );
} else if (mode === '--frames' || mode === '--inline') {
  const captures = files.map((f) => JSON.parse(readFileSync(resolve(dir, f), 'utf8')));
  const load =
    mode === '--inline'
      ? builder
      : `const buildFrames = new Function(figma.root.getPluginData('hmi.builder') + '\\nreturn buildFrames;')();`;
  process.stdout.write(
    `${load}\nreturn await buildFrames(${compact(captures)}, ${JSON.stringify(page)});\n`,
  );
} else {
  console.error(
    'usage: payload.mjs --store | --frames <dir> <page> <files…> | --inline <dir> <page> <files…>',
  );
  process.exit(1);
}
