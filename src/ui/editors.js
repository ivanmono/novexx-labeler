/**
 * Editor dispatch (docx §7.2 input types): a parameter row hands its parameter here and the
 * matching editor opens in the sheet. Every confirmed value goes through `ctx.setParam`, which
 * logs the change (docx §8.6 audit). Toggles flip in place without a sheet (docx §7.2, P2-05).
 * In portrait the sheet is capped so the edited row stays visible above it (docx §7.2).
 */
import { openSelectionList } from './components/SelectionList.js';
import { openNumericKeypad } from './components/NumericKeypad.js';
import { openAlphaKeyboard } from './components/AlphaKeyboard.js';
import { openSlider } from './components/Slider.js';
import { openQuicklinkPicker } from './components/QuicklinkPicker.js';
import { openDateTimePicker } from './components/DateTimePicker.js';

/** Height left under a row for the sheet, in portrait; null when the sheet docks sideways. */
export function sheetHeightBelow(rowEl, mainEl, isLandscape, { gap = 8, min = 320 } = {}) {
  if (isLandscape || !rowEl || !mainEl) return null;
  const main = mainEl.getBoundingClientRect();
  let row = rowEl.getBoundingClientRect();
  if (main.bottom - row.bottom - gap < min) {
    rowEl.scrollIntoView({ block: 'start' });
    row = rowEl.getBoundingClientRect();
  }
  return `${Math.max(min, Math.round(main.bottom - row.bottom - gap))}px`;
}

export function openEditor(ctx, param, rowEl = null) {
  const set = (v) => ctx.setParam(param.id, v);
  const landscape = (document.documentElement.dataset.orientation ?? '').startsWith('landscape');
  const maxHeight = sheetHeightBelow(rowEl, ctx.shell.main, landscape);
  const withHeight = (open) => {
    // the editors open the sheet themselves; the cap is applied right after
    const p = open();
    if (maxHeight && ctx.sheet.el)
      ctx.sheet.el.querySelector('.sheet__panel').style.maxHeight = maxHeight;
    return p;
  };
  if (param.unit === 'ParamID')
    return withHeight(() => openQuicklinkPicker(ctx, param, { onPick: set }));
  switch (param.control) {
    case 'toggle':
      return set(!ctx.store.getParam(param.id));
    case 'select':
      return withHeight(() => openSelectionList(ctx, param, { onPick: set }));
    case 'number':
      return withHeight(() => openNumericKeypad(ctx, param, { onConfirm: set }));
    case 'slider':
      return withHeight(() => openSlider(ctx, param, { onChange: set }));
    case 'time':
    case 'date':
      return withHeight(() => openDateTimePicker(ctx, param, { onConfirm: set }));
    case 'text':
    case 'ip':
      return withHeight(() => openAlphaKeyboard(ctx, param, { onConfirm: set }));
    default:
      ctx.toast.reject(ctx.t('toast.editorPending'));
      return Promise.resolve(undefined);
  }
}
