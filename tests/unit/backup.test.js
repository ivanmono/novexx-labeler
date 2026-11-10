import { describe, it, expect } from 'vitest';
import {
  kindOf,
  defaultBackupName,
  validateName,
  makeSnapshot,
  makeFile,
  listFolder,
  writeFile,
  findFile,
  restoreDiff,
  seedUsb,
} from '../../src/core/backup.js';

const meta = [
  { id: 1, formatRelevant: true },
  { id: 2, formatRelevant: false },
  { id: 3, formatRelevant: false, editable: false },
];
const params = { 1: 10, 2: 'a', 3: 'ro' };

describe('backup core (P3-11)', () => {
  it('tells backups and formats from foreign files by extension', () => {
    expect(kindOf('x.bak')).toBe('backup');
    expect(kindOf('X.FMT')).toBe('format');
    expect(kindOf('readme.txt')).toBeNull();
  });

  it('names a file <device>_<serial>_<yyyy-mm-dd>, safe for FAT', () => {
    expect(defaultBackupName({ device: 'Jakobs XLS 224', serial: 'SN 1043', date: new Date(2026, 10, 10) })).toBe(
      'Jakobs-XLS-224_SN1043_2026-11-10',
    );
    expect(defaultBackupName({ device: 'a/b:c', serial: '', date: new Date(2026, 0, 2) })).toBe('abc_2026-01-02');
  });

  it('validates names', () => {
    expect(validateName('')).toBe('empty');
    expect(validateName('a?b')).toBe('chars');
    expect(validateName('line1')).toBe('');
  });

  it('a backup holds every editable parameter and the formats; a format only the format parameters', () => {
    const b = makeSnapshot('backup', { params, formats: [{ id: 'f' }], paramsMeta: meta });
    expect(Object.keys(b.params)).toEqual(['1', '2']);
    expect(b.formats).toHaveLength(1);
    const f = makeSnapshot('format', { params, formats: [{ id: 'f' }], paramsMeta: meta });
    expect(Object.keys(f.params)).toEqual(['1']);
    expect(f.formats).toBeUndefined();
  });

  it('writes, replaces and lists files; foreign files are not allowed', () => {
    let usb = { folders: { USB: [{ type: 'file', name: 'readme.txt' }] } };
    const file = makeFile('n', makeSnapshot('format', { params, paramsMeta: meta }), { date: new Date(2026, 10, 10) });
    expect(file.name).toBe('n.fmt');
    expect(file.date).toBe('10.11.26');
    usb = writeFile(usb, ['USB'], file);
    usb = writeFile(usb, ['USB'], { ...file, size: 'changed' });
    expect(usb.folders.USB.filter((e) => e.name === 'n.fmt')).toHaveLength(1);
    expect(findFile(usb, ['USB'], 'n.fmt').size).toBe('changed');
    const list = listFolder(usb, ['USB']);
    expect(list.find((e) => e.name === 'readme.txt').allowed).toBe(false);
    expect(list.find((e) => e.name === 'n.fmt').allowed).toBe(true);
  });

  it('restoreDiff lists only changed, known parameters', () => {
    expect(restoreDiff({ params: { 1: 10, 2: 'b', 9: 1 } }, params)).toEqual({ 2: 'b' });
  });

  it('seeds a drive with backups, a format, firmware and foreign files', () => {
    const usb = seedUsb({ params: { ...params, 117: 80, 122: 30 }, formats: [], paramsMeta: meta, device: 'Jakobs XLS 224', serial: 'SN 1043' });
    expect(Object.keys(usb.folders)).toContain('USB/backups');
    const kinds = usb.folders['USB/backups'].map((e) => e.type === 'file' && kindOf(e.name));
    expect(kinds).toContain('backup');
    expect(kinds).toContain('format');
    expect(kinds).toContain(null);
  });
});
