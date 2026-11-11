/**
 * User modified Parameters (menu tree `usermodified`, plan P3-13): every parameter whose value
 * differs from its default, as a generated view on the same store values — the rows are the
 * Favourites cards (the screen the parameter lives on above its name, DT-25) with the default
 * under the value. Tapping a row opens its editor, so a value can be put back right here; a row
 * that reaches its default again leaves the list. Rows follow the level and the show conditions
 * like every parameter list (listRows). Empty state when nothing differs.
 */
import * as ParamList from '../ParamListScreen.js';
import { writeLevel } from '../../../core/access.js';

const NOT_SETTABLE = new Set(['display', 'state', 'action']);

/** Parameter ids that are settable and differ from their default, in ParamID order. */
export function modifiedIds(params, getParam) {
  return params
    .filter((p) => p.default != null && !NOT_SETTABLE.has(p.control) && writeLevel(p) != null)
    .filter((p) => String(getParam(p.id)) !== String(p.default))
    .map((p) => p.id)
    .sort((a, b) => a - b);
}

export function userModifiedNode(ctx, base) {
  return {
    ...base,
    kind: 'usermodified',
    links: [],
    emptyKey: 'modified.empty',
    intro: (n) => ctx.t(n === 1 ? 'modified.countOne' : 'modified.count', { n }),
    get items() {
      return modifiedIds(ctx.data.params, ctx.store.getParam).map((pid) => ({ pid, indent: 0, status: 'defined' }));
    },
  };
}

export function render(ctx, info) {
  return ParamList.render(ctx, info, userModifiedNode(ctx, ctx.node(info.arg)));
}
