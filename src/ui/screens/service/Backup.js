/**
 * Load / Store Backup — USB (docx §8.9, plan P3-11). One flow on one screen:
 *
 *   browse  File browser over the drive (path bar, one level up, folders, files; files that are not
 *           machine backups greyed out). Footer: "Create backup here" (L2) for the open folder and
 *           "Load" (L3) for the selected file. No drive → the "No USB drive" empty state, never an
 *           error dialog; plugging one in shows the browser again.
 *   name    The naming step: file name pre-filled with device + serial + date (tap to edit with the
 *           keyboard), the choice Backup / Format with what each one contains and is for, Save.
 *           A name that already exists in the folder asks before overwriting.
 *   run     Progress with phase text and "Do not remove the USB drive"; leaving the screen is
 *           refused (ctx.busy). Pulling the drive anyway ends in the failure state.
 *   result  Success (file written / parameters restored) or failure with what to do next.
 *
 * Loading changes the machine: confirmation, refused while the machine runs (also re-checked at
 * the start), and a Format only touches the format-relevant parameters.
 */
import { renderFileBrowser, mountFileBrowser } from '../../components/FileBrowser.js';
import { renderTextField } from '../../components/AlphaKeyboard.js';
import { mountKeyboard } from '../../components/Keyboard.js';
import { renderProgressResult, updateProgress } from '../../components/ProgressResult.js';
import { renderButton } from '../../components/Button.js';
import { confirmAction } from '../../components/ConfirmDialog.js';
import { mountScrollHint } from '../../components/ListRow.js';
import { icon } from '../../components/Icon.js';
import { canActNode } from '../../../core/access.js';
import {
  USB_ROOT,
  KINDS,
  NAME_MAX,
  FORBIDDEN,
  kindOf,
  defaultBackupName,
  validateName,
  makeSnapshot,
  makeFile,
  listFolder,
  findFile,
  writeFile,
  restoreDiff,
} from '../../../core/backup.js';
import { esc, cx, onAction } from '../../html.js';

/** Create needs L2 (docx §8.9); load needs the node's action level (L3). */
const CREATE_LEVEL = 2;
const STEP_MS = 140;

