import { describe, it, expect } from 'vitest';
import {
  validateNumber,
  validateIp,
  validateText,
  snapToRange,
  stepFor,
} from '../../src/core/validate.js';

const fixedSpeed = { type: 'Float', min: 1, max: 60, default: 30 };
const standby = { type: 'Integer', min: 0, max: 60, default: 10 };

describe('numeric validation (docx §7.3: explained, not corrected)', () => {
  it('accepts values inside the range', () => {
    expect(validateNumber(fixedSpeed, '30')).toEqual({ ok: true, value: 30 });
    expect(validateNumber(fixedSpeed, '12.5')).toEqual({ ok: true, value: 12.5 });
    expect(validateNumber(standby, '0')).toEqual({ ok: true, value: 0 });
  });
  it('rejects out-of-range values with the side that was crossed', () => {
    expect(validateNumber(fixedSpeed, '61')).toEqual({ ok: false, error: 'max' });
    expect(validateNumber(fixedSpeed, '0.5')).toEqual({ ok: false, error: 'min' });
  });
  it('rejects decimals for integer parameters and empty or broken input', () => {
    expect(validateNumber(standby, '2.5')).toEqual({ ok: false, error: 'integer' });
    expect(validateNumber(standby, '')).toEqual({ ok: false, error: 'empty' });
    expect(validateNumber(standby, '-')).toEqual({ ok: false, error: 'empty' });
    expect(validateNumber(standby, '1.2.3')).toEqual({ ok: false, error: 'nan' });
  });
});

describe('slider steps', () => {
  it('uses the parameter step, else 0.5 for floats and 1 for integers', () => {
    expect(stepFor(fixedSpeed)).toBe(0.5);
    expect(stepFor(standby)).toBe(1);
    expect(stepFor({ ...standby, step: 5 })).toBe(5);
  });
  it('snaps and clamps', () => {
    expect(snapToRange(fixedSpeed, 12.3, 0.5)).toBe(12.5);
    expect(snapToRange(fixedSpeed, 99, 0.5)).toBe(60);
    expect(snapToRange(fixedSpeed, -4, 0.5)).toBe(1);
    expect(snapToRange(standby, 7.6, 1)).toBe(8);
  });
});

describe('text and IP', () => {
  it('validates dotted quads', () => {
    expect(validateIp('192.168.0.10')).toEqual({ ok: true, value: '192.168.0.10' });
    expect(validateIp('192.168.000.010')).toEqual({ ok: true, value: '192.168.0.10' });
    expect(validateIp('192.168.0')).toEqual({ ok: false, error: 'ip' });
    expect(validateIp('192.168.0.256')).toEqual({ ok: false, error: 'ip' });
  });
  it('trims text and applies the length limit (32 by default)', () => {
    expect(validateText({ max: null }, '  XLS 224 ')).toEqual({ ok: true, value: 'XLS 224' });
    expect(validateText({ max: null }, '')).toEqual({ ok: false, error: 'empty' });
    expect(validateText({ max: 5 }, 'abcdef')).toEqual({ ok: false, error: 'max' });
  });
});
