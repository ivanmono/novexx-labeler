import { describe, it, expect } from 'vitest';
import { modifiedIds } from '../../src/ui/screens/service/UserModified.js';

const p = (id, extra) => ({ id, default: 10, control: 'number', editable: true, accessWrite: 2, ...extra });

describe('user modified parameters (P3-13)', () => {
  it('lists settable parameters that differ from their default, in ParamID order', () => {
    const params = [
      p(5),
      p(2),
      p(3, { control: 'display' }), // live value, never "modified"
      p(4, { accessWrite: 'X' }), // not writable
      p(6, { default: null }), // no default to compare with
      p(7, { control: 'action' }),
      p(8, { default: '10' }), // compared as text: 10 equals "10"
    ];
    const values = { 2: 11, 3: 99, 4: 99, 5: 12, 6: 1, 7: 1, 8: 10 };
    expect(modifiedIds(params, (id) => values[id])).toEqual([2, 5]);
  });
});
