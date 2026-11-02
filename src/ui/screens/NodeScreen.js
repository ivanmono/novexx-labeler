/**
 * Route `screen/<nodeId>`: picks the screen for a menu-tree node by its kind. Menus are generic
 * (MenuScreen); parameter lists and the special masks arrive with Phase 2/3 and fall back to the
 * placeholder until then.
 */
import * as Menu from './MenuScreen.js';
import * as Placeholder from './PlaceholderScreen.js';

export function render(ctx, info) {
  const node = ctx.node(info.arg);
  if (node?.kind === 'menu') return Menu.render(ctx, info);
  return Placeholder.render(ctx, info);
}
