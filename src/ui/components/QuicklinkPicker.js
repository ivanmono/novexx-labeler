/**
 * Quicklink picker (docx §6.3 quicklinks, §7.1 favourites feed quicklinks; plan P2-12): the
 * editor for HMI_Quicklink_1–4 (614–617). Favourites come first, then every other parameter the
 * level may read, each with the screen it lives on. Reuses the option row of the selection list.
 */
import { renderOptionRow } from './SelectionList.js';
import { canReadParam } from '../../core/access.js';
import { paramLabel } from '../format.js';
import { esc, onAction } from '../html.js';

/** [{ pid, label, sub, favourite }] — favourites first, then the rest in parameter order. */
export function quicklinkChoices(ctx) {
  const favourites = ctx.favourites();
  const seen = new Set();
  const entry = (p, favourite) => {
    seen.add(p.id);
    const screen = p.screens?.[0] ? ctx.node(p.screens[0]) : null;
    return {
      pid: p.id,
      label: paramLabel(ctx, p),
      sub: screen ? ctx.t(`screen.${screen.id}`) : '',
      favourite,
    };
  };
  const first = favourites
    .map((id) => ctx.param(id))
    .filter(Boolean)
    .map((p) => entry(p, true));
  const rest = ctx.data.params
    .filter(
      (p) =>
        !seen.has(p.id) &&
        p.screens?.length &&
        p.control !== 'action' &&
        canReadParam(p, ctx.level) &&
        !(p.id >= 614 && p.id <= 617),
    )
    .map((p) => entry(p, false));
  return [...first, ...rest];
}

export function openQuicklinkPicker(ctx, param, { onPick } = {}) {
  const current = Number(ctx.store.getParam(param.id));
  const choices = quicklinkChoices(ctx);
  const favCount = choices.filter((c) => c.favourite).length;
  const rowOf = (c, last) =>
    renderOptionRow({
      id: c.pid,
      label: `${c.label}${c.sub ? ` · ${c.sub}` : ''}`,
      selected: c.pid === current,
      last,
    });
  const header = (key) => `<div class="t-caption text-muted px-1 pt-2">${esc(ctx.t(key))}</div>`;
  const body = `
    ${favCount ? header('favourites.title') : ''}
    ${
      favCount
        ? `<div class="card-border"><div class="py-1">${choices
            .slice(0, favCount)
            .map((c, i) => rowOf(c, i === favCount - 1))
            .join('')}</div></div>`
        : ''
    }
    ${header('quicklink.allParameters')}
    <div class="card-border"><div class="py-1">${choices
      .slice(favCount)
      .map((c, i, a) => rowOf(c, i === a.length - 1))
      .join('')}</div></div>
    <div class="t-caption text-faint text-center py-3" data-list-end>${esc(ctx.t('list.end'))}</div>`;
  return ctx.sheet.open({
    title: paramLabel(ctx, param),
    body: `<div class="flex flex-col gap-2" data-quicklink-picker>${body}</div>`,
    mount(el, close) {
      el.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'center' });
      return onAction(el, {
        pick: (btn) => {
          const pid = Number(btn.dataset.id);
          onPick?.(pid);
          close(pid);
        },
      });
    },
  });
}
