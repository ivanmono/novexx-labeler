/**
 * Select Format (docx §8.1, plan P3-02): load a stored format into the machine.
 * Tapping a row selects it (no immediate effect); the primary button loads it after a confirmation
 * that names the format and warns that unsaved changes are lost. Blocked while the machine runs
 * (status line + the button refuses with a toast). Access L1.
 */
import { renderFormatPage, redrawKeepingScroll, withName, watchFormats } from './FormatList.js';
import { confirmAction } from '../../components/ConfirmDialog.js';
import { mountScrollHint } from '../../components/ListRow.js';
import { formatParamIds, differences, loadFormat } from '../../../core/formats.js';
import { canActNode } from '../../../core/access.js';
import { onAction, esc } from '../../html.js';

export function render(ctx, { arg }) {
  const node = ctx.node(arg);
  const ids = formatParamIds(ctx.data.params);
  let selectedId = null;

  const view = () => {
    const formats = ctx.store.get('formats');
    const loadedId = ctx.store.get('settings').loadedFormat ?? null;
    const running = ctx.store.get('machine').state === 'run';
    const allowed = canActNode(node, ctx.level);
    const sel = formats.find((f) => f.id === selectedId) ?? null;
    let status = null;
    if (running) status = { text: ctx.t('format.runningBlocked'), tone: 'warning' };
    else if (sel) status = { text: diffText(ctx, differences(ctx.store, sel, ids).length) };
    else status = { text: ctx.t('format.pick') };
    const action = !allowed ? 'locked' : running ? 'running' : sel ? 'load' : 'nopick';
    return renderFormatPage(ctx, {
      formats,
      loadedId,
      selectedId,
      status,
      button: {
        label: ctx.t('format.load'),
        action,
        enabled: action === 'load',
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
      const offAction = onAction(el, {
        pick: (btn) => {
          selectedId = btn.dataset.id;
          redraw();
        },
        nopick: () => ctx.toast.reject(ctx.t('format.pick')),
        running: () => ctx.toast.reject(ctx.t('toast.machineRunning')),
        locked: () => ctx.toast.reject(ctx.t('toast.needsLevel', { n: node.accessAction ?? 1 })),
        create: () => ctx.goScreen('createformat'),
        load: async () => {
          const f = ctx.store.get('formats').find((x) => x.id === selectedId);
          if (!f) return;
          const n = differences(ctx.store, f, ids).length;
          const ok = await confirmAction(ctx, {
            title: ctx.t('format.loadTitle'),
            body: `<p>${withName(ctx, 'format.loadBody', f.name)}</p><p class="mt-3 text-muted">${esc(diffText(ctx, n))}</p>`,
            okLabel: ctx.t('action.load'),
            whenStopped: true,
          });
          if (!ok) return;
          loadFormat(ctx.store, f.id);
          ctx.log('format', `loaded ${f.name}`, { format: f.id });
          ctx.toast.ok(ctx.t('format.loadedToast', { name: f.name }));
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

export function diffText(ctx, n) {
  return n === 0
    ? ctx.t('format.noDiff')
    : n === 1
      ? ctx.t('format.differOne')
      : ctx.t('format.differ', { n });
}
