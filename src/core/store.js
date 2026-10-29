/**
 * Minimal reactive store (ADR-4: targeted re-render).
 *
 * State is a plain object of slices. `set(slice, patch)` shallow-merges a slice and notifies
 * subscribers whose selected value changed (Object.is). Parameter values live in `params`
 * (id → value) and have their own per-id listeners so a ParamRow can patch itself without
 * the whole screen re-rendering.
 *
 *   const store = createStore({ machine: { state: 'offline' }, params: {} });
 *   store.subscribe(s => s.machine.state, (state) => ...);
 *   store.onParam(122, (value, prev) => ...);
 *   store.setParam(122, 35);
 */
export function createStore(initial = {}) {
  let state = structuredCloneSafe(initial);
  const subs = new Set(); // { select, fn, last }
  const paramSubs = new Map(); // id → Set<fn>
  const anyParamSubs = new Set();
  let depth = 0;
  let dirty = false;

  function notify() {
    if (depth > 0) {
      dirty = true;
      return;
    }
    for (const s of [...subs]) {
      let next;
      try {
        next = s.select(state);
      } catch {
        continue;
      }
      if (!Object.is(next, s.last)) {
        const prev = s.last;
        s.last = next;
        s.fn(next, prev, state);
      }
    }
  }

  const store = {
    get state() {
      return state;
    },
    get(slice) {
      return slice ? state[slice] : state;
    },
    /** Shallow-merge a patch into one slice. */
    set(slice, patch) {
      const cur = state[slice] ?? {};
      const next = typeof patch === 'function' ? patch(cur) : { ...cur, ...patch };
      if (next === cur) return;
      state = { ...state, [slice]: next };
      notify();
    },
    /** Replace a whole slice. */
    replace(slice, value) {
      state = { ...state, [slice]: value };
      notify();
    },
    /** Run several sets with one notification pass. */
    batch(fn) {
      depth++;
      try {
        fn(store);
      } finally {
        depth--;
      }
      if (depth === 0 && dirty) {
        dirty = false;
        notify();
      }
    },
    /** Subscribe to a selected value. Returns unsubscribe. */
    subscribe(select, fn, { immediate = false } = {}) {
      const s = { select, fn, last: select(state) };
      subs.add(s);
      if (immediate) fn(s.last, undefined, state);
      return () => subs.delete(s);
    },

    // ---- parameters -------------------------------------------------------
    getParam(id) {
      return state.params?.[String(id)];
    },
    setParam(id, value, meta = {}) {
      const key = String(id);
      const prev = state.params?.[key];
      if (Object.is(prev, value)) return false;
      state = { ...state, params: { ...state.params, [key]: value } };
      for (const fn of paramSubs.get(key) ?? []) fn(value, prev, key);
      for (const fn of anyParamSubs) fn(key, value, prev, meta);
      notify();
      return true;
    },
    setParams(entries) {
      store.batch(() => {
        for (const [id, v] of Object.entries(entries)) store.setParam(id, v);
      });
    },
    onParam(id, fn) {
      const key = String(id);
      if (!paramSubs.has(key)) paramSubs.set(key, new Set());
      paramSubs.get(key).add(fn);
      return () => paramSubs.get(key)?.delete(fn);
    },
    onAnyParam(fn) {
      anyParamSubs.add(fn);
      return () => anyParamSubs.delete(fn);
    },
  };
  return store;
}

function structuredCloneSafe(v) {
  return typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v));
}
