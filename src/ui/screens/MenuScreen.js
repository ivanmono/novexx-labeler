/**
 * Menu screen (plan P2-01 / P2-02, docx §3.2, §5.4, §6.1–6.2): the children of a `menu` node from
 * menu-tree.json as tiles, six per page, two columns in portrait and three in landscape
 * (components.css). Tiles for options that are not installed are disabled, never hidden, so the
 * menu keeps its shape on every machine. `ref` nodes open their target (the router resolves them)
 * and show where else that screen lives.
 */
import { renderMenuTile } from '../components/MenuTile.js';
import { renderPager } from '../components/Pager.js';
import { esc } from '../html.js';
import { onAction } from '../html.js';

export const TILES_PER_PAGE = 6;

/** Slice `items` for page `page` (0-based); the page is clamped into range. */
export function paginate(items, page, perPage = TILES_PER_PAGE) {
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const p = Math.min(Math.max(0, page), pages - 1);
  return { page: p, pages, items: items.slice(p * perPage, (p + 1) * perPage) };
}

/** Is the machine option behind a tile installed? (overrides.json optionGates → node.gate) */
export function gateOpen(gate, { getParam, machine }) {
  if (!gate) return true;
  if (gate.param != null) return !!getParam(gate.param);
  if (gate.params) return gate.params.some((id) => !!getParam(id));
  if (gate.machine) return !!machine?.options?.[gate.machine];
  return true;
}

/** Tile model for a child node: title, sub-line, disabled flag and the cross-link hint. */
export function tileFor(ctx, node) {
  const target = node.kind === 'ref' ? ctx.node(node.target) : null;
  const shown = target ?? node;
  const open = gateOpen(shown.gate, {
    getParam: ctx.store.getParam,
    machine: ctx.data.machine,
  });
  const disabled = !open || !ctx.canOpen(shown);
  // linked path: name the menu the target lives under (docx §6.2 "same screen, two entry points")
  const home = target ? ctx.node(target.parent) : null;
  const link = home ? ctx.t(`screen.${home.id}`) : null;
  const subtitle = !open
    ? ctx.t('menu.optionMissing')
    : link
      ? ctx.t('menu.linkTo', { path: link })
      : shown.subtitle || null;
  return {
    id: node.id,
    title: ctx.t(`screen.${shown.id}`),
    subtitle,
    icon: shown.icon,
    branch: shown.branch,
    disabled,
    link,
  };
}

export function render(ctx, { arg }) {
  const node = ctx.node(arg);
  const children = node?.children ?? [];
  let page = 0;

  const draw = () => {
    const { page: p, pages, items } = paginate(children, page);
    page = p;
    const tiles = items.map((c) => renderMenuTile(tileFor(ctx, c))).join('');
    return `
      <div class="menu flex-1 min-h-0 flex flex-col p-4 gap-3" data-menu="${esc(node.id)}" data-page="${p + 1}" data-pages="${pages}">
        <div class="menu__grid grid grid-cols-2 [[data-orientation^=landscape]_&]:grid-cols-3 auto-rows-[minmax(120px,auto)] gap-3 content-start flex-1 min-h-0" data-tiles>${tiles}</div>
        ${renderPager({ page: p, pages })}
      </div>`;
  };

  ctx.shell.setScreen({
    title: ctx.t(`screen.${node.id}`),
    back: true,
    branch: node.id === 'root' ? null : node.branch,
    html: draw(),
    mount(el) {
      const redraw = () => {
        el.innerHTML = draw();
      };
      const dispose = onAction(el, {
        open: (btn) => {
          const child = ctx.node(btn.dataset.id);
          if (!child) return;
          if (child.kind === 'ref') return ctx.goScreen(child.target);
          ctx.goScreen(child.id);
        },
        prev: () => {
          page -= 1;
          redraw();
        },
        next: () => {
          page += 1;
          redraw();
        },
      });
      // option toggles and the access level change which tiles are enabled
      const unsubs = [
        ctx.store.subscribe((s) => s.session.level, redraw),
        ctx.store.onAnyParam((id) => {
          if (
            children.some((c) =>
              JSON.stringify(ctx.node(c.target ?? c.id)?.gate ?? '').includes(String(id)),
            )
          )
            redraw();
        }),
      ];
      return () => {
        dispose();
        unsubs.forEach((u) => u());
      };
    },
  });
}
