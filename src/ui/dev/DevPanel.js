/**
 * Dev panel (not part of the product UI). Toggle with Ctrl+Shift+D or the DEV corner tab.
 * Sets theme, orientation, language, access level, machine state; injects errors; resets data.
 * Playwright drives the same things through `window.__hmi` (see src/app.js).
 */
const ORIENTATIONS = [
  ['portrait', 'Portrait'],
  ['landscape-lh', 'Landscape LH'],
  ['landscape-rh', 'Landscape RH'],
  ['portrait-flipped', 'Portrait ↻180'],
  ['landscape-lh-flipped', 'LH ↻180'],
  ['landscape-rh-flipped', 'RH ↻180'],
];
const S = 'width:100%;color:#000;background:#eff6ff;border-radius:4px;padding:3px';
const B = 'background:#313648;color:#eff6ff;border:1px solid #505d75;border-radius:6px;padding:5px 7px;font:12px system-ui;cursor:pointer';

export function mountDevPanel(api) {
  const root = document.createElement('div');
  root.id = 'dev-panel';
  root.innerHTML = `
    <button type="button" data-dev-toggle title="Dev panel (Ctrl+Shift+D)"
      style="position:fixed;right:0;top:40%;z-index:9999;background:#1d2028;color:#88e6c6;border:1px solid #505d75;border-right:0;border-radius:8px 0 0 8px;padding:6px 6px;font:600 11px system-ui;opacity:.6">DEV</button>
    <div data-dev-body hidden
      style="position:fixed;right:0;top:0;bottom:0;width:240px;z-index:9998;background:#1d2028;color:#eff6ff;border-left:1px solid #505d75;padding:12px;font:13px system-ui;overflow:auto;display:flex;flex-direction:column;gap:8px">
      <div style="font-weight:700">Dev panel</div>
      <label>Theme <select data-dev="theme" style="${S}"><option value="dark">dark</option><option value="light">light</option></select></label>
      <label>Orientation <select data-dev="orientation" style="${S}">${ORIENTATIONS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>
      <label>Language <select data-dev="lang" style="${S}"><option value="en">English</option><option value="de">Deutsch</option></select></label>
      <label>Access level <select data-dev="level" style="${S}">${[0, 1, 2, 3, 4].map((l) => `<option value="${l}">L${l}</option>`).join('')}</select></label>
      <div>Machine state <span data-dev-state style="color:#88e6c6"></span></div>
      <div style="display:flex;flex-wrap:wrap;gap:4px">
        ${['run', 'pause', 'online', 'offline', 'warning', 'alarm', 'reset', 'standby'].map((s) => `<button type="button" data-dev-cmd="${s}" style="${B}">${s}</button>`).join('')}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:4px">
        <button type="button" data-dev-go="home" style="${B}">home</button>
        <button type="button" data-dev-go="startup" style="${B}">startup</button>
        <button type="button" data-dev-go="screen/root" style="${B}">menu</button>
        <button type="button" data-dev-go="styleguide" style="${B}">styleguide</button>
        <button type="button" data-dev-skip style="${B}">skip boot</button>
        <button type="button" data-dev-reset style="${B};color:#ff6479">factory reset</button>
      </div>
      <div style="color:#98a3b2">Viewport <span data-dev-viewport></span></div>
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
    sel.value = String(api.get(key));
    sel.addEventListener('change', () => api.set(key, sel.value));
  }
  root.querySelectorAll('[data-dev-cmd]').forEach((b) => b.addEventListener('click', () => api.set('state', b.dataset.devCmd)));
  root.querySelectorAll('[data-dev-go]').forEach((b) => b.addEventListener('click', () => api.go(b.dataset.devGo)));
  root.querySelector('[data-dev-skip]').addEventListener('click', () => { api.skipBoot(); api.go('home'); });
  root.querySelector('[data-dev-reset]').addEventListener('click', () => { if (confirm('Factory reset the dummy data?')) api.ctx.factoryReset(); });

  const vp = root.querySelector('[data-dev-viewport]');
  const stateEl = root.querySelector('[data-dev-state]');
  const updateVp = () => (vp.textContent = `${window.innerWidth}×${window.innerHeight}`);
  updateVp();
  window.addEventListener('resize', updateVp);
  api.subscribe((key, value) => {
    const sel = root.querySelector(`[data-dev="${key}"]`);
    if (sel && sel.value !== String(value)) sel.value = String(value);
  });
  api.store?.subscribe((s) => s.machine?.state, (st) => (stateEl.textContent = st ?? ''), { immediate: true });
}
