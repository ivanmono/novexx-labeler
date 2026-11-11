import { describe, it, expect } from 'vitest';
import {
  isFirmware,
  parseVersion,
  compareVersions,
  direction,
  listFirmware,
  firmwareInfo,
  phaseAt,
  seedFirmwareFolder,
} from '../../src/core/firmware.js';

describe('firmware core (P3-12)', () => {
  it('recognises firmware files and reads the version from the name', () => {
    expect(isFirmware('XLS22x_v0.02.fw')).toBe(true);
    expect(isFirmware('notes.pdf')).toBe(false);
    expect(parseVersion('XLS22x_v1.02.fw')).toBe('1.02');
    expect(parseVersion('XLS22x_v0.03-rc.fw')).toBe('0.03');
    expect(parseVersion('firmware.fw')).toBeNull();
  });

  it('compares versions numerically per part', () => {
    expect(compareVersions('0.10', '0.9')).toBe(1);
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
    expect(compareVersions('0.01', '0.02')).toBe(-1);
  });

  it('names the step: upgrade, downgrade (allowed), same, unknown', () => {
    expect(direction('0.01', '0.02')).toBe('upgrade');
    expect(direction('0.01', '0.00')).toBe('downgrade');
    expect(direction('0.01', '0.01')).toBe('same');
    expect(direction('0.01', null)).toBe('unknown');
  });

  it('lists only firmware files as selectable and carries signature / damage flags', () => {
    const dd = () => '01.01.26';
    const day = () => new Date();
    const usb = { folders: seedFirmwareFolder(dd, day) };
    const list = listFirmware(usb, ['USB', 'firmware']);
    expect(list.find((e) => e.name === 'release-notes.pdf').allowed).toBe(false);
    expect(list.find((e) => e.name === 'XLS22x_v0.02.fw').allowed).toBe(true);
    const rc = firmwareInfo(usb.folders['USB/firmware'].find((e) => e.name === 'XLS22x_v0.03-rc.fw'));
    expect(rc).toMatchObject({ version: '0.03', signed: false, damaged: false });
    const copy = firmwareInfo(usb.folders['USB/firmware/archive'].find((e) => e.damaged));
    expect(copy.damaged).toBe(true);
    expect(firmwareInfo({ type: 'file', name: 'x.pdf' })).toBeNull();
  });

  it('maps progress to the install phases', () => {
    expect(phaseAt(0.1)).toBe('signature');
    expect(phaseAt(0.5)).toBe('copy');
    expect(phaseAt(0.8)).toBe('write');
    expect(phaseAt(1)).toBe('verify');
  });
});
