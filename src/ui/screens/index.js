/**
 * Route registry: route head → screen module with `render(ctx, { arg, route, prev, info })`.
 * Each screen calls ctx.shell.setScreen(...). Phase 1 ships the shell, start-up, home stub,
 * login and the styleguide; Phase 2/3 fill in menu, parameter lists and special screens.
 */
import * as Styleguide from './Styleguide.js';
import * as Startup from './StartupScreen.js';
import * as Home from './HomeScreen.js';
import * as Placeholder from './PlaceholderScreen.js';
import * as Node from './NodeScreen.js';
import * as Login from './LoginScreen.js';
import * as User from './UserScreen.js';
import * as Components from './Components.js';
import * as TouchTest from './TouchTestScreen.js';

export const screens = {
  components: Components, // dev route: every component in every state, source of the Figma component sets
  home: Home,
  startup: Startup,
  styleguide: Styleguide,
  screen: Node, // menu nodes → MenuScreen; lists and masks → placeholder until Phase 2–3
  login: Login,
  user: User,
  touchtest: TouchTest, // dev route: touch accuracy and target-size test for the real panel
  notFound: Placeholder,
};
