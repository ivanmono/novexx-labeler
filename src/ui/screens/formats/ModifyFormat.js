/**
 * Modify Format (docx §8.2, plan P3-03): overwrite a stored format with the live settings.
 * Same list as Select Format; the loaded format is pre-selected. The status line gives the short
 * diff ("12 parameters differ") that replaces the dropped Compare/Check screen, or the
 * "no differences to the stored file" state (then there is nothing to overwrite). Destructive
 * confirmation naming the target. Opens at L1 (read), overwriting needs L2 (node accessAction).
 */
import { renderFormatPage, redrawKeepingScroll, withName, watchFormats } from './FormatList.js';
import { diffText } from './SelectFormat.js';
import { confirmAction } from '../../components/ConfirmDialog.js';
import { mountScrollHint } from '../../components/ListRow.js';
import { formatParamIds, differences, overwriteFormat } from '../../../core/formats.js';
import { canActNode } from '../../../core/access.js';
import { onAction, esc } from '../../html.js';

export function render(ctx, { arg }) {
  const node = ctx.node(arg);
  const ids = formatParamIds(ctx.data.params);
  let selectedId = ctx.store.get('settings').loadedFormat ?? null;

  const view = () => {
    const formats = ctx.store.get('formats');
    const loadedId = ctx.store.get('settings').loadedFormat ?? null;
    if (!formats.some((f) => f.id === selectedId)) selectedId = null;
    const allowed = canActNode(node, ctx.level);
    const sel = formats.find((f) => f.id === selectedId) ?? null;
    const n = sel ? differences(ctx.store, sel, ids).length : null;
    const status = !sel
      ? { text: ctx.t('format.pick') }
      : { text: diffText(ctx, n), tone: n === 0 ? 'ok' : 'muted' };
    const action = !allowed ? 'locked' : !sel ? 'nopick' : n === 0 ? 'nodiff' : 'overwrite';
    return renderFormatPage(ctx, {
      formats,
      loadedId,
      selectedId,
      status,
      button: {
        label: ctx.t('format.overwrite'),
        action,
        enabled: action === 'overwrite',
        icon: !allowed ? 'lock' : null,
      },
    });
  };

  ctx.shell.setScreen({
    title: ctx.t(`screen.${node.id}`),
    subtitle: ctx.t('format.count', { n: ctx.store.get('formats').length }),
    branch: node.branch,
    html: view(),
    mount(el) {
      let hint = mountScrollHint(el.querySelector('[data-scroll]') ?? el);
      const redraw = () => {
        hint();
        redrawKeepingScroll(el, view());
        hint = mountScrollHint(el.querySelector('[data-scroll]') ?? el);
      };
      // bring the pre-selected (loaded) format into view
      el.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
      const offAction = onAction(el, {
        pick: (btn) => {
          selectedId = btn.dataset.id;
          redraw();
        },
        nopick: () => ctx.toast.reject(ctx.t('format.pick')),
        nodiff: () => ctx.toast.reject(ctx.t('format.noDiff')),
        locked: () => ctx.toast.reject(ctx.t('toast.needsLevel', { n: node.accessAction ?? 2 })),
        create: () => ctx.goScreen('createformat'),
        overwrite: async () => {
          const f = ctx.store.get('formats').find((x) => x.id === selectedId);
          if (!f) return;
          const n = differences(ctx.store, f, ids).length;
          const ok = await confirmAction(ctx, {
            title: ctx.t('format.overwriteTitle'),
            body: `<p>${withName(ctx, 'format.overwriteBody', f.name)}</p><p class="mt-3 text-muted">${esc(diffText(ctx, n))}</p>`,
            okLabel: ctx.t('action.overwrite'),
            destructive: true,
          });
          if (!ok) return;
          const s = ctx.session;
          overwriteFormat(ctx.store, f.id, ids, {
            by: s.user?.name ?? ctx.t(`level.${s.level}`),
            level: s.level,
          });
          ctx.log('format', `overwrote ${f.name} (${n} parameters)`, { format: f.id });
          ctx.toast.ok(ctx.t('format.savedToast', { name: f.name }));
        },
      });
      const offStore = watchFormats(ctx, ids, redraw);
      return () => {
        hint();
        offAction();
        offStore();
      };
    },
  });
}
