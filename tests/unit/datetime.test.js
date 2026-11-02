import { describe, it, expect } from 'vitest';
import { parseTime, formatTime, parseDate, formatDate, validateDate } from '../../src/core/validate.js';
import { pickerValue, stepField } from '../../src/ui/components/DateTimePicker.js';

// Info_Time 700 / Info_Date 701 as in params.json
const time = { control: 'time', min: '00:00:00', max: '23:59:00', default: '16:20:00' };
const date = { control: 'date', min: '1.1.2027', max: '31.12.2099', default: '01.01.2027' };

describe('time and date strings (P2-13)', () => {
  it('parses and formats the stored forms', () => {
    expect(parseTime('16:20:00')).toEqual({ h: 16, m: 20 });
    expect(parseTime('7:05')).toEqual({ h: 7, m: 5 });
    expect(parseTime('noon')).toBeNull();
    expect(formatTime({ h: 7, m: 5 })).toBe('07:05:00');
    expect(parseDate('1.1.2027')).toEqual({ d: 1, m: 1, y: 2027 });
    expect(parseDate('2027-01-01')).toBeNull();
    expect(formatDate({ d: 1, m: 1, y: 2027 })).toBe('01.01.2027');
  });
  it('explains a day that does not exist instead of moving it', () => {
    expect(validateDate(date, { d: 31, m: 2, y: 2027 })).toEqual({ ok: false, error: 'day' });
    expect(validateDate(date, { d: 29, m: 2, y: 2027 })).toEqual({ ok: false, error: 'day' });
    expect(validateDate(date, { d: 29, m: 2, y: 2028 })).toEqual({ ok: true, value: '29.02.2028' });
  });
  it('checks the parameter range', () => {
    expect(validateDate(date, { d: 31, m: 12, y: 2026 })).toEqual({ ok: false, error: 'min' });
    expect(validateDate(date, { d: 1, m: 1, y: 2100 })).toEqual({ ok: false, error: 'max' });
    expect(validateDate(date, { d: 31, m: 12, y: 2099 }).ok).toBe(true);
  });
});

describe('picker steppers', () => {
  it('starts from the stored value, else the default', () => {
    expect(pickerValue(time, '08:15:00')).toEqual({ h: 8, m: 15 });
    expect(pickerValue(time, '')).toEqual({ h: 16, m: 20 });
    expect(pickerValue(date, null)).toEqual({ d: 1, m: 1, y: 2027 });
  });
  it('wraps hours, minutes, day and month', () => {
    expect(stepField(time, { h: 23, m: 59 }, 'm', 1)).toEqual({ h: 23, m: 0 });
    expect(stepField(time, { h: 0, m: 0 }, 'h', -1)).toEqual({ h: 23, m: 0 });
    expect(stepField(date, { d: 31, m: 12, y: 2030 }, 'd', 1)).toEqual({ d: 1, m: 12, y: 2030 });
    expect(stepField(date, { d: 1, m: 1, y: 2030 }, 'm', -1)).toEqual({ d: 1, m: 12, y: 2030 });
  });
  it('stops the year at the range', () => {
    expect(stepField(date, { d: 1, m: 1, y: 2027 }, 'y', -1).y).toBe(2027);
    expect(stepField(date, { d: 1, m: 1, y: 2099 }, 'y', 1).y).toBe(2099);
  });
});
