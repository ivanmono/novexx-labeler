// Error history (P3-09): FIFO, newest first, search from 2 chars over ID and text, languages, seed
import { describe, it, expect } from 'vitest';
import { appendError, searchErrors, errorText, seedErrors } from '../../src/core/errorlog.js';

const e = (code, at) => ({ code, severity: 'high', at, level: 1, user: 'x' });

describe('error history', () => {
  it('keeps the newest entries when full (FIFO)', () => {
    let l = [];
    for (let i = 0; i < 6; i++) l = appendError(l, e('E-114', i), 4);
    expect(l.map((x) => x.at)).toEqual([2, 3, 4, 5]);
  });

  it('newest first; one character does not filter yet', () => {
    const l = [e('E-114', 1), e('E-207', 3), e('W-020', 2)];
    expect(searchErrors(l, '').map((x) => x.at)).toEqual([3, 2, 1]);
    expect(searchErrors(l, 'w')).toHaveLength(3);
  });

  it('filters over ID (with or without hyphen) and message, in the language shown', () => {
    const l = [e('E-114', 1), e('E-207', 3), e('W-020', 2)];
    expect(searchErrors(l, 'e2').map((x) => x.code)).toEqual(['E-207']);
    expect(searchErrors(l, 'E-20').map((x) => x.code)).toEqual(['E-207']);
    expect(searchErrors(l, 'roll').map((x) => x.code)).toEqual(['E-114']);
    expect(searchErrors(l, 'rolle', 'de').map((x) => x.code)).toEqual(['E-114']);
    expect(searchErrors(l, 'zz')).toEqual([]);
  });

  it('texts and help per language; unknown codes fall back to the code', () => {
    expect(errorText('E-114').help).toContain('new roll');
    expect(errorText('E-114', 'de').text).toBe('Etikettenrolle leer');
    expect(errorText('X-1')).toEqual({ text: 'X-1', help: '' });
  });

  it('seed: oldest first in storage, with roles', () => {
    const s = seedErrors(10 * 86_400_000 * 3);
    expect(s.length).toBeGreaterThan(5);
    expect(s.every((x, i) => i === 0 || s[i - 1].at <= x.at)).toBe(true);
    expect(s.some((x) => x.level === 0 && x.user === null)).toBe(true);
  });
});
