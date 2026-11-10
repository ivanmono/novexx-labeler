/**
 * Formats (docx §8.1–8.3, plan P3-02 … P3-04): named snapshots of the format-relevant parameters
 * (params.json `formatRelevant`, production related only). Stored in the `formats` slice (persisted,
 * a stand-in for the JSON files on the machine); the one the machine runs with is
 * `settings.loadedFormat`.
 *
 *   { id, name, savedAt (ISO), by (user name), level, values: { [paramId]: value } }
 *
 * Pure helpers take the store, so screens and tests share them.
 */

/** Ids of the format-relevant parameters. */
export function formatParamIds(params) {
  return params.filter((p) => p.formatRelevant).map((p) => String(p.id));
}

/** The live values of the format-relevant parameters. */
export function snapshot(store, ids) {
  return Object.fromEntries(ids.map((id) => [id, store.getParam(id) ?? null]));
}

/** Seed formats from data/seed/formats.json: factory values plus each seed's changes. */
export function seedFormats(seed, params, initialValues) {
  const ids = formatParamIds(params);
  const base = Object.fromEntries(ids.map((id) => [id, initialValues[id] ?? null]));
  const formats = seed.formats.map(({ changes = {}, loaded: _loaded, ...f }) => ({
    ...f,
    values: {
      ...base,
      ...Object.fromEntries(Object.entries(changes).filter(([id]) => id in base)),
    },
  }));
  const loaded = seed.formats.find((f) => f.loaded)?.id ?? null;
  return { formats, loaded };
}

/** Parameter ids whose live value differs from the format. */
export function differences(store, format, ids) {
  return ids.filter(
    (id) => id in (format?.values ?? {}) && !same(store.getParam(id), format.values[id]),
  );
}

const same = (a, b) => (a == null && b == null) || String(a) === String(b);

/** Newest first. */
export function sortedFormats(formats) {
  return [...formats].sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
}

const norm = (s) =>
  String(s ?? '')
    .trim()
    .toLocaleLowerCase();

/** The format with this name (case and surrounding spaces ignored), or null. */
export function findByName(formats, name) {
  const n = norm(name);
  return n ? (formats.find((f) => norm(f.name) === n) ?? null) : null;
}

/** Write a format's values into the live parameters and mark it loaded. */
export function loadFormat(store, id) {
  const f = store.get('formats').find((x) => x.id === id);
  if (!f) return null;
  store.batch(() => {
    store.setParams(f.values);
    store.set('settings', { loadedFormat: id });
  });
  return f;
}

/** Replace a format's values with the live ones (Modify Format). */
export function overwriteFormat(store, id, ids, { by = null, level = 0, now = new Date() } = {}) {
  let out = null;
  store.replace(
    'formats',
    store.get('formats').map((f) => {
      if (f.id !== id) return f;
      out = { ...f, values: snapshot(store, ids), savedAt: iso(now), by, level };
      return out;
    }),
  );
  if (out) store.set('settings', { loadedFormat: id }); // the live values are now this format
  return out;
}

/** Store the live values as a new format (Create New Format). Names are free-form (docx §8.3). */
export function createFormat(store, name, ids, { by = null, level = 0, now = new Date() } = {}) {
  const f = {
    id: `f-${now.getTime().toString(36)}`,
    name: String(name).trim(),
    savedAt: iso(now),
    by,
    level,
    values: snapshot(store, ids),
  };
  store.replace('formats', [...store.get('formats'), f]);
  store.set('settings', { loadedFormat: f.id });
  return f;
}

/** Local ISO without zone, as the seeds use. */
function iso(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
