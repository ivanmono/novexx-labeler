// node scripts/figma/minify.mjs <payload.js> [out.js] → the same build call with repeated JSON sub-trees hoisted into constants
// (the payload is `const buildFrames = …;\nreturn await buildFrames(<json>, "<page>"[, opts]);`)
import fs from 'node:fs';
const src = fs.readFileSync(process.argv[2], 'utf8');
const m = src.match(/^(const buildFrames = .*?;)\nreturn await buildFrames\((\[.*\]), ("[^"]*")(, \{[^}]*\})?\);\s*$/s);
if (!m) throw new Error('unexpected payload shape');
const [, head, json, page, opts = ''] = m;
const data = JSON.parse(json);

// count every object / array sub-tree by its JSON text
const count = new Map();
const walk = (v) => {
  if (v && typeof v === 'object') {
    const s = JSON.stringify(v);
    if (s.length > 24) count.set(s, (count.get(s) || 0) + 1);
    Object.values(v).forEach(walk);
  }
};
walk(data);
// hoist the ones that save the most; larger first so nested repeats collapse inside them
const picked = [...count.entries()]
  .filter(([s, n]) => n > 1 && (n - 1) * s.length > 40)
  .sort((a, b) => b[0].length - a[0].length);
const names = new Map();
picked.forEach(([s], i) => names.set(s, `_${i.toString(36)}`));

const emit = (v, top = false) => {
  if (v && typeof v === 'object') {
    const s = JSON.stringify(v);
    if (!top && names.has(s)) return names.get(s);
    if (Array.isArray(v)) return `[${v.map((x) => emit(x)).join(',')}]`;
    return `{${Object.entries(v)
      .map(([k, x]) => `${/^[a-z_][a-z0-9_]*$/i.test(k) ? k : JSON.stringify(k)}:${emit(x)}`)
      .join(',')}}`;
  }
  return JSON.stringify(v);
};
// constants are emitted smallest first so a constant can reference earlier (nested) ones
const defs = [...names.entries()]
  .sort((a, b) => a[0].length - b[0].length)
  .map(([s, n]) => `const ${n}=${emit(JSON.parse(s), true)};`);
const out = `${head}\n${defs.join('\n')}\nreturn await buildFrames(${emit(data, true)}, ${page}${opts});\n`;
fs.writeFileSync(process.argv[3] || process.argv[2].replace(/\.js$/, '.min.js'), out);
console.log(src.length, '→', out.length);
