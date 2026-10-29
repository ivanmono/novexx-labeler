import { describe, it, expect } from 'vitest';
import { canReadParam, canWriteParam, writeLevel, canOpenNode, canActNode, grantableLevels } from '../../src/core/access.js';
import params from '../../src/data/params.json';
import tree from '../../src/data/menu-tree.json';

const byId = new Map(params.map((p) => [p.id, p]));
const find = (n, id) => (n.id === id ? n : (n.children ?? []).map((c) => find(c, id)).find(Boolean));

describe('parameter access', () => {
  it('read gating per level (SpeedFixed R1/W2, Resolution R2/W2, Acc_Ramp R3/W3)', () => {
    expect(canReadParam(byId.get(122), 0)).toBe(false);
    expect(canReadParam(byId.get(122), 1)).toBe(true);
    expect(canReadParam(byId.get(125), 1)).toBe(false);
    expect(canReadParam(byId.get(125), 2)).toBe(true);
    expect(canReadParam(byId.get(131), 2)).toBe(false);
    expect(canReadParam(byId.get(131), 3)).toBe(true);
  });

  it('write gating: readable but locked shows as not writable', () => {
    expect(canWriteParam(byId.get(122), 1)).toBe(false);
    expect(canWriteParam(byId.get(122), 2)).toBe(true);
    expect(writeLevel(byId.get(122))).toBe(2);
  });

  it('runtime and read-only params are never writable, runtime never readable in lists', () => {
    expect(canReadParam(byId.get(1), 4)).toBe(false); // Alarm_Reset R X
    expect(canWriteParam(byId.get(702), 4)).toBe(false); // SW_Version W X
    expect(writeLevel(byId.get(702))).toBeNull();
  });

  it('level-4 rows (password policy 619–627) need level 4 to write', () => {
    expect(canWriteParam(byId.get(621), 3)).toBe(false);
    expect(canWriteParam(byId.get(621), 4)).toBe(true);
  });
});

describe('node access', () => {
  it('level 0 opens nothing except Secure Code', () => {
    expect(canOpenNode(find(tree, 'settings'), 0, byId)).toBe(false);
    expect(canOpenNode(find(tree, 'securecode'), 0, byId)).toBe(true);
  });
  it('explicit mask levels from the docx', () => {
    expect(canOpenNode(find(tree, 'reporting'), 2, byId)).toBe(false);
    expect(canOpenNode(find(tree, 'reporting'), 3, byId)).toBe(true);
    expect(canOpenNode(find(tree, 'diaglogs'), 1, byId)).toBe(false);
    expect(canActNode(find(tree, 'iotest'), 1)).toBe(false);
    expect(canActNode(find(tree, 'iotest'), 3)).toBe(true);
  });
  it('a list whose rows are all above the level is closed', () => {
    expect(canOpenNode(find(tree, 'usersettings'), 2, byId)).toBe(false);
    expect(canOpenNode(find(tree, 'usersettings'), 3, byId)).toBe(true);
    expect(canOpenNode(find(tree, 'speed'), 1, byId)).toBe(true);
  });
  it('grantable levels never include 4 and never exceed the creator', () => {
    expect(grantableLevels(3)).toEqual([1, 2, 3]);
    expect(grantableLevels(4)).toEqual([1, 2, 3]);
    expect(grantableLevels(1)).toEqual([1]);
  });
});
