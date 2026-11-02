import { describe, it, expect } from 'vitest';
import { helpFor, placeholderLength } from '../../src/core/help.js';
import params from '../../src/data/params.json';

describe('help placeholders (docx §7.1: title ≤ 40, body up to 600, longer scrolls)', () => {
  it('cuts long titles at 40 characters', () => {
    const p = params.find((x) => x.id === 122);
    expect(helpFor(p, 'Fixed Speed').title).toBe('Fixed Speed');
    const long = helpFor(p, 'A very long parameter label that goes on and on');
    expect(long.title.length).toBe(40);
    expect(long.title.endsWith('…')).toBe(true);
  });

  it('starts the body with the facts and reaches a length that varies per parameter', () => {
    const p = params.find((x) => x.id === 122);
    const { body } = helpFor(p, 'Fixed Speed');
    expect(
      body.startsWith('Range 1 – 60 m/min · Default 30 · Read from level 1, change from level 2'),
    ).toBe(true);
    expect(Math.abs(body.length - placeholderLength(122))).toBeLessThan(40);
    const lengths = params.slice(0, 60).map((x) => placeholderLength(x.id));
    expect(Math.min(...lengths)).toBeGreaterThanOrEqual(120);
    expect(Math.max(...lengths)).toBeGreaterThan(600); // the scrolling case exists
  });
});
