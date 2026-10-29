/**
 * Theme and orientation on <html>. Both are later bound to parameters
 * HMI_Dark_Mode (612) and HMI_Orientation (601) in the store (plan P1-06).
 */
export const THEMES = ['dark', 'light'];
export const ORIENTATIONS = [
  'portrait',
  'landscape-lh',
  'landscape-rh',
  'portrait-flipped',
  'landscape-lh-flipped',
  'landscape-rh-flipped',
];

/** HMI_Orientation option id → data-orientation value (Excel options 602–607). */
export const ORIENTATION_BY_OPTION = {
  602: 'portrait',
  603: 'landscape-lh',
  604: 'landscape-rh',
  605: 'portrait-flipped',
  606: 'landscape-lh-flipped',
  607: 'landscape-rh-flipped',
};

const listeners = new Set();
const root = () => document.documentElement;

export function getTheme() {
  return root().dataset.theme === 'light' ? 'light' : 'dark';
}
export function setTheme(theme) {
  const t = THEMES.includes(theme) ? theme : 'dark';
  if (root().dataset.theme === t) return;
  root().dataset.theme = t;
  emit('theme', t);
}

export function getOrientation() {
  return ORIENTATIONS.includes(root().dataset.orientation) ? root().dataset.orientation : 'portrait';
}
export function setOrientation(o) {
  const v = ORIENTATIONS.includes(o) ? o : 'portrait';
  if (root().dataset.orientation === v) return;
  root().dataset.orientation = v;
  emit('orientation', v);
}
export function isLandscape(o = getOrientation()) {
  return o.startsWith('landscape');
}

export function onDisplayChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit(key, value) {
  for (const fn of listeners) fn(key, value);
}
