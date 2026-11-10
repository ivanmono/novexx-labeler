// Diagnosis recording (P3-08): FIFO area, on/off keeps the list, clear, duration, CSV
import { describe, it, expect } from 'vitest';
import {
  emptyDiag,
  appendDiag,
  setRecording,
  clearDiag,
  recordedFor,
  fmtDuration,
  toCsv,
} from '../../src/core/diag.js';

const e = (i) => ({ at: 1000 + i, type: 'param', detail: `#${i}`, level: 2, user: 'a' });

describe('diagnosis recording', () => {
  it('overwrites the oldest entries when full (FIFO)', () => {
    let d = emptyDiag();
    for (let i = 0; i < 7; i++) d = appendDiag(d, e(i), 5);
    expect(d.entries.map((x) => x.detail)).toEqual(['#2', '#3', '#4', '#5', '#6']);
  });

  it('switching off keeps the list and stops the clock; on again restarts it', () => {
    let d = setRecording(emptyDiag(), true, 0);
    d = appendDiag(d, e(1));
    d = setRecording(d, false, 120_000);
    expect(d.entries).toHaveLength(1);
    expect(recordedFor(d, 999_999)).toBe(120_000);
    d = setRecording(d, true, 500_000);
    expect(d).toMatchObject({ since: 500_000, stoppedAt: null });
    expect(d.entries).toHaveLength(1);
  });

  it('clear empties the area; a running recording goes on from now', () => {
    const d = clearDiag(appendDiag(setRecording(emptyDiag(), true, 0), e(1)), 60_000);
    expect(d).toEqual({ since: 60_000, stoppedAt: null, entries: [] });
    expect(clearDiag({ since: 0, stoppedAt: 5, entries: [e(1)] })).toEqual(emptyDiag());
  });

  it('duration text and CSV export', () => {
    expect(fmtDuration(30_000)).toBe('< 1 min');
    expect(fmtDuration(14 * 60_000)).toBe('14 min');
    expect(fmtDuration(134 * 60_000)).toBe('2 h 14 min');
    const csv = toCsv([{ ...e(1), detail: 'say "hi"' }]).split('\n');
    expect(csv[0]).toBe('time;type;level;user;detail');
    expect(csv[1]).toContain('"say ""hi"""');
  });
});
