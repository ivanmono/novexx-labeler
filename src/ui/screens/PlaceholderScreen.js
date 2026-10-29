/** Temporary screen for routes not yet implemented; shows the tree node's title and kind. */
import { icon } from '../components/Icon.js';
import { esc } from '../html.js';

export function render(ctx, { arg, route }) {
  const node = arg ? ctx.node(arg) : null;
  const title = node ? ctx.t(`screen.${node.id}`) : route;
  ctx.shell.setScreen({
    title,
    branch: node?.branch ?? null,
    html: `
      <div class="flex-1 grid place-items-center p-6 text-center text-muted">
        <div class="flex flex-col items-center gap-3">
          ${icon(node?.icon ?? 'tbd', { size: 48, class: 'text-faint' })}
          <div class="text-body">${esc(node ? `${node.kind} · ${node.id}` : route)}</div>
          <div class="text-label">Phase 2 / 3</div>
        </div>
      </div>`,
  });
}
