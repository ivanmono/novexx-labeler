/**
 * Route registry: route head → screen module with `render(ctx, { arg, route, prev, info })`.
 * Each screen calls ctx.shell.setScreen(...). Phase 1 ships the shell, start-up, home stub,
 * login and the styleguide; Phase 2/3 fill in menu, parameter lists and special screens.
 */
import * as Styleguide from './Styleguide.js';
import * as Startup from './StartupScreen.js';
import * as Home from './HomeScreen.js';
import * as Placeholder from './PlaceholderScreen.js';

export const screens = {
  home: Home,
  startup: Startup,
  styleguide: Styleguide,
  screen: Placeholder, // replaced by Menu / ParamList / masks in Phase 2–3
  login: Placeholder,
  user: Placeholder,
  notFound: Placeholder,
};
