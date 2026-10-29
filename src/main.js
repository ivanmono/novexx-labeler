// Boot sequence. Phase 0: tokens + styleguide + dev panel.
// Phase 1 adds: load data -> restore persistence -> start simulator -> mount shell -> router.
import './styles/app.css';
import { injectSprite } from './ui/components/Icon.js';
import { mountDevPanel } from './ui/dev/DevPanel.js';
import { getTheme, setTheme, getOrientation, setOrientation, onDisplayChange } from './core/theme.js';
import { renderStyleguide, hydrateStyleguide } from './ui/screens/Styleguide.js';

const app = document.querySelector('#app');
let lang = 'en';

/** Test and dev hook: Playwright drives the app through this object. */
const api = {
  get(key) {
    return { theme: getTheme(), orientation: getOrientation(), lang }[key];
  },
  set(key, value) {
    if (key === 'theme') setTheme(value);
    else if (key === 'orientation') setOrientation(value);
    else if (key === 'lang') {
      lang = value;
      document.documentElement.lang = value;
      render();
    }
  },
  subscribe: onDisplayChange,
};
window.__hmi = api;

function render() {
  const route = location.hash.replace(/^#\/?/, '') || 'styleguide';
  if (route === 'styleguide') {
    app.classList.remove('hmi');
    app.innerHTML = renderStyleguide();
    hydrateStyleguide(app);
  } else {
    app.className = 'hmi';
    app.innerHTML = `<div class="hmi__status"></div><div class="hmi__main p-6 text-muted">Shell comes in Phase 1 — <a class="text-brand" href="#/styleguide">styleguide</a></div><div class="hmi__nav"></div>`;
  }
}

await injectSprite();
mountDevPanel(api);
onDisplayChange(() => render());
window.addEventListener('hashchange', render);
render();
