/**
 * Favourites (docx §6.2, plan P2-12): the parameters the user starred, as a view on the same
 * store values — editing here changes the parameter itself. The node is synthetic (Settings >
 * Favourites, injected in app.js) and its items follow the `favourites` slice live, so the list
 * redraws when a star is removed while the screen is open.
 */
import * as ParamList from './ParamListScreen.js';

export function favouritesNode(ctx) {
  return {
    id: 'favourites',
    kind: 'favourites',
    branch: 'settings',
    links: [],
    emptyKey: 'favourites.empty',
    get items() {
      return ctx.favourites().map((pid) => ({
        pid,
        indent: 0,
        status: 'defined',
      }));
    },
  };
}

export function render(ctx, info) {
  return ParamList.render(ctx, info, favouritesNode(ctx));
}
