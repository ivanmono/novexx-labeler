import { describe, it, expect } from 'vitest';
import { paginate, gateOpen, TILES_PER_PAGE } from '../../src/ui/screens/MenuScreen.js';
import tree from '../../src/data/menu-tree.json';

const menus = [];
(function walk(n) {
  if (n.kind === 'menu') menus.push(n);
  n.children?.forEach(walk);
})(tree);

describe('menu paging (docx §3.2: six tiles per page)', () => {
  it('splits into pages of six and clamps the page index', () => {
    const items = Array.from({ length: 14 }, (_, i) => i);
    expect(paginate(items, 0).items).toEqual([0, 1, 2, 3, 4, 5]);
    expect(paginate(items, 2).items).toEqual([12, 13]);
    expect(paginate(items, 2).pages).toBe(3);
    expect(paginate(items, 9).page).toBe(2);
    expect(paginate(items, -1).page).toBe(0);
    expect(paginate([], 0)).toEqual({ page: 0, pages: 1, items: [] });
  });

  it('no menu in the tree needs more than one page today', () => {
    for (const m of menus) expect(m.children.length).toBeLessThanOrEqual(TILES_PER_PAGE);
    expect(menus.length).toBe(16);
  });
});

describe('option gates (docx §5.4 disabled tiles)', () => {
  const env = (params, options) => ({ getParam: (id) => params[id], machine: { options } });
  it('a single Option_* parameter', () => {
    expect(gateOpen({ param: 146 }, env({ 146: true }, {}))).toBe(true);
    expect(gateOpen({ param: 146 }, env({ 146: false }, {}))).toBe(false);
  });
  it('any of several options (camera or code control)', () => {
    expect(gateOpen({ params: [177, 187] }, env({ 177: false, 187: true }, {}))).toBe(true);
    expect(gateOpen({ params: [177, 187] }, env({}, {}))).toBe(false);
  });
  it('a machine capability from seed/machine.json', () => {
    expect(gateOpen({ machine: 'busCard' }, env({}, { busCard: false }))).toBe(false);
    expect(gateOpen({ machine: 'rewinder' }, env({}, { rewinder: true }))).toBe(true);
    expect(gateOpen(undefined, env({}, {}))).toBe(true);
  });
});
