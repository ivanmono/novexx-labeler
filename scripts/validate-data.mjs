#!/usr/bin/env node
/**
 * Validate src/data/*.json after `npm run data:sync`. Exits non-zero on any error.
 * Guards against the data quirks listed in docs/OPEN-POINTS.md and the clickdummy's DATA.checks.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCondition, conditionRefs } from '../src/core/conditions.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data', f), 'utf8'));
const params = read('params.json');
const options = read('options.json');
const tree = read('menu-tree.json');
const masks = read('masks.json');
const labels = read('i18n/en.generated.json');
const meta = read('meta.json');

const errors = [];
const warn = [];
const err = (m) => errors.push(m);

const CONTROLS = new Set(['toggle', 'select', 'number', 'slider', 'text', 'ip', 'time', 'date', 'action', 'state', 'display']);
const TYPES = new Set(['Boolean', 'DiscreteParam', 'Integer', 'Float', 'String', 'Action', 'Action Button', 'State']);
const paramIds = new Set(params.map((p) => p.id));
const optionIds = new Set(options.map((o) => o.id));

// counts
if (meta.counts.params !== 214) err(`Expected 214 Excel parameters, got ${meta.counts.params}`);
if (meta.counts.options !== 127) err(`Expected 127 options, got ${meta.counts.options}`);

// params
const seen = new Set();
for (const p of params) {
  const tag = `param ${p.id} ${p.name}`;
  if (seen.has(p.id)) err(`${tag}: duplicate id`);
  seen.add(p.id);
  if (!TYPES.has(p.type)) err(`${tag}: unknown type "${p.type}"`);
  if (!CONTROLS.has(p.control)) err(`${tag}: unknown control "${p.control}"`);
  if (p.color != null && !/^#[0-9a-f]{6}$/i.test(p.color)) err(`${tag}: bad colour "${p.color}"`);
  for (const k of ['accessRead', 'accessWrite']) {
    const v = p[k];
    if (!(v === null || v === 'X' || (Number.isInteger(v) && v >= 0 && v <= 4))) err(`${tag}: bad ${k} ${v}`);
  }
  if (p.type === 'DiscreteParam') {
    if (!p.options.length) err(`${tag}: DiscreteParam without options`);
    for (const oid of p.options) if (!optionIds.has(oid)) err(`${tag}: unknown option ${oid}`);
    if (p.default != null && !p.options.includes(Number(p.default))) err(`${tag}: default ${p.default} not in options`);
  }
  if ((p.control === 'number' || p.control === 'slider') && (typeof p.min !== 'number' || typeof p.max !== 'number')) {
    err(`${tag}: ${p.control} without numeric min/max (${p.min}..${p.max})`);
  }
  if (p.control === 'slider' && p.editable !== true) err(`${tag}: slider must be editable`);
  if (p.cond) {
    try {
      const parsed = parseCondition(p.cond);
      for (const ref of conditionRefs(parsed)) if (!paramIds.has(Number(ref))) err(`${tag}: condition references unknown param ${ref}`);
      for (const and of parsed) for (const or of and) for (const a of or) {
        if (a.op === '=' || a.op === '!=') {
          const target = params.find((x) => x.id === Number(a.id));
          if (target?.type === 'DiscreteParam' && !target.options.includes(Number(a.value))) err(`${tag}: condition value ${a.value} is not an option of ${a.id}`);
        }
      }
    } catch (e) {
      err(`${tag}: ${e.message}`);
    }
  }
  if (!labels[p.labelKey]) err(`${tag}: no English label for ${p.labelKey}`);
  if (!p.extra && !p.screens.length && !['Action', 'Action Button', 'State'].includes(p.type) && ![728, 730].includes(p.id)) {
    warn.push(`${tag}: not placed on any screen`);
  }
}

// options
for (const o of options) {
  if (o.parent == null && !o.reserved) warn.push(`option ${o.id} ${o.name}: no parent parameter`);
  if (!labels[o.labelKey]) err(`option ${o.id}: no English label`);
}

// tree
const KINDS = new Set(['menu', 'list', 'mask', 'placeholder', 'ref']);
const nodeIds = new Set();
const iconDir = path.join(ROOT, 'src/assets/icons');
const iconsAvailable = fs.existsSync(iconDir) ? new Set(fs.readdirSync(iconDir).filter((f) => f.endsWith('.svg')).map((f) => f.replace(/\.svg$/, ''))) : null;
function walk(n) {
  const tag = `node ${n.id}`;
  if (nodeIds.has(n.id)) err(`${tag}: duplicate id`);
  nodeIds.add(n.id);
  if (!KINDS.has(n.kind)) err(`${tag}: unknown kind ${n.kind}`);
  if (!n.icon) err(`${tag}: no icon`);
  else if (iconsAvailable && !iconsAvailable.has(n.icon)) err(`${tag}: icon "${n.icon}" has no SVG in src/assets/icons`);
  if (n.kind === 'mask' && !masks[n.id]) err(`${tag}: mask node without mask spec`);
  if (n.kind === 'ref' && !n.target) err(`${tag}: ref without target`);
  if (n.kind === 'menu' && !(n.children?.length)) err(`${tag}: menu without children`);
  if (n.kind === 'list' && !(n.items?.length)) err(`${tag}: list without items`);
  for (const it of n.items ?? []) {
    if (!['defined', 'planned', 'tbd', 'header'].includes(it.status)) err(`${tag}: item "${it.label}" bad status ${it.status}`);
    if (it.status === 'defined' && it.pid == null) err(`${tag}: defined item "${it.label}" without pid`);
    if (it.pid != null && !paramIds.has(it.pid)) err(`${tag}: item "${it.label}" references unknown param ${it.pid}`);
    if (it.indent > 2) err(`${tag}: item "${it.label}" indent ${it.indent} > 2 (docx §7.1)`);
  }
  for (const c of n.children ?? []) walk(c);
}
walk(tree);
function checkRefs(n) {
  if (n.kind === 'ref' && !nodeIds.has(n.target)) err(`node ${n.id}: ref target ${n.target} missing`);
  for (const c of n.children ?? []) checkRefs(c);
}
checkRefs(tree);
if (!iconsAvailable) warn.push('src/assets/icons not present yet — icon names not checked');

for (const w of warn) console.warn('warn:', w);
if (errors.length) {
  for (const e of errors) console.error('error:', e);
  console.error(`\n${errors.length} error(s)`);
  process.exit(1);
}
console.log(`data ok: ${params.length} params, ${options.length} options, ${nodeIds.size} nodes, ${Object.keys(masks).length} masks (${warn.length} warnings)`);
