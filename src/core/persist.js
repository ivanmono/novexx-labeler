/**
 * localStorage persistence for the dummy data (plan P1-01).
 * Persisted slices: params (values only), users, formats, logs, favourites, machine counters.
 * Not persisted: session (fresh boot = level 0), ui, live machine state.
 */
const KEY = 'novexx-hmi';
const VERSION = 1;
const PERSISTED = ['params', 'users', 'formats', 'logs', 'diag', 'errorlog', 'favourites', 'counters', 'settings'];

let storage = null;
try {
  storage = globalThis.localStorage ?? null;
} catch {
  storage = null;
}

export function loadSnapshot() {
  if (!storage) return null;
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw);
    if (snap.version !== VERSION) return null;
    return snap.data;
  } catch {
    return null;
  }
}

export function saveSnapshot(state) {
  if (!storage) return;
  const data = {};
  for (const k of PERSISTED) if (state[k] !== undefined) data[k] = state[k];
  try {
    storage.setItem(KEY, JSON.stringify({ version: VERSION, savedAt: Date.now(), data }));
  } catch {
    /* quota or private mode: ignore, the app keeps working in memory */
  }
}

/** Debounced auto-save wired to the store. Returns a stop function. */
export function autoSave(store, delay = 300) {
  let timer = null;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => saveSnapshot(store.state), delay);
  };
  const unsubs = PERSISTED.map((slice) => store.subscribe((s) => s[slice], schedule));
  return () => {
    clearTimeout(timer);
    unsubs.forEach((u) => u());
  };
}

export function factoryReset() {
  try {
    storage?.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export const persistedSlices = PERSISTED;
