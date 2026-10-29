#!/usr/bin/env node
/**
 * Build src/data/*.json from the binding sources (docs/sources):
 *   - Parameterliste-PreSeriesPhase-12.xlsx  → parameters and options (PRIMARY for parameter data)
 *   - PID_Labeller_HMI_Clickdummy.html        → screen tree, screen ↔ parameter mapping, mask specs
 *   - src/data/overrides.json                 → hand-reviewed corrections (docx v1.6 wins)
 *
 * Idempotent: run `npm run data:sync` after any source change. Output is committed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = {
  xlsx: path.join(ROOT, 'docs/sources/Parameterliste-PreSeriesPhase-12.xlsx'),
  clickdummy: path.join(ROOT, 'docs/sources/PID_Labeller_HMI_Clickdummy.html'),
  overrides: path.join(ROOT, 'src/data/overrides.json'),
};
const OUT = path.join(ROOT, 'src/data');

const overrides = JSON.parse(fs.readFileSync(SRC.overrides, 'utf8'));

// ---------------------------------------------------------------------------
// 1. Excel → raw rows
// ---------------------------------------------------------------------------
const wb = XLSX.readFile(SRC.xlsx, { cellDates: false });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
const header = rows[0];
const col = (name) => {
  const i = header.indexOf(name);
  if (i < 0) throw new Error(`Column "${name}" missing in ${SRC.xlsx}`);
  return i;
};
const C = {
  id: col('ParamID'),
  name: col('Name (English)'),
  min: col('Min'),
  val: col('Val'),
  max: col('Max'),
  read: col('Access Lvl Read/View'),
  write: col('Access lvl write'),
  color: col('Color'),
  def: col('Default'),
  discrete: col('DiscreteValues'),
  editable: col('Editable'),
  icon: col('Icon'),
  input: col('Inputfield type'),
  rpg: col('RPGChannel'),
  cond: col('Show Condition'),
  subindex: col('Subindex'),
  textres: col('TextResID 1'),
  type: col('Type'),
  unit: col('Unit'),
  format: col('Format relevant'),
};

const blank = (v) => v == null || (typeof v === 'string' && v.trim() === '');
const str = (v) => (blank(v) ? null : String(v).trim());
const num = (v) => (blank(v) ? null : typeof v === 'number' ? v : Number.isNaN(Number(v)) ? String(v).trim() : Number(v));
const bool = (v) => {
  if (blank(v)) return null;
  const s = String(v).trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
};
const level = (v) => {
  if (blank(v)) return null;
  const s = String(v).trim().toUpperCase();
  if (s === 'X') return 'X';
  const n = Number(s);
  if (!Number.isInteger(n) || n < 0 || n > 4) throw new Error(`Bad access level "${v}"`);
  return n;
};
const excelTimeToHms = (f) => {
  const total = Math.round(Number(f) * 86400);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((x) => String(x).padStart(2, '0')).join(':');
};

const rawParams = [];
const rawOptions = [];
const backlog = [];
for (let r = 1; r < rows.length; r++) {
  const row = rows[r];
  if (!row || row.every(blank)) continue;
  const excelRow = r + 1;
  const idCell = row[C.id];
  const type = str(row[C.type]);
  const name = str(row[C.name]);
  if (!name) continue;
  const id = typeof idCell === 'number' ? idCell : null;
  const rec = {
    id,
    row: excelRow,
    name,
    type,
    inputType: str(row[C.input]),
    unit: str(row[C.unit]),
    min: num(row[C.min]),
    max: num(row[C.max]),
    value: num(row[C.val]),
    default: num(row[C.def]),
    discrete: str(row[C.discrete]),
    editable: bool(row[C.editable]),
    cond: str(row[C.cond]),
    accessRead: level(row[C.read]),
    accessWrite: level(row[C.write]),
    subindex: num(row[C.subindex]),
    rpg: str(row[C.rpg]),
    textres: num(row[C.textres]),
    icon: str(row[C.icon]),
    color: str(row[C.color]),
    formatRelevant: bool(row[C.format]) === true,
  };
  if (id == null) {
    backlog.push({ ...rec, status: 'planned' });
  } else if (type === 'DiscreteOpt') {
    rawOptions.push(rec);
  } else {
    rawParams.push(rec);
  }
}

// ---------------------------------------------------------------------------
// 2. Clickdummy → tree, masks, runtime
// ---------------------------------------------------------------------------
const html = fs.readFileSync(SRC.clickdummy, 'utf8');
const dataLine = html.split('\n').find((l) => l.startsWith('const DATA = '));
if (!dataLine) throw new Error('DATA line not found in clickdummy');
const DATA = JSON.parse(dataLine.replace(/^const DATA = /, '').replace(/;\s*$/, ''));

// ---------------------------------------------------------------------------
// 3. Normalise parameters
// ---------------------------------------------------------------------------
const humanise = (name) =>
  name
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const optionById = new Map(rawOptions.map((o) => [o.id, o]));
const reservedIds = new Set(overrides.reservedOptions.ids);
const sliderIds = new Set(overrides.sliders.ids);

function deriveControl(p) {
  if (p.type === 'Boolean') return 'toggle';
  if (p.type === 'DiscreteParam') return 'select';
  if (p.type === 'Action' || p.type === 'Action Button') return 'action';
  if (p.type === 'State') return 'state';
  const readOnly = p.editable === false || p.accessWrite === 'X';
  if (readOnly) return 'display';
  if (p.type === 'Integer' || p.type === 'Float') return sliderIds.has(p.id) ? 'slider' : 'number';
  if (p.type === 'String') return 'text';
  return 'unknown';
}

const params = rawParams.map((p) => {
  const o = overrides.params[String(p.id)] ?? {};
  const merged = { ...p };
  for (const [k, v] of Object.entries(o)) if (k !== 'why') merged[k] = v;

  // Excel stores times as day fractions
  if (merged.id === 700) {
    for (const k of ['min', 'max', 'default']) if (typeof merged[k] === 'number') merged[k] = excelTimeToHms(merged[k]);
  }
  if (merged.type === 'Boolean') {
    for (const k of ['default', 'value']) if (merged[k] != null) merged[k] = merged[k] === true || merged[k] === 1 || String(merged[k]).toLowerCase() === 'true';
  }
  const options = merged.discrete
    ? merged.discrete
        .replace(/[{}]/g, '')
        .split(';')
        .map((s) => Number(s.trim()))
        .filter((n) => !Number.isNaN(n))
    : [];
  for (const oid of options) {
    const opt = optionById.get(oid);
    if (!opt) throw new Error(`Param ${merged.id} references unknown option ${oid}`);
    opt.parent = merged.id;
  }
  const control = merged.control ?? deriveControl(merged);
  const value = merged.value != null && merged.value !== 'Value_edited_by_RTC' ? merged.value : merged.default;
  return {
    id: merged.id,
    name: merged.name,
    labelKey: merged.textres != null ? `tr${merged.textres}` : `param.${merged.id}`,
    type: merged.type,
    inputType: merged.inputType,
    control,
    unit: merged.unit,
    min: merged.min,
    max: merged.max,
    default: merged.default,
    value,
    options,
    editable: merged.editable !== false && merged.accessWrite !== 'X',
    cond: merged.cond,
    accessRead: merged.accessRead,
    accessWrite: merged.accessWrite,
    subindex: merged.subindex,
    rpg: merged.rpg,
    textres: merged.textres,
    icon: merged.icon,
    color: merged.color,
    formatRelevant: merged.formatRelevant,
    row: merged.row,
    screens: [],
  };
});

// Extra (dummy) parameters required by the docx but not in the Excel yet
for (const [id, x] of Object.entries(overrides.extraParams)) {
  if (id.startsWith('$')) continue;
  params.push({
    id: Number(id),
    name: x.name,
    labelKey: `param.${id}`,
    type: x.type,
    inputType: x.inputType ?? null,
    control: x.control ?? deriveControl({ ...x, id: Number(id) }),
    unit: x.unit ?? null,
    min: x.min ?? null,
    max: x.max ?? null,
    default: x.default ?? null,
    value: x.default ?? null,
    options: [],
    editable: x.accessWrite != null,
    cond: null,
    accessRead: x.accessRead ?? null,
    accessWrite: x.accessWrite ?? 'X',
    subindex: null,
    rpg: null,
    textres: null,
    icon: null,
    color: null,
    formatRelevant: false,
    row: null,
    screens: [],
    extra: true,
    why: x.why,
  });
}
params.sort((a, b) => a.id - b.id);
const paramById = new Map(params.map((p) => [p.id, p]));

const options = rawOptions
  .map((o) => ({
    id: o.id,
    name: o.name,
    parent: o.parent ?? null,
    labelKey: o.textres != null ? `tr${o.textres}` : `opt.${o.id}`,
    textres: o.textres,
    reserved: reservedIds.has(o.id),
    row: o.row,
  }))
  .sort((a, b) => a.id - b.id);

// ---------------------------------------------------------------------------
// 4. Tree
// ---------------------------------------------------------------------------
const BRANCH_IDS = ['settings', 'production', 'info', 'service', 'help', 'usermgmt'];
const masks = {};
const labels = {}; // generated English labels: param.<id>, opt.<id>, screen.<id>

function cleanItem(item, nodeId) {
  const pid = item.pid != null ? Number(item.pid) : null;
  if (pid != null) {
    const p = paramById.get(pid);
    if (!p) throw new Error(`Tree item on ${nodeId} references unknown param ${pid}`);
    if (!p.screens.includes(nodeId)) p.screens.push(nodeId);
    if (!labels[p.labelKey]) labels[p.labelKey] = item.label;
  }
  return {
    indent: item.indent ?? 0,
    label: item.label,
    pid,
    status: item.status, // defined | planned | tbd | header
    note: item.note ?? null,
  };
}

function cleanNode(node, branch) {
  const o = overrides.nodes[node.id] ?? {};
  const b = BRANCH_IDS.includes(node.id) ? node.id : branch;
  const out = {
    id: node.id,
    title: node.title,
    subtitle: node.subtitle ?? null,
    icon: node.icon,
    kind: o.kind ?? node.kind,
    branch: b,
    src: node.src ?? null,
    depth: node.depth,
    parent: node.parent ?? null,
    path: node.path,
    note: node.note ?? null,
    shared: node.shared ?? null,
    target: node.target ?? null,
  };
  if (node.items?.length) out.items = node.items.map((i) => cleanItem(i, node.id));
  if (node.links?.length) out.links = node.links;
  const mask = o.mask ?? node.mask;
  if (mask) {
    out.mask = mask.type;
    masks[node.id] = { type: mask.type, spec: mask.spec ?? {}, req: node.req ?? null };
  }
  for (const k of ['accessRead', 'accessAction', 'machineTypes', 'optionKey']) if (o[k] !== undefined) out[k] = o[k];
  const gate = overrides.optionGates[node.id];
  if (gate) out.gate = gate;
  labels[`screen.${node.id}`] = node.title;
  if (node.children?.length) out.children = node.children.map((c) => cleanNode(c, b));
  return out;
}
const tree = cleanNode(DATA.tree, null);

// Labels for parameters/options not placed on any screen
for (const p of params) if (!labels[p.labelKey]) labels[p.labelKey] = overrides.extraParams[String(p.id)]?.label ?? humanise(p.name);
for (const o of options) {
  const dd = DATA.params?.[String(o.parent)]?.options?.find((x) => Number(x.id) === o.id);
  labels[o.labelKey] = dd?.label ?? humanise(o.name.replace(/^.*?_/, ''));
}

// ---------------------------------------------------------------------------
// 5. Runtime, links, meta
// ---------------------------------------------------------------------------
const runtime = (DATA.runtime ?? []).map((id) => paramById.get(Number(id))).filter(Boolean).map((p) => ({ id: p.id, name: p.name, type: p.type, rpg: p.rpg }));

const meta = {
  generatedAt: new Date().toISOString(),
  sources: {
    xlsx: path.basename(SRC.xlsx),
    clickdummy: path.basename(SRC.clickdummy),
    clickdummyParamList: DATA.version,
    clickdummyDiagram: DATA.diagram,
  },
  counts: {
    params: params.filter((p) => !p.extra).length,
    extraParams: params.filter((p) => p.extra).length,
    options: options.length,
    backlog: backlog.length,
    screens: countNodes(tree),
    masks: Object.keys(masks).length,
  },
  links: DATA.links ?? [],
  checks: DATA.checks ?? [],
};
function countNodes(n) {
  return 1 + (n.children ?? []).reduce((s, c) => s + countNodes(c), 0);
}

// ---------------------------------------------------------------------------
// 6. Write
// ---------------------------------------------------------------------------
fs.mkdirSync(path.join(OUT, 'i18n'), { recursive: true });
const write = (file, data) => {
  fs.writeFileSync(path.join(OUT, file), JSON.stringify(data, null, 2) + '\n');
  console.log(`wrote ${file}`);
};
write('params.json', params);
write('options.json', options);
write('menu-tree.json', tree);
write('masks.json', masks);
write('runtime.json', runtime);
write('backlog.json', backlog);
write('meta.json', meta);
write('i18n/en.generated.json', Object.fromEntries(Object.entries(labels).sort(([a], [b]) => a.localeCompare(b))));
console.log(JSON.stringify(meta.counts));
