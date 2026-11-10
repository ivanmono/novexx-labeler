/**
 * Load / Store Backup on a simulated USB drive (docx §8.9, plan P3-11). Pure helpers; the screen
 * and the store slice `usb` use them.
 *
 *   usb slice: { folders: { 'USB': Entry[], 'USB/backups': Entry[], … } }   (persisted)
 *   machine.usb: true while a drive is plugged in                            (live, simulator)
 *
 * Two file kinds, told apart by the extension:
 *   - Backup (`.bak`): everything — all parameter values plus the formats. Restores the same machine.
 *   - Format (`.fmt`): the parameter set only — the format-relevant parameters. Replicates a
 *     configuration onto another machine.
 * Anything else on the drive is shown greyed out (not a machine backup).
 */

export const USB_ROOT = 'USB';
export const KINDS = { backup: '.bak', format: '.fmt' };
export const NAME_MAX = 48;

/** Kind of a file by its extension, or null for a foreign file. */
export function kindOf(name) {
  const n = String(name).toLowerCase();
  return Object.keys(KINDS).find((k) => n.endsWith(KINDS[k])) ?? null;
}

/** File-name stem `<device>_<serial>_<yyyy-mm-dd>` (open point #48), safe for FAT drives. */
export function defaultBackupName({ device, serial, date = new Date() }) {
  const safe = (s) =>
    String(s ?? '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^A-Za-z0-9._-]/g, '')
      .replace(/-+/g, '-');
  const d = date instanceof Date ? date : new Date(date);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return [safe(device) || 'HMI', safe(serial).replace(/-/g, ''), iso].filter(Boolean).join('_').slice(0, NAME_MAX);
}

/** Characters a FAT file name cannot hold; the name field rejects them as you type. */
export const FORBIDDEN = /[\\/:*?"<>|]/;

/** Name check for the dialog: '' | 'empty' | 'chars'. */
export function validateName(stem) {
  const s = String(stem ?? '').trim();
  if (!s) return 'empty';
  if (FORBIDDEN.test(s)) return 'chars';
  return '';
}

const kb = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const dd = (d) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(2)}`;

/**
 * Snapshot for a new file.
 * @param {'backup'|'format'} kind
 * @param {{ params:Record<string,unknown>, formats?:unknown[], paramsMeta:{id:number, formatRelevant?:boolean, editable?:boolean}[] }} src
 */
export function makeSnapshot(kind, { params, formats = [], paramsMeta }) {
  const ids =
    kind === 'format'
      ? paramsMeta.filter((p) => p.formatRelevant).map((p) => String(p.id))
      : paramsMeta.filter((p) => p.editable !== false).map((p) => String(p.id));
  const values = Object.fromEntries(ids.filter((id) => id in params).map((id) => [id, params[id]]));
  return kind === 'format' ? { kind, params: values } : { kind, params: values, formats };
}

/** File entry for a snapshot (size from its JSON, padded like a real image). */
export function makeFile(stem, snapshot, { device, serial, date = new Date() } = {}) {
  const json = JSON.stringify(snapshot);
  const bytes = json.length * (snapshot.kind === 'format' ? 6 : 40);
  return {
    type: 'file',
    name: `${stem}${KINDS[snapshot.kind]}`,
    size: kb(bytes),
    date: dd(date instanceof Date ? date : new Date(date)),
    at: (date instanceof Date ? date : new Date(date)).getTime(),
    device,
    serial,
    data: snapshot,
  };
}

/** Entries of a folder for the browser: foreign files greyed out. */
export function listFolder(usb, path) {
  const entries = usb?.folders?.[path.join('/')] ?? [];
  return entries.map((e) =>
    e.type === 'folder'
      ? { type: 'folder', name: e.name }
      : { type: 'file', name: e.name, size: e.size, date: e.date, allowed: kindOf(e.name) != null },
  );
}

export function findFile(usb, path, name) {
  return (usb?.folders?.[path.join('/')] ?? []).find((e) => e.type === 'file' && e.name === name) ?? null;
}

/** New usb slice with the file written into `path` (replacing a file of the same name). */
export function writeFile(usb, path, file) {
  const key = path.join('/');
  const list = (usb.folders[key] ?? []).filter((e) => !(e.type === 'file' && e.name === file.name));
  return { ...usb, folders: { ...usb.folders, [key]: [...list, file] } };
}

/**
 * Parameter changes a snapshot makes against the current values (only ids the machine knows).
 * @returns {Record<string, unknown>}
 */
export function restoreDiff(snapshot, params) {
  const out = {};
  for (const [id, v] of Object.entries(snapshot?.params ?? {})) if (id in params && params[id] !== v) out[id] = v;
  return out;
}

/** The dummy drive: a backups folder with two backups and a format, firmware files, a foreign file. */
export function seedUsb({ params, formats, paramsMeta, device, serial }) {
  const day = (n) => new Date(Date.now() - n * 86_400_000);
  const older = { ...params, 117: 75, 122: 28 }; // an older backup: label length and fixed speed differ
  const file = (kind, stem, n, p = params) =>
    makeFile(stem, makeSnapshot(kind, { params: p, formats, paramsMeta }), { device, serial, date: day(n) });
  const stemOf = (n) => defaultBackupName({ device, serial, date: day(n) });
  return {
    folders: {
      USB: [
        { type: 'folder', name: 'backups' },
        { type: 'folder', name: 'firmware' },
        { type: 'file', name: 'readme.txt', size: '1 KB', date: dd(day(120)) },
      ],
      'USB/backups': [
        { type: 'folder', name: 'line-2' },
        file('backup', stemOf(90), 90, older),
        file('backup', stemOf(12), 12),
        file('format', 'bottle-330ml_template', 30),
        { type: 'file', name: 'label-layout.pdf', size: '240 KB', date: dd(day(40)) },
      ],
      'USB/backups/line-2': [file('backup', defaultBackupName({ device: 'Jakobs XLS 222', serial: 'SN 0988', date: day(200) }), 200)],
      'USB/firmware': [
        { type: 'file', name: 'XLS22x_v0.98.fw', size: '18.1 MB', date: dd(day(130)) },
        { type: 'file', name: 'XLS22x_v1.01.fw', size: '18.4 MB', date: dd(day(50)) },
      ],
    },
  };
}
