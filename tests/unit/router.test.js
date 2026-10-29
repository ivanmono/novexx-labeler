import { describe, it, expect, vi } from 'vitest';
import { createRouter, MAX_STACK, parseRoute } from '../../src/core/router.js';

/** Minimal window stub: setting hash fires hashchange synchronously. */
function fakeWindow() {
  const listeners = [];
  const win = {
    location: { _hash: '', get hash() { return this._hash; }, set hash(v) { if (v !== this._hash) { this._hash = v; listeners.forEach((l) => l()); } } },
    addEventListener: (_t, l) => listeners.push(l),
  };
  return win;
}

describe('router back-stack', () => {
  it('starts at home and pushes on go()', () => {
    const win = fakeWindow();
    const onChange = vi.fn();
    const r = createRouter({ win, onChange }).start();
    expect(r.current).toBe('home');
    r.go('screen/root');
    r.go('screen/settings');
    expect(r.stack).toEqual(['home', 'screen/root', 'screen/settings']);
    expect(onChange).toHaveBeenLastCalledWith('screen/settings', 'screen/root', expect.objectContaining({ mode: 'push' }));
  });

  it('back returns to where the user came from, not to the tree parent', () => {
    const win = fakeWindow();
    const r = createRouter({ win }).start();
    r.go('screen/options'); // Settings › Machine › Options
    r.go('screen/pconnector');
    r.go('screen/digitalio'); // jumped via a cross-link
    r.back();
    expect(r.current).toBe('screen/pconnector');
    r.back();
    expect(r.current).toBe('screen/options');
    expect(r.stack).toEqual(['home', 'screen/options']);
  });

  it('back on an empty stack goes to the fallback', () => {
    const win = fakeWindow();
    const r = createRouter({ win }).start();
    r.back('home');
    expect(r.current).toBe('home');
    expect(r.canGoBack).toBe(false);
  });

  it('resolves refs to one route so refs do not duplicate screens', () => {
    const win = fakeWindow();
    const resolve = (route) => (route === 'screen/ref-start' ? 'screen/start' : route);
    const r = createRouter({ win, resolve }).start();
    r.go('screen/ref-start');
    expect(r.current).toBe('screen/start');
    r.go('screen/start'); // same screen again: no duplicate entry
    expect(r.stack).toEqual(['home', 'screen/start']);
  });

  it('replace and reset', () => {
    const win = fakeWindow();
    const r = createRouter({ win }).start();
    r.go('login');
    r.replace('screen/root');
    expect(r.stack).toEqual(['home', 'screen/root']);
    r.reset('home');
    expect(r.stack).toEqual(['home']);
  });

  it('caps the stack', () => {
    const win = fakeWindow();
    const r = createRouter({ win }).start();
    for (let i = 0; i < MAX_STACK + 10; i++) r.go(`screen/n${i}`);
    expect(r.stack.length).toBe(MAX_STACK);
  });

  it('parseRoute splits head and argument', () => {
    expect(parseRoute('screen/start')).toEqual({ head: 'screen', arg: 'start' });
    expect(parseRoute('home')).toEqual({ head: 'home', arg: null });
  });
});