export function render(ctx, { arg }) {
  const node = ctx.node(arg);
  const loadLevel = node.accessAction ?? 3;
  let path = [USB_ROOT];
  let selected = null;
  let mode = 'browse'; // browse | name | run | result
  let keys = false; // naming: keyboard unfolded
  let stem = '';
  let kind = 'backup';
  let job = null; // { op:'create'|'load', file, progress, phase, timer }
  let result = null; // { ok, title, message, steps }
  let kb = null;

  const usbIn = () => !!ctx.store.get('machine')?.usb;
  const device = () => String(ctx.store.getParam(600) ?? 'HMI');
  const serial = () => ctx.store.get('machine')?.identity?.serial ?? '';

  // ---- views ---------------------------------------------------------------------------------
  const footer = () => {
    const file = selected ? findFile(ctx.store.get('usb'), path, selected) : null;
    const canCreate = ctx.level >= CREATE_LEVEL;
    const canLoad = canActNode(node, ctx.level);
    const load = renderButton({
      label: ctx.t('backup.load'),
      action: !file ? 'pickFirst' : canLoad ? 'load' : 'loadLocked',
      tone: 'primary',
      icon: canLoad ? 'backup' : 'lock',
    });
    const create = renderButton({
      label: ctx.t('backup.createHere'),
      action: canCreate ? 'create' : 'createLocked',
      tone: 'secondary',
      icon: canCreate ? 'files' : 'lock',
    });
    return `
      <div class="px-3 pt-2 pb-8 land:pb-3 border-t border-line-soft flex flex-col gap-2" data-backup-actions>
        <div class="text-label text-muted truncate px-1 min-h-6 land:hidden" data-selection>${
          file
            ? `${esc(ctx.t(`backup.kind.${kindOf(file.name)}`))} · ${esc(file.name)}`
            : esc(ctx.t('backup.pickHint'))
        }</div>
        <div class="grid grid-cols-[1fr_160px] land:grid-cols-[1fr_180px] gap-3">
          <div class="${cx('grid', !canCreate && 'opacity-40')}">${create}</div>
          <div class="${cx('grid', (!file || !canLoad) && 'opacity-40')}">${load}</div>
        </div>
      </div>`;
  };

  const browseView = () => {
    if (!usbIn())
      return `<div class="flex-1 min-h-0 flex flex-col justify-center px-3" data-backup data-no-usb>${renderFileBrowser({ path, entries: [], usb: false })}</div>`;
    const entries = listFolder(ctx.store.get('usb'), path);
    return `
      <div class="flex-1 min-h-0 flex flex-col" data-backup>
        <div class="scroll-hint flex-1 min-h-0">
          <div class="scroll-y h-full px-3 pt-3" data-scroll>${renderFileBrowser({ path, entries, selected })}</div>
        </div>
        ${footer()}
      </div>`;
  };

  const choice = (k) => `
    <button type="button" role="radio" aria-checked="${kind === k}" class="${cx('pressable card-border text-left', kind === k && 'card-border--strong')}" data-action="kind" data-kind="${k}">
      <div class="flex items-start gap-3 p-4 land:p-3 h-full">
        <span class="${cx('mt-1 grid place-items-center size-7 rounded-pill border-2 shrink-0', kind === k ? 'border-brand bg-brand text-on-brand' : 'border-line')}">${kind === k ? icon('check', { size: 18, stroke: 3 }) : ''}</span>
        <span class="flex flex-col gap-1 min-w-0">
          <span class="text-body font-semibold">${esc(ctx.t(`backup.kind.${k}`))} <span class="t-param font-normal text-label text-muted">${KINDS[k]}</span></span>
          <span class="text-label text-muted leading-snug">${esc(ctx.t(`backup.kindHint.${k}`))}</span>
        </span>
      </div>
    </button>`;

  const nameError = () => {
    const v = validateName(stem);
    return v ? ctx.t(`backup.nameError.${v}`) : null;
  };

  const nameView = () => `
      <div class="flex-1 min-h-0 flex flex-col px-3 pt-3 gap-3 land:gap-2" data-backup-name>
        <div class="t-caption text-muted px-1">${esc(ctx.t('backup.fileName'))} · ${esc(path.join(' › '))}</div>
        <div class="pressable" data-action="editName" data-name-field>${renderTextField({ value: stem, error: nameError(), wrap: true })}</div>
        ${
          keys
            ? '<div data-keys></div>'
            : `<div class="grid grid-cols-1 land:grid-cols-2 gap-3" role="radiogroup" aria-label="${esc(ctx.t('backup.kindLabel'))}">${choice('backup')}${choice('format')}</div>
        <div class="mt-auto pb-8 land:pb-3 grid grid-cols-2 gap-3">
          ${renderButton({ label: ctx.t('action.cancel'), action: 'cancelName', tone: 'secondary' })}
          ${renderButton({ label: ctx.t('backup.save'), action: 'save', tone: 'primary', icon: 'check', iconStroke: 3 })}
        </div>`
        }
      </div>`;

  const runView = () => `
      <div class="flex-1 min-h-0 flex flex-col justify-center px-3" data-backup-run>
        ${renderProgressResult({
          state: 'running',
          title: ctx.t(job.op === 'create' ? 'backup.running.create' : 'backup.running.load'),
          phase: job.phase,
          value: job.progress,
          warning: ctx.t('backup.dontPull'),
        })}
      </div>`;

  const resultView = () => `
      <div class="flex-1 min-h-0 overflow-y-auto flex flex-col px-3 py-3 [&>*]:my-auto" data-backup-result="${result.ok ? 'ok' : 'failed'}">
        ${renderProgressResult({
          state: result.ok ? 'success' : 'failure',
          title: result.title,
          message: result.message,
          steps: result.steps ?? [],
          actions: [{ label: ctx.t('backup.done'), action: 'done', tone: result.ok ? 'primary' : 'secondary' }],
        })}
      </div>`;

  const view = () =>
    mode === 'name' ? nameView() : mode === 'run' ? runView() : mode === 'result' ? resultView() : browseView();

  // ---- operations ------------------------------------------------------------------------------
  const PHASES = {
    create: ['backup.phase.read', 'backup.phase.write', 'backup.phase.verify'],
    load: ['backup.phase.open', 'backup.phase.verify', 'backup.phase.apply'],
  };

  ctx.shell.setScreen({
    title: ctx.t(`screen.${node.id}`),
    branch: node.branch,
    html: view(),
    mount(el) {
      let hint = () => {};
      let offBrowser = () => {};
      let shownPath = '';
      const redraw = () => {
        kb?.dispose();
        kb = null;
        hint();
        offBrowser();
        // selecting a file keeps the list where it is; a new folder starts at the top
        const keep = shownPath === path.join('/') ? (el.querySelector('[data-scroll]')?.scrollTop ?? 0) : 0;
        el.innerHTML = view();
        const sc = el.querySelector('[data-scroll]');
        shownPath = sc ? path.join('/') : '';
        if (sc) {
          sc.scrollTop = keep;
          hint = mountScrollHint(sc);
          offBrowser = mountFileBrowser(sc, {
            onUp: () => {
              path = path.slice(0, -1);
              selected = null;
              redraw();
            },
            onOpen: (name) => {
              path = [...path, name];
              selected = null;
              redraw();
            },
            onPick: (name) => {
              selected = selected === name ? null : name;
              redraw();
            },
          });
        } else {
          hint = () => {};
          offBrowser = () => {};
        }
        if (mode === 'name' && keys) openKeys();
      };

      const fieldText = () => {
        const host = el.querySelector('[data-name-field]');
        if (host) host.innerHTML = renderTextField({ value: stem, error: nameError(), wrap: true });
      };
      const openKeys = () => {
        kb = mountKeyboard(el.querySelector('[data-keys]'), {
          layout: 'lower',
          enterIcon: 'check',
          onInput: (k) => {
            if (stem.length >= NAME_MAX) return;
            if (FORBIDDEN.test(k) || k === ' ') return ctx.toast.reject(ctx.t('backup.nameError.chars'));
            stem += k;
            fieldText();
          },
          onBackspace: () => {
            stem = stem.slice(0, -1);
            fieldText();
          },
          onEnter: () => {
            keys = false;
            redraw();
          },
        });
      };

      const finish = (r) => {
        clearInterval(job?.timer);
        job = null;
        ctx.busy = null;
        result = r;
        mode = 'result';
        redraw();
      };

      const run = (op, file, onDone) => {
        mode = 'run';
        job = { op, file, progress: 0, phase: ctx.t(PHASES[op][0]) };
        ctx.busy = ctx.t('backup.busy');
        redraw();
        let tick = 0;
        const total = 22;
        job.timer = setInterval(() => {
          if (!usbIn()) {
            return finish({
              ok: false,
              title: ctx.t('backup.fail.pulled'),
              message: ctx.t(op === 'create' ? 'backup.fail.pulledCreate' : 'backup.fail.pulledLoad'),
              steps: [ctx.t('backup.step.plug'), ctx.t(op === 'create' ? 'backup.step.again' : 'backup.step.loadAgain')],
            });
          }
          tick++;
          job.progress = Math.min(1, tick / total);
          job.phase = ctx.t(PHASES[op][Math.min(2, Math.floor((tick / total) * 3))]);
          const root = el.querySelector('[data-backup-run]');
          if (root) updateProgress(root, { value: job.progress, phase: job.phase });
          if (tick >= total) finish(onDone());
        }, STEP_MS);
      };

      const doCreate = () => {
        const snap = makeSnapshot(kind, {
          params: ctx.store.get('params'),
          formats: ctx.store.get('formats'),
          paramsMeta: ctx.data?.params ?? [],
        });
        const file = makeFile(stem.trim(), snap, { device: device(), serial: serial() });
        const where = [...path];
        run('create', file, () => {
          ctx.store.replace('usb', writeFile(ctx.store.get('usb'), where, file));
          ctx.log('backup', `${kind === 'format' ? 'Format' : 'Backup'} written: ${where.join('/')}/${file.name}`);
          selected = file.name;
          return {
            ok: true,
            title: ctx.t(`backup.ok.create.${kind}`),
            message: ctx.t('backup.ok.createMsg', { name: file.name, folder: where.join(' › '), size: file.size }),
          };
        });
      };

      const doLoad = (file) => {
        run('load', file, () => {
          if (ctx.store.get('machine')?.state === 'run')
            return { ok: false, title: ctx.t('backup.fail.running'), message: ctx.t('backup.fail.runningMsg'), steps: [ctx.t('backup.step.stop'), ctx.t('backup.step.loadAgain')] };
          const diff = restoreDiff(file.data, ctx.store.get('params'));
          for (const [id, v] of Object.entries(diff)) ctx.store.setParam(id, v, { source: 'backup' });
          if (file.data?.kind === 'backup' && Array.isArray(file.data.formats)) ctx.store.replace('formats', file.data.formats);
          const n = Object.keys(diff).length;
          ctx.log('backup', `${file.data?.kind === 'format' ? 'Format' : 'Backup'} loaded: ${file.name} (${n} parameters changed)`, { changed: n });
          return {
            ok: true,
            title: ctx.t(`backup.ok.load.${file.data?.kind ?? 'backup'}`),
            message: ctx.t(n ? 'backup.ok.loadMsg' : 'backup.ok.loadSame', { n, name: file.name }),
          };
        });
      };

      redraw();

      // drive plugged in / pulled, level changes: redraw the browser (a running job checks itself)
      const offStore = ctx.store.subscribe(
        (s) => [s.machine?.usb, s.session.level].join('|'),
        () => {
          if (mode === 'browse') {
            if (!usbIn()) {
              path = [USB_ROOT];
              selected = null;
            }
            redraw();
          } else if (mode === 'name' && !usbIn()) {
            mode = 'browse';
            keys = false;
            path = [USB_ROOT];
            selected = null;
            redraw();
            ctx.toast.reject(ctx.t('backup.pulledWhileNaming'));
          }
        },
      );

      const offAction = onAction(el, {
        pickFirst: () => ctx.toast.reject(ctx.t('backup.pickHint')),
        createLocked: () => ctx.toast.reject(ctx.t('toast.needsLevel', { n: CREATE_LEVEL })),
        loadLocked: () => ctx.toast.reject(ctx.t('toast.needsLevel', { n: loadLevel })),
        create: () => {
          stem = defaultBackupName({ device: device(), serial: serial() });
          kind = 'backup';
          keys = false;
          mode = 'name';
          redraw();
        },
        editName: () => {
          if (keys) return;
          keys = true;
          redraw();
        },
        kind: (btn) => {
          kind = btn.dataset.kind;
          redraw();
        },
        cancelName: () => {
          mode = 'browse';
          redraw();
        },
        save: async () => {
          const err = validateName(stem);
          if (err) return ctx.toast.reject(ctx.t(`backup.nameError.${err}`));
          const name = `${stem.trim()}${KINDS[kind]}`;
          if (findFile(ctx.store.get('usb'), path, name)) {
            const ok = await confirmAction(ctx, {
              title: ctx.t('backup.overwriteTitle'),
              text: ctx.t('backup.overwriteBody', { name }),
              okLabel: ctx.t('backup.overwrite'),
              destructive: true,
            });
            if (!ok) return;
          }
          doCreate();
        },
        load: async () => {
          const file = findFile(ctx.store.get('usb'), path, selected);
          if (!file) return;
          const k = kindOf(file.name);
          const ok = await confirmAction(ctx, {
            title: ctx.t(`backup.loadTitle.${k}`),
            text: ctx.t(`backup.loadBody.${k}`, { name: file.name }),
            okLabel: ctx.t('backup.load'),
            destructive: true,
            whenStopped: true,
          });
          if (ok) doLoad(file);
        },
        done: () => {
          mode = 'browse';
          result = null;
          redraw();
        },
      });

      return () => {
        clearInterval(job?.timer);
        ctx.busy = null;
        kb?.dispose();
        hint();
        offBrowser();
        offStore();
        offAction();
      };
    },
  });
}
