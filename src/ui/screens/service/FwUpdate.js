/**
 * FW-Update (docx §8.10, plan P3-12): select a firmware file on the USB drive and install it.
 *
 *   select   The shared file browser filtered to firmware files (others greyed out). Beside / below
 *            it: the installed and the selected version side by side with what the step is
 *            (newer / older — a downgrade is allowed / the same), what happens during the update
 *            (machine stops, about two minutes, restart) and one primary "Install" (L3) with a
 *            confirmation; refused while the machine runs.
 *   update   Its own view without back navigation (title without back, ctx.busy): phase text and
 *            progress bar, "do not switch off or remove the USB drive".
 *   result   success → "Update successful" with the new version and "Restart machine" (still no
 *            back: the new firmware runs only after the restart); failure (image could not be
 *            written / drive removed) and rejected (signature not valid) with what to do next and
 *            "Back to files"; the installed version is kept in both.
 */
import { renderFileBrowser, mountFileBrowser } from '../../components/FileBrowser.js';
import { renderProgressResult, updateProgress } from '../../components/ProgressResult.js';
import { renderButton } from '../../components/Button.js';
import { confirmAction } from '../../components/ConfirmDialog.js';
import { mountScrollHint } from '../../components/ListRow.js';
import { icon } from '../../components/Icon.js';
import { canActNode } from '../../../core/access.js';
import { USB_ROOT, findFile } from '../../../core/backup.js';
import { listFirmware, firmwareInfo, direction, phaseAt } from '../../../core/firmware.js';
import { esc, cx, onAction } from '../../html.js';

const STEP_MS = 200;
const STEPS = 30;

