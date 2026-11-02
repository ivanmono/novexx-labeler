/**
 * Route `screen/<nodeId>`: picks the screen for a menu-tree node by its kind. Menus and
 * parameter lists are generic (MenuScreen, ParamListScreen); the special masks arrive with
 * Phase 3 and fall back to the placeholder until then.
 */
import * as Menu from './MenuScreen.js';
import * as ParamList from './ParamListScreen.js';
import * as Favourites from './FavouritesScreen.js';
import * as Placeholder from './PlaceholderScreen.js';

export function render(ctx, info) {
  const node = ctx.node(info.arg);
  if (node?.kind === 'menu') return Menu.render(ctx, info);
  if (node?.kind === 'list') return ParamList.render(ctx, info);
  if (node?.kind === 'favourites') return Favourites.render(ctx, info);
  return Placeholder.render(ctx, info);
}
