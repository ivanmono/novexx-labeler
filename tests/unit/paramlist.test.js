import { describe, it, expect } from 'vitest';
import { listRows, conditionIds } from '../../src/ui/screens/ParamListScreen.js';
import tree from '../../src/data/menu-tree.json';
import params from '../../src/data/params.json';

const byId = new Map(params.map((p) => [p.id, p]));
const find = (n, id) =>
  n.id === id ? n : (n.children ?? []).map((c) => find(c, id)).find(Boolean);
const lists = [];
(function walk(n) {
  if (n.kind === 'list') lists.push(n);
  n.children?.forEach(walk);
})(tree);

const env = (level, values = {}) => ({
  level,
  getParam: (id) => (id in values ? values[id] : byId.get(Number(id))?.default),
  param: (id) => byId.get(Number(id)),
});
const pids = (rows) => rows.filter((r) => r.kind === 'row').map((r) => r.pid);

describe('parameter list rows (docx §4.1, §7.1)', () => {
  const speed = find(tree, 'speed');

  it('hides rows whose show condition is false and shows them when the switch changes', () => {
    // SpeedSelection 118 = Fixed (119): Fixed Speed visible, encoder rows absent
    const fixed = pids(listRows(speed, env(3, { 118: 119 })));
    expect(fixed).toContain(122);
    expect(fixed).not.toContain(124);
    expect(fixed).not.toContain(126);
    // Encoder (120): encoder rows visible, Fixed Speed absent
    const enc = pids(listRows(speed, env(3, { 118: 120 })));
    expect(enc).not.toContain(122);
    expect(enc).toEqual(expect.arrayContaining([124, 125, 126, 130]));
  });

  it('leaves out rows the level may not read', () => {
    const hmi = find(tree, 'hmi');
    const rows1 = pids(listRows(hmi, env(1)));
    const rows3 = pids(listRows(hmi, env(3)));
    expect(rows1.length).toBe(3);
    expect(rows3.length).toBe(12);
    for (const pid of rows1) expect(byId.get(pid).accessRead).toBeLessThanOrEqual(1);
    for (const pid of rows1) expect(rows3).toContain(pid);
  });

  it('locks a readable row the level may not write and names the level needed', () => {
    const row = listRows(speed, env(1, { 118: 119 })).find((r) => r.pid === 122);
    expect(row.locked).toBe(true);
    expect(row.needLevel).toBe(2);
    const row2 = listRows(speed, env(2, { 118: 119 })).find((r) => r.pid === 122);
    expect(row2.locked).toBe(false);
  });

  it('marks a value that differs from its default', () => {
    expect(listRows(speed, env(2, { 118: 119 })).find((r) => r.pid === 122).changed).toBe(false);
    expect(listRows(speed, env(2, { 118: 119, 122: 45 })).find((r) => r.pid === 122).changed).toBe(
      true,
    );
  });

  it('renders group headers and planned placeholders in tree order', () => {
    const info = listRows(find(tree, 'info'), env(3));
    expect(info[0]).toEqual({ kind: 'header', label: 'Information' });
    expect(info.some((r) => r.kind === 'row')).toBe(true);
  });

  it('knows which parameters decide the visibility of the rows', () => {
    expect([...conditionIds(speed, (id) => byId.get(Number(id)))]).toEqual([118]);
  });

  it('every list screen has readable rows at level 4; only Country Settings needs level 4', () => {
    expect(lists.length).toBe(21);
    for (const node of lists) expect(pids(listRows(node, env(4))).length).toBeGreaterThan(0);
    const emptyAt3 = lists.filter((n) => pids(listRows(n, env(3))).length === 0).map((n) => n.id);
    expect(emptyAt3).toEqual(['cracountry']);
  });
});
