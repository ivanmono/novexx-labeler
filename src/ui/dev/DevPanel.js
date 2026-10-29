/**
 * Dev panel (not part of the product UI). Toggle with Ctrl+Shift+D or the ⚙ corner tab.
 * Lets you set theme, orientation and language while the app runs; Playwright sets the
 * same things through `window.__hmi` (see src/main.js). Later phases add level, machine
 * state, error injection and factory reset (plan P1-14).
 */
const ORIENTATIONS = [
  ['portrait', 'Portrait'],
  ['landscape-lh', 'Landscape LH'],
  ['landscape-rh', 'Landscape RH'],
  ['portrait-flipped', 'Portrait ↻180'],
  ['landscape-lh-flipped', 'LH ↻180'],
  ['landscape-rh-flipped', 'RH ↻180'],
];

export function mountDevPanel(api) {
  const root = document.createElement('div');
  root.id = 'dev-panel';
  root.innerHTML = `
    <button type="button" data-dev-toggle title="Dev panel (Ctrl+Shift+D)"
      style="position:fixed;right:0;top:40%;z-index:9999;background:#1d2028;color:#88e6c6;border:1px solid #505d75;border-right:0;border-radius:8px 0 0 8px;padding:6px 6px;font:600 11px system-ui;opacity:.6">DEV</button>
    <div data-dev-body hidden
      style="position:fixed;right:0;top:0;bottom:0;width:230px;z-index:9998;background:#1d2028;color:#eff6ff;border-left:1px solid #505d75;padding:12px;font:13px system-ui;overflow:auto">
      <div style="font-weight:700;margin-bottom:8px">Dev panel</div>
      <label style="display:block;margin:6px 0">Theme
        <select data-dev="theme" style="width:100%;color:#000"><option value="dark">dark</option><option value="light">light</option></select></label>
      <label style="display:block;margin:6px 0">Orientation
        <select data-dev="orientation" style="width:100%;color:#000">${ORIENTATIONS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>
      <label style="display:block;margin:6px 0">Language
        <select data-dev="lang" style="width:100%;color:#000"><option value="en">English</option><option value="de">Deutsch</option></select></label>
      <div style="margin-top:12px;color:#98a3b2">Viewport: <span data-dev-viewport></span></div>
      <div style="margin-top:12px"><a href="#/styleguide" style="color:#88e6c6">Styleguide</a> · <a href="#/" style="color:#88e6c6">Home</a></div>
    </div>`;
  document.body.append(root);

  const body = root.querySelector('[data-dev-body]');
  const toggle = () => (body.hidden = !body.hidden);
  root.querySelector('[data-dev-toggle]').addEventListener('click', toggle);
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') toggle();
  });
  for (const sel of root.querySelectorAll('[data-dev]')) {
    const key = sel.dataset.dev;
    sel.value = api.get(key);
    sel.addEventListener('change', () => api.set(key, sel.value));
  }
  const vp = root.querySelector('[data-dev-viewport]');
  const updateVp = () => (vp.textContent = `${window.innerWidth}×${window.innerHeight}`);
  updateVp();
  window.addEventListener('resize', updateVp);
  api.subscribe((key, value) => {
    const sel = root.querySelector(`[data-dev="${key}"]`);
    if (sel && sel.value !== value) sel.value = value;
  });
}
