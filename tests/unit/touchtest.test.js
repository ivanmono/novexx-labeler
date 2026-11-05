import { describe, it, expect } from 'vitest';
import {
  PX_PER_MM,
  accuracyTargets,
  shuffle,
  summarizeAccuracy,
  summarizeSizes,
  toPx,
} from '../../src/ui/dev/touchtest.js';

const touches = (fn) => accuracyTargets(480, 800).map((t) => ({ tx: t.x, ty: t.y, region: t.region, ...fn(t) }));

describe('touch test analysis', () => {
  it('uses 8.54 px/mm for the 4.3" 800 × 480 display', () => {
    expect(PX_PER_MM).toBeCloseTo(8.54, 2);
    expect(toPx(10)).toBe(85);
  });

  it('lays 9 targets out as 1 centre, 4 edges, 4 corners', () => {
    const t = accuracyTargets(800, 480);
    expect(t.filter((x) => x.region === 'centre')).toEqual([{ x: 400, y: 240, region: 'centre' }]);
    expect(t.filter((x) => x.region === 'edge')).toHaveLength(4);
    expect(t.filter((x) => x.region === 'corner')).toHaveLength(4);
  });

  it('shuffle keeps every item', () => {
    expect(shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('a consistent shift is a calibration fault', () => {
    const s = summarizeAccuracy(touches((t) => ({ x: t.x + 17, y: t.y })));
    expect(s.biasX).toBeCloseTo(2, 1);
    expect(s.verdict).toBe('offset');
  });

  it('error growing towards the corners is a scaling fault', () => {
    // touch range 6 % too large around the centre
    const s = summarizeAccuracy(touches((t) => ({ x: 240 + (t.x - 240) * 1.06, y: 400 + (t.y - 400) * 1.06 })));
    expect(s.bias).toBeLessThan(0.5);
    expect(s.corner).toBeGreaterThan(2.5);
    expect(s.verdict).toBe('scaling');
  });

  it('small error without direction means the panel is accurate', () => {
    const s = summarizeAccuracy(touches((t) => ({ x: t.x + (t.x % 2 ? 6 : -6), y: t.y + (t.y % 2 ? -5 : 5) })));
    expect(s.meanErr).toBeLessThanOrEqual(2);
    expect(s.verdict).toBe('accurate');
  });

  it('large error without direction is scatter', () => {
    let i = 0;
    const s = summarizeAccuracy(touches((t) => ({ x: t.x + [30, -30, 0, 0][i % 4], y: t.y + [0, 0, 30, -30][i++ % 4] })));
    expect(s.bias).toBeLessThan(1.5);
    expect(s.verdict).toBe('scatter');
  });

  it('sizes: the smallest safe size needs every larger size to be safe too', () => {
    const rows = (mm, hit, clicked = hit) => Array.from({ length: 6 }, () => ({ mm, hit, clicked, x: 0, y: 0, cx: 0, cy: 0 }));
    const s = summarizeSizes([...rows(5, false), ...rows(6, true), ...rows(7, true, false), ...rows(8, true), ...rows(10, true), ...rows(12, true)]);
    expect(s.rows.find((r) => r.mm === 7).lost).toBe(6);
    expect(s.smallestSafe).toBe(8);
  });
});
