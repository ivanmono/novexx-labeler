/**
 * Route `screen/<nodeId>`: picks the screen for a menu-tree node by its kind. Menus and
 * parameter lists are generic (MenuScreen, ParamListScreen); the special masks arrive with
 * Phase 3 and fall back to the placeholder until then.
 */
import * as Menu from './MenuScreen.js';
import * as ParamList from './ParamListScreen.js';
import * as Favourites from './FavouritesScreen.js';
import * as Placeholder from './PlaceholderScreen.js';
import * as SelectFormat from './formats/SelectFormat.js';
import * as ModifyFormat from './formats/ModifyFormat.js';
import * as CreateFormat from './formats/CreateFormat.js';
import * as SpeedTest from './service/SpeedTest.js';
import * as IoTest from './service/IoTest.js';
import * as DiagnosisLogs from './service/DiagnosisLogs.js';

/** Special masks with their own screen (Phase 3), by node id. */
const MASKS = {
  selectformat: SelectFormat,
  modifyformat: ModifyFormat,
  createformat: CreateFormat,
  speedtest: SpeedTest,
  iotest: IoTest,
  diaglogs: DiagnosisLogs,
};

export function render(ctx, info) {
  const node = ctx.node(info.arg);
  if (node?.kind === 'menu') return Menu.render(ctx, info);
  if (node?.kind === 'list') return ParamList.render(ctx, info);
  if (node?.kind === 'favourites') return Favourites.render(ctx, info);
  if (node && MASKS[node.id]) return MASKS[node.id].render(ctx, info);
  return Placeholder.render(ctx, info);
}
