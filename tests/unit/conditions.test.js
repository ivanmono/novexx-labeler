import { describe, it, expect } from 'vitest';
import { parseCondition, evalCondition, isShown, conditionRefs } from '../../src/core/conditions.js';

const values = (obj) => (id) => obj[id];

describe('parseCondition', () => {
  it('returns null for empty', () => {
    expect(parseCondition(null)).toBeNull();
    expect(parseCondition('')).toBeNull();
    expect(parseCondition('  ')).toBeNull();
  });

  it('parses a single equality', () => {
    expect(parseCondition('{118=119}')).toEqual([[[{ id: '118', op: '=', value: '119' }]]]);
  });

  it('parses boolean, not-equal, greater and less atoms', () => {
    expect(parseCondition('{146}')).toEqual([[[{ id: '146', op: '', value: null }]]]);
    expect(parseCondition('{313!=314}')).toEqual([[[{ id: '313', op: '!=', value: '314' }]]]);
    expect(parseCondition('{173>1}')).toEqual([[[{ id: '173', op: '>', value: '1' }]]]);
    expect(parseCondition('{173<1}')).toEqual([[[{ id: '173', op: '<', value: '1' }]]]);
  });

  it('parses OR between groups and AND inside a term', () => {
    const p = parseCondition('{303=305}&{307=309};{255=257}&{307=309}');
    expect(p).toHaveLength(2); // two OR terms
    expect(p[0]).toHaveLength(2); // each with two AND groups
  });

  it('parses OR inside a brace group', () => {
    const p = parseCondition('{148=149;148=150}&{146}');
    expect(p).toHaveLength(1);
    expect(p[0]).toHaveLength(2);
    expect(p[0][0]).toHaveLength(2);
  });

  it('throws on malformed input', () => {
    expect(() => parseCondition('118=119')).toThrow(SyntaxError);
    expect(() => parseCondition('{abc}')).toThrow(SyntaxError);
  });
});

describe('evalCondition', () => {
  it('no condition is always shown', () => {
    expect(evalCondition(null, values({}))).toBe(true);
  });

  it('equality compares as strings (option ids may be numbers or strings)', () => {
    expect(isShown('{118=119}', values({ 118: 119 }))).toBe(true);
    expect(isShown('{118=119}', values({ 118: '119' }))).toBe(true);
    expect(isShown('{118=119}', values({ 118: 120 }))).toBe(false);
  });

  it('boolean atom accepts true / 1', () => {
    expect(isShown('{146}', values({ 146: true }))).toBe(true);
    expect(isShown('{146}', values({ 146: 1 }))).toBe(true);
    expect(isShown('{146}', values({ 146: false }))).toBe(false);
    expect(isShown('{146}', values({}))).toBe(false);
  });

  it('not-equal works (clickdummy bug 1)', () => {
    expect(isShown('{303=305}&{313!=314}', values({ 303: 305, 313: 100 }))).toBe(true);
    expect(isShown('{303=305}&{313!=314}', values({ 303: 305, 313: 314 }))).toBe(false);
  });

  it('precedence: (A&B);(C&B) (clickdummy bug 2)', () => {
    const c = '{303=305}&{307=309};{255=257}&{307=309}';
    expect(isShown(c, values({ 303: 305, 307: 309, 255: 0 }))).toBe(true); // A&B
    expect(isShown(c, values({ 303: 0, 307: 309, 255: 257 }))).toBe(true); // C&B
    expect(isShown(c, values({ 303: 305, 307: 0, 255: 257 }))).toBe(false); // B false
    expect(isShown(c, values({ 303: 0, 307: 309, 255: 0 }))).toBe(false); // neither A nor C
  });

  it('OR inside a group combined with AND', () => {
    const c = '{148=149;148=150}&{146}';
    expect(isShown(c, values({ 148: 149, 146: true }))).toBe(true);
    expect(isShown(c, values({ 148: 150, 146: true }))).toBe(true);
    expect(isShown(c, values({ 148: 151, 146: true }))).toBe(false);
    expect(isShown(c, values({ 148: 149, 146: false }))).toBe(false);
  });

  it('greater-than compares numerically', () => {
    expect(isShown('{173>1}', values({ 173: 2 }))).toBe(true);
    expect(isShown('{173>1}', values({ 173: '10' }))).toBe(true);
    expect(isShown('{173>1}', values({ 173: 1 }))).toBe(false);
  });
});

describe('conditionRefs', () => {
  it('lists referenced parameter ids once', () => {
    expect(conditionRefs(parseCondition('{303=305}&{307=309};{255=257}&{307=309}')).sort()).toEqual([
      '255',
      '303',
      '307',
    ]);
  });
});
