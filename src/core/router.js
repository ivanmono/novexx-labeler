/**
 * Hash router with an explicit back-stack (docx §6.2: "Back always returns to the screen the
 * user came from, not to the position of the current screen in the tree").
 *
 * Routes are plain strings such as `home`, `screen/start`, `login`, `styleguide`.
 * `ref` tree nodes resolve to their target so a screen reachable from two places is one route.
 */
export const MAX_STACK = 40;

export function createRouter({ resolve = (r) => r, onChange, win = globalThis.window } = {}) {
  const stack = [];
  let pending = null; // 'push' | 'pop' | 'replace'
  let current = null;

  const read = () => decodeURIComponent((win?.location?.hash ?? '').replace(/^#\/?/, '')) || 'home';
  const write = (route) => {
    if (!win) return apply(route);
    const hash = '#/' + route;
    if (win.location.hash === hash) apply(route);
    else win.location.hash = hash;
  };

  function apply(raw) {
    const route = resolve(raw);
    const mode = pending ?? (stack.length ? 'push' : 'init');
    pending = null;
    if (mode === 'pop') {
      stack.pop();
      if (stack[stack.length - 1] !== route) stack.push(route);
    } else if (mode === 'replace') {
      stack[stack.length - 1] = route;
    } else if (stack[stack.length - 1] !== route) {
      stack.push(route);
      if (stack.length > MAX_STACK) stack.shift();
    }
    const prev = current;
    current = route;
    onChange?.(route, prev, { mode, depth: stack.length });
  }

  const router = {
    get current() {
      return current;
    },
    get stack() {
      return [...stack];
    },
    get canGoBack() {
      return stack.length > 1;
    },
    start() {
      win?.addEventListener('hashchange', () => apply(read()));
      apply(read());
      return router;
    },
    go(route) {
      pending = 'push';
      write(route);
    },
    replace(route) {
      pending = 'replace';
      write(route);
    },
    /** Pop to the previous screen; falls back to `fallback` when the stack is empty. */
    back(fallback = 'home') {
      if (stack.length > 1) {
        pending = 'pop';
        write(stack[stack.length - 2]);
      } else {
        pending = 'replace';
        write(fallback);
      }
    },
    /** Clear history and go to a route (used after login/logout and by the menu button). */
    reset(route = 'home') {
      stack.length = 0;
      pending = 'push';
      write(route);
    },
    /** Internal: used by tests without a window. */
    _apply: apply,
  };
  return router;
}

/** Build `screen/<id>` and parse it back. */
export const toScreenRoute = (nodeId) => `screen/${nodeId}`;
export function parseRoute(route) {
  const [head, ...rest] = route.split('/');
  return { head, arg: rest.join('/') || null };
}
