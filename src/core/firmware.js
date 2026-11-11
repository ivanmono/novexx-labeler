/**
 * FW-Update (docx §8.10, plan P3-12): firmware files on the simulated USB drive (see backup.js).
 *
 *   - A firmware file is `*.fw`; its version comes from the entry (`version`) or the name (`_v1.02`).
 *   - Images are signed; secure boot verifies the signature. An entry with `signed: false` is
 *     rejected at the signature check; `damaged: true` fails while writing (previous version kept).
 *   - A downgrade is allowed (docx §8.10).
 */
export const FW_EXT = '.fw';

export const isFirmware = (name) => String(name).toLowerCase().endsWith(FW_EXT);

/** "XLS22x_v0.02.fw" → "0.02"; null when the name carries no version. */
export function parseVersion(name) {
  const m = String(name).match(/_v(\d+(?:\.\d+)+)/i);
  return m ? m[1] : null;
}

/** -1 / 0 / 1, numeric per dot-separated part ("0.10" > "0.9"). */
export function compareVersions(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

/** 'upgrade' | 'downgrade' | 'same' | 'unknown' for installing `selected` over `installed`. */
export function direction(installed, selected) {
  if (!selected) return 'unknown';
  const c = compareVersions(selected, installed);
  return c > 0 ? 'upgrade' : c < 0 ? 'downgrade' : 'same';
}

/** Browser entries: only firmware files can be picked. */
export function listFirmware(usb, path) {
  const entries = usb?.folders?.[path.join('/')] ?? [];
  return entries.map((e) =>
    e.type === 'folder'
      ? { type: 'folder', name: e.name }
      : { type: 'file', name: e.name, size: e.size, date: e.date, allowed: isFirmware(e.name) },
  );
}

/** The image info the screen needs, or null for a foreign file. */
export function firmwareInfo(entry) {
  if (!entry || entry.type !== 'file' || !isFirmware(entry.name)) return null;
  return {
    name: entry.name,
    version: entry.version ?? parseVersion(entry.name),
    date: entry.date ?? '',
    size: entry.size ?? '',
    signed: entry.signed !== false,
    damaged: !!entry.damaged,
  };
}

/** Phases of an install with the share of the bar each one takes. */
export const PHASES = [
  { key: 'signature', until: 0.15 },
  { key: 'copy', until: 0.55 },
  { key: 'write', until: 0.92 },
  { key: 'verify', until: 1 },
];
export const phaseAt = (p) => PHASES.find((ph) => p <= ph.until)?.key ?? 'verify';

/** Firmware folder of the dummy drive, relative to the installed version. */
export function seedFirmwareFolder(dd, day) {
  return {
    'USB/firmware': [
      { type: 'folder', name: 'archive' },
      { type: 'file', name: 'XLS22x_v0.02.fw', version: '0.02', size: '18.4 MB', date: dd(day(20)) },
      { type: 'file', name: 'XLS22x_v0.03-rc.fw', version: '0.03', size: '18.5 MB', date: dd(day(6)), signed: false },
      { type: 'file', name: 'release-notes.pdf', size: '240 KB', date: dd(day(20)) },
    ],
    'USB/firmware/archive': [
      { type: 'file', name: 'XLS22x_v0.00.fw', version: '0.00', size: '17.9 MB', date: dd(day(140)) },
      { type: 'file', name: 'XLS22x_v0.02_copy.fw', version: '0.02', size: '9.1 MB', date: dd(day(19)), damaged: true },
    ],
  };
}
