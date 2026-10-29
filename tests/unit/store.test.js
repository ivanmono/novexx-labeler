import { describe, it, expect, vi } from 'vitest';
import { createStore } from '../../src/core/store.js';

describe('store', () => {
  it('shallow-merges a slice and notifies changed selectors only', () => {
    const s = createStore({ machine: { state: 'online', x: 1 }, ui: { lang: 'en' } });
    const onState = vi.fn();
    const onLang = vi.fn();
    s.subscribe((st) => st.machine.state, onState);
    s.subscribe((st) => st.ui.lang, onLang);
    s.set('machine', { state: 'run' });
    expect(onState).toHaveBeenCalledWith('run', 'online', expect.anything());
    expect(onLang).not.toHaveBeenCalled();
    expect(s.get('machine')).toEqual({ state: 'run', x: 1 });
  });

  it('param listeners fire per id and globally, not on equal values', () => {
    const s = createStore({ params: { 122: 30 } });
    const one = vi.fn();
    const any = vi.fn();
    s.onParam(122, one);
    s.onAnyParam(any);
    expect(s.setParam(122, 30)).toBe(false);
    expect(one).not.toHaveBeenCalled();
    expect(s.setParam(122, 35)).toBe(true);
    expect(one).toHaveBeenCalledWith(35, 30, '122');
    expect(any).toHaveBeenCalledWith('122', 35, 30, {});
    expect(s.getParam('122')).toBe(35);
  });

  it('batch notifies once', () => {
    const s = createStore({ a: { n: 0 } });
    const fn = vi.fn();
    s.subscribe((st) => st.a.n, fn);
    s.batch(() => {
      s.set('a', { n: 1 });
      s.set('a', { n: 2 });
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(2, 0, expect.anything());
  });

  it('immediate subscription and unsubscribe', () => {
    const s = createStore({ a: { n: 0 } });
    const fn = vi.fn();
    const off = s.subscribe((st) => st.a.n, fn, { immediate: true });
    expect(fn).toHaveBeenCalledWith(0, undefined, expect.anything());
    off();
    s.set('a', { n: 5 });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
