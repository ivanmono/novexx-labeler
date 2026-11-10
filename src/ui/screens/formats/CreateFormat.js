/**
 * Create New Format (docx §8.3, plan P3-04): store the live settings as a new format.
 * One name field, not pre-filled, the alphabetical keyboard unfolding below it on the page (as the
 * password field, DT-21). A duplicate name is never a dead end: the field says so inline and offers
 * "Overwrite <name> instead" (destructive confirmation). Names are free-form ("1" is valid), up to
 * 32 characters. After saving: back to Formats with a toast. Opens at L1, saving needs L2.
 */
import { renderTextField } from '../../components/AlphaKeyboard.js';
import { mountKeyboard } from '../../components/Keyboard.js';
import { renderPlaceholder } from '../../components/Placeholder.js';
import { icon } from '../../components/Icon.js';
import { confirmAction } from '../../components/ConfirmDialog.js';
import { withName } from './FormatList.js';
import {
  formatParamIds,
  findByName,
  createFormat,
  overwriteFormat,
} from '../../../core/formats.js';
import { canActNode } from '../../../core/access.js';
import { toScreenRoute } from '../../../core/router.js';
import { onAction, esc } from '../../html.js';

const MAX = 32;

export function render(ctx, info) {
  const { arg } = info;
  // logging in or out on this page switches between the locked notice and the form
  const onLevel = () => ctx.store.subscribe((st) => st.session.level, () => render(ctx, info));
  const node = ctx.node(arg);
  const ids = formatParamIds(ctx.data.params);
  // after saving: to the Formats menu (docx §8.3), replacing this page so Back does not reopen it
  const back = () => ctx.router.replace(toScreenRoute('formats'));

  if (!canActNode(node, ctx.level)) {
    ctx.shell.setScreen({
      title: ctx.t(`screen.${node.id}`),
      branch: node.branch,
      html: `<div class="flex-1 min-h-0 grid place-items-center p-4 pb-8 land:pb-4" data-create-locked>${renderPlaceholder(
        {
          kind: 'empty',
          icon: 'lock',
          title: ctx.t('toast.needsLevel', { n: node.accessAction ?? 2 }),
          text: ctx.t('format.createHint', { n: ids.length }),
          action: { label: ctx.t('login.title'), action: 'login', tone: 'primary' },
        },
      )}</div>`,
      mount: (el) => {
        const off = onAction(el, { login: () => ctx.go('login') });
        const offLevel = onLevel();
        return () => {
          off();
          offLevel();
        };
      },
    });
    return;
  }

  let name = '';
  ctx.shell.setScreen({
    title: ctx.t(`screen.${node.id}`),
    branch: node.branch,
    html: `
      <div class="flex-1 min-h-0 flex flex-col" data-create-format>
        <div class="px-3 pt-3 flex flex-col gap-1 mt-auto">
          <div class="t-caption text-muted px-1 land:hidden">${esc(ctx.t('format.name'))}</div>
          <!-- landscape: the overwrite offer sits beside the field so the keyboard keeps its room -->
          <div class="flex flex-col land:flex-row land:items-start gap-2">
            <div class="flex-1 min-w-0" data-field-host>${renderTextField({ value: '', placeholder: ctx.t('format.namePlaceholder'), max: MAX })}</div>
            <div class="shrink-0 grid" data-duplicate hidden></div>
          </div>
          <div class="text-label text-muted px-1 land:hidden" data-hint>${esc(ctx.t('format.createHint', { n: ids.length }))}</div>
        </div>
        <div class="px-3 pt-2 pb-8 land:pb-3" data-keys></div>
      </div>`,
    mount(el) {
      const field = el.querySelector('[data-entry]');
      const count = el.querySelector('[data-count]');
      const err = el.querySelector('[data-error]');
      err.classList.add('land:truncate'); // one line in landscape, the keyboard needs the height
      const dup = el.querySelector('[data-duplicate]');
      const hint = el.querySelector('[data-hint]');
      const show = (error = '') => {
        field.textContent = name || ctx.t('format.namePlaceholder');
        field.classList.toggle('text-faint', name === '');
        field.classList.toggle('text-text', name !== '');
        if (count) count.textContent = `${name.length}/${MAX}`;
        const taken = findByName(ctx.store.get('formats'), name);
        err.textContent = taken ? ctx.t('format.duplicate', { name: taken.name }) : error;
        dup.hidden = !taken;
        hint.hidden = !!taken || !!error;
        dup.innerHTML = taken
          ? `<button type="button" class="pressable h-touch-row px-4 rounded-md bg-surface-2 text-label font-semibold flex items-center justify-center gap-2 land:max-w-[260px]" data-action="overwriteInstead">${icon('save', { size: 24, class: 'shrink-0' })}<span class="truncate">${esc(ctx.t('format.overwriteInstead'))}</span></button>`
          : '';
        dup.dataset.id = taken?.id ?? '';
      };
      show();

      const save = async () => {
        const trimmed = name.trim();
        if (!trimmed) return show(ctx.t('edit.empty'));
        if (findByName(ctx.store.get('formats'), trimmed)) return show(); // inline, with the overwrite offer
        const s = ctx.session;
        const f = createFormat(ctx.store, trimmed, ids, {
          by: s.user?.name ?? ctx.t(`level.${s.level}`),
          level: s.level,
        });
        ctx.log('format', `created ${f.name}`, { format: f.id });
        ctx.toast.ok(ctx.t('format.createdToast', { name: f.name }));
        back();
      };

      const kb = mountKeyboard(el.querySelector('[data-keys]'), {
        layout: 'lower',
        enterIcon: 'save',
        onInput: (k) => {
          if (name.length >= MAX) return show(ctx.t('edit.tooLong', { n: MAX }));
          name += k;
          show();
        },
        onBackspace: () => {
          name = name.slice(0, -1);
          show();
        },
        onEnter: save,
      });
      const off = onAction(el, {
        overwriteInstead: async () => {
          const f = ctx.store.get('formats').find((x) => x.id === dup.dataset.id);
          if (!f) return;
          const ok = await confirmAction(ctx, {
            title: ctx.t('format.overwriteTitle'),
            body: `<p>${withName(ctx, 'format.overwriteBody', f.name)}</p>`,
            okLabel: ctx.t('action.overwrite'),
            destructive: true,
          });
          if (!ok) return;
          const s = ctx.session;
          overwriteFormat(ctx.store, f.id, ids, {
            by: s.user?.name ?? ctx.t(`level.${s.level}`),
            level: s.level,
          });
          ctx.log('format', `overwrote ${f.name}`, { format: f.id });
          ctx.toast.ok(ctx.t('format.savedToast', { name: f.name }));
          back();
        },
      });
      const offLevel = onLevel();
      return () => {
        kb.dispose();
        off();
        offLevel();
      };
    },
  });
}
