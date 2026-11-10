// Formats (P3-02 … P3-04): seed, differences, load, overwrite, create, duplicate names
import { describe, it, expect } from 'vitest';
import { createStore } from '../../src/core/store.js';
import {
  formatParamIds,
  seedFormats,
  differences,
  sortedFormats,
  findByName,
  loadFormat,
  overwriteFormat,
  createFormat,
} from '../../src/core/formats.js';
import params from '../../src/data/params.json';
import seed from '../../src/data/seed/formats.json';

const initial = Object.fromEntries(params.map((p) => [String(p.id), p.value ?? p.default ?? null]));
const ids = formatParamIds(params);

const setup = () => {
  const { formats, loaded } = seedFormats(seed, params, initial);
  const store = createStore({
    params: { ...initial },
    formats,
    settings: { loadedFormat: loaded },
  });
  return { store, formats, loaded };
};

describe('formats', () => {
  it('a format holds every format-relevant parameter and only those', () => {
    const { formats } = setup();
    expect(ids.length).toBeGreaterThan(50);
    for (const f of formats) expect(Object.keys(f.values).sort()).toEqual([...ids].sort());
    expect(ids).toContain('117');
    expect(ids).not.toContain('600'); // device name is not production data
  });

  it('the seeded loaded format matches the factory values; others differ by their changes', () => {
    const { store, formats, loaded } = setup();
    expect(loaded).toBe('f-standard');
    expect(
      differences(
        store,
        formats.find((f) => f.id === 'f-standard'),
        ids,
      ),
    ).toEqual([]);
    expect(
      differences(
        store,
        formats.find((f) => f.id === 'f-pharma'),
        ids,
      ).sort(),
    ).toEqual(['117', '122', '144']);
  });

  it('newest first; names match regardless of case and spaces', () => {
    const { formats } = setup();
    expect(sortedFormats(formats)[0].id).toBe('f-standard');
    expect(findByName(formats, '  test ROLL ')?.id).toBe('f-testroll');
    expect(findByName(formats, '')).toBeNull();
    expect(findByName(formats, 'Test rolls')).toBeNull();
  });

  it('load writes the values and marks the format loaded', () => {
    const { store } = setup();
    loadFormat(store, 'f-pharma');
    expect(store.getParam(117)).toBe(35);
    expect(store.get('settings').loadedFormat).toBe('f-pharma');
  });

  it('overwrite stores the live values with who and when', () => {
    const { store } = setup();
    store.setParam(117, 99);
    const now = new Date(2026, 10, 10, 9, 5, 0);
    const f = overwriteFormat(store, 'f-carton', ids, { by: 'a.supervisor', level: 2, now });
    expect(f.values['117']).toBe(99);
    expect(f.savedAt).toBe('2026-11-10T09:05:00');
    expect(f.by).toBe('a.supervisor');
    expect(differences(store, f, ids)).toEqual([]);
    expect(store.get('settings').loadedFormat).toBe('f-carton');
  });

  it('create adds a trimmed, free-form name ("1" is valid) and marks it loaded', () => {
    const { store } = setup();
    const f = createFormat(store, '  1 ', ids, { by: 'x', level: 2, now: new Date(2026, 0, 1) });
    expect(f.name).toBe('1');
    expect(store.get('formats')).toHaveLength(seed.formats.length + 1);
    expect(store.get('settings').loadedFormat).toBe(f.id);
  });
});