export function render(ctx, info) {
  const { arg } = info;
  const node = ctx.node(arg);
  let path = [USB_ROOT, 'firmware'];
  let selected = null;
  let mode = 'select'; // select | update | result
  let job = null;
  let result = null;

  const usbIn = () => !!ctx.store.get('machine')?.usb;
  const installed = () => ctx.store.get('machine')?.identity ?? {};
  const pick = () => firmwareInfo(selected ? findFile(ctx.store.get('usb'), path, selected) : null);
  // the drive may not hold the default folder: fall back to the root
  if (!ctx.store.get('usb')?.folders?.[path.join('/')]) path = [USB_ROOT];

  // ---- select view -------------------------------------------------------------------------
  const versions = () => {
    const cur = installed();
    const f = pick();
    const dir = direction(cur.firmware, f?.version);
    const col = (label, version, sub, attr) => `
      <div class="flex-1 min-w-0 flex flex-col gap-1" ${attr}>
        <span class="t-caption text-muted">${esc(label)}</span>
        <span class="${cx('t-param text-title', version ? 'text-text' : 'text-faint/60')}" data-version>${esc(version ?? '—')}</span>
        <span class="text-label text-muted truncate">${esc(sub)}</span>
      </div>`;
    const tone = { upgrade: 'text-status-run-ink', downgrade: 'text-status-warning-ink', same: 'text-muted', unknown: 'text-muted' }[dir];
    return `
      <section class="card-border" data-versions data-direction="${dir}"><div class="p-4 flex flex-col gap-3">
        <div class="flex items-start gap-3">
          ${col(ctx.t('fw.installed'), cur.firmware, cur.firmwareDate ? ctx.t('fw.since', { date: fmtIso(cur.firmwareDate) }) : '', 'data-installed')}
          <span class="self-center text-faint shrink-0">${icon('chevron', { size: 28, stroke: 3 })}</span>
          ${col(ctx.t('fw.selected'), f?.version ?? null, f ? f.date : ctx.t('fw.none'), 'data-selected')}
        </div>
        <div class="${cx('flex items-center gap-2 text-label font-semibold', tone)}" data-direction-text>${dir === 'downgrade' ? icon('alarm', { size: 22, class: 'shrink-0' }) : ''}<span>${esc(ctx.t(`fw.dir.${dir}`))}</span></div>
      </div></section>`;
  };

  const panel = () => {
    const f = pick();
    const can = canActNode(node, ctx.level);
    return `
      <div class="flex flex-col gap-3 px-3 pt-2 pb-8 land:pb-3 land:pt-3 border-t border-line-soft land:border-t-0 land:w-[340px] land:shrink-0 land:overflow-y-auto" data-fw-panel>
        ${versions()}
        <p class="flex items-start gap-2 text-label text-muted leading-snug px-1" data-fw-note>${icon('help', { size: 22, class: 'shrink-0 mt-px' })}<span>${esc(ctx.t('fw.whatHappens'))}</span></p>
        <div class="${cx('grid', (!f || !can) && 'opacity-40')}">${renderButton({
          label: ctx.t('fw.install'),
          action: !f ? 'pickFirst' : can ? 'install' : 'installLocked',
          tone: 'primary',
          icon: can ? 'fwupdate' : 'lock',
        })}</div>
      </div>`;
  };

  const selectView = () => {
    if (!usbIn())
      return `<div class="flex-1 min-h-0 flex flex-col justify-center px-3" data-fw data-no-usb>${renderFileBrowser({ path, entries: [], usb: false })}</div>`;
    return `
      <div class="flex-1 min-h-0 flex flex-col land:flex-row" data-fw>
        <div class="scroll-hint flex-1 min-h-0 min-w-0">
          <div class="scroll-y h-full px-3 pt-3" data-scroll>${renderFileBrowser({ path, entries: listFirmware(ctx.store.get('usb'), path), selected })}</div>
        </div>
        ${panel()}
      </div>`;
  };

  // ---- update / result views -------------------------------------------------------------------
  const updateView = () => `
      <div class="flex-1 min-h-0 flex flex-col justify-center px-3" data-fw-update>
        ${renderProgressResult({
          state: 'running',
          title: ctx.t('fw.installing', { v: job.file.version }),
          phase: ctx.t(`fw.phase.${phaseAt(job.progress)}`),
          value: job.progress,
          warning: ctx.t('fw.dontSwitchOff'),
        })}
      </div>`;

  const resultView = () => `
      <div class="flex-1 min-h-0 overflow-y-auto flex flex-col px-3 py-3 [&>*]:my-auto" data-fw-result="${result.kind}">
        ${renderProgressResult({
          state: result.kind === 'success' ? 'success' : 'failure',
          title: result.title,
          message: result.message,
          steps: result.steps ?? [],
          actions:
            result.kind === 'success'
              ? [{ label: ctx.t('fw.restart'), action: 'restart', tone: 'primary' }]
              : [{ label: ctx.t('fw.backToFiles'), action: 'backToFiles', tone: 'secondary' }],
        })}
      </div>`;

  // ---- screen --------------------------------------------------------------------------------
  // set while show() swaps the view, so the old view's cleanup does not release ctx.busy
  let swapping = false;
  const show = () => {
    swapping = true;
    const locked = mode === 'update' || (mode === 'result' && result?.kind === 'success');
    ctx.busy = locked ? ctx.t(mode === 'update' ? 'fw.busy' : 'fw.restartFirst') : null;
    ctx.shell.setScreen({
      title: ctx.t(mode === 'select' ? `screen.${node.id}` : 'fw.title'),
      back: !locked,
      branch: node.branch,
      html: mode === 'update' ? updateView() : mode === 'result' ? resultView() : selectView(),
      mount: mode === 'select' ? mountSelect : mode === 'update' ? mountUpdate : mountResult,
    });
    swapping = false;
  };
  // leaving the screen any other way (auto log-off, a restart) never leaves navigation blocked
  const release = () => {
    if (!swapping) ctx.busy = null;
  };

  function mountSelect(el) {
    let hint = () => {};
    let offBrowser = () => {};
    let shownPath = '';
    const redraw = () => {
      hint();
      offBrowser();
      const keep = shownPath === path.join('/') ? (el.querySelector('[data-scroll]')?.scrollTop ?? 0) : 0;
      el.innerHTML = selectView();
      const sc = el.querySelector('[data-scroll]');
      shownPath = sc ? path.join('/') : '';
      hint = () => {};
      offBrowser = () => {};
      if (!sc) return;
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
    };
    redraw();
    const offStore = ctx.store.subscribe(
      (s) => [s.machine?.usb, s.session.level].join('|'),
      () => {
        if (!usbIn()) {
          path = [USB_ROOT];
          selected = null;
        }
        redraw();
      },
    );
    const offAction = onAction(el, {
      pickFirst: () => ctx.toast.reject(ctx.t('fw.pickHint')),
      installLocked: () => ctx.toast.reject(ctx.t('toast.needsLevel', { n: node.accessAction ?? 3 })),
      install: async () => {
        const f = pick();
        if (!f) return;
        const cur = installed().firmware;
        const dir = direction(cur, f.version);
        const ok = await confirmAction(ctx, {
          title: ctx.t('fw.confirmTitle', { v: f.version }),
          text: `${ctx.t('fw.confirmBody', { from: cur, to: f.version })}${dir === 'downgrade' ? ` ${ctx.t('fw.confirmDowngrade')}` : ''}`,
          okLabel: ctx.t('fw.install'),
          whenStopped: true,
        });
        if (!ok) return;
        job = { file: f, progress: 0, from: cur };
        mode = 'update';
        ctx.log('firmware', `Update started: ${cur} → ${f.version} (${f.name})`);
        show();
      },
    });
    return () => {
      hint();
      offBrowser();
      offStore();
      offAction();
    };
  }

  function mountUpdate(el) {
    let tick = 0;
    const end = (r) => {
      clearInterval(timer);
      result = r;
      mode = 'result';
      show();
    };
    const timer = setInterval(() => {
      const f = job.file;
      tick++;
      job.progress = Math.min(1, tick / STEPS);
      const phase = phaseAt(job.progress);
      // the signature is checked first: an invalid image never reaches the device
      if (!f.signed && job.progress > 0.12) {
        ctx.log('firmware', `Update rejected: signature of ${f.name} not valid`);
        return end({
          kind: 'rejected',
          title: ctx.t('fw.rejected'),
          message: ctx.t('fw.rejectedMsg', { name: f.name, v: job.from }),
          steps: [ctx.t('fw.step.official'), ctx.t('fw.step.copyAgain')],
        });
      }
      if (!usbIn() && phase !== 'verify') {
        ctx.log('firmware', `Update failed: USB drive removed`);
        return end({
          kind: 'failed',
          title: ctx.t('fw.failed'),
          message: ctx.t('fw.pulledMsg', { v: job.from }),
          steps: [ctx.t('fw.step.plug'), ctx.t('fw.step.again')],
        });
      }
      if (f.damaged && job.progress > 0.7) {
        ctx.log('firmware', `Update failed: ${f.name} could not be written`);
        return end({
          kind: 'failed',
          title: ctx.t('fw.failed'),
          message: ctx.t('fw.damagedMsg', { v: job.from }),
          steps: [ctx.t('fw.step.copyAgain'), ctx.t('fw.step.again')],
        });
      }
      const root = el.querySelector('[data-fw-update]');
      if (root) updateProgress(root, { value: job.progress, phase: ctx.t(`fw.phase.${phase}`) });
      if (tick >= STEPS) {
        const date = new Date().toISOString().slice(0, 10);
        ctx.store.set('settings', { firmware: { version: f.version, date } });
        ctx.store.set('machine', (m) => ({ ...m, identity: { ...m.identity, firmware: f.version, firmwareDate: date } }));
        ctx.store.setParam(702, f.version, { source: 'firmware' });
        ctx.log('firmware', `Update installed: ${job.from} → ${f.version}`);
        end({ kind: 'success', title: ctx.t('fw.success'), message: ctx.t('fw.successMsg', { v: f.version }) });
      }
    }, STEP_MS);
    return () => {
      clearInterval(timer);
      release();
    };
  }

  function mountResult(el) {
    const off = onAction(el, {
      restart: () => ctx.restart(),
      backToFiles: () => {
        mode = 'select';
        result = null;
        show();
      },
    });
    return () => {
      off();
      release();
    };
  }

  show();
}

function fmtIso(iso) {
  const [y, m, d] = String(iso).split('-');
  return d && m && y ? `${d}.${m}.${y}` : String(iso);
}
