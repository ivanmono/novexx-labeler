/**
 * Parameter list screen (plan P2-04, docx §3.2, §4.1, §7.1, §7.2): the rows of a `list` node from
 * menu-tree.json. Rows the level may not read are absent (§4.1), rows whose show condition is
 * false are absent without a layout break (§7.1), live values refresh in place when the
 * simulator writes them (§7.2), and a ParamID that appears on several screens is one value in
 * the store. Editors arrive with P2-05 … P2-11; toggles already flip in place (P2-05: immediate,
 * no confirmation).
 */
import { renderParamRow } from '../components/ParamRow.js';
import { renderGroupHeader } from '../components/GroupHeader.js';
import { canReadParam, canWriteParam, writeLevel } from '../../core/access.js';
import { parseCondition, evalCondition, conditionRefs } from '../../core/conditions.js';
import { formatParamValue, paramLabel } from '../format.js';
import { openEditor } from '../editors.js';
import { openHelp } from '../components/HelpModal.js';
import { esc, onAction } from '../html.js';

const READ_ONLY_CONTROLS = new Set(['display', 'state']);

/**
 * Row models for a list node at an access level: headers, rows and planned placeholders, in
 * tree order; unreadable and condition-hidden rows are left out.
 * @param {object} node  menu-tree list node
 * @param {{ level:number, getParam:(id)=>any, param:(id)=>object|undefined, label?:(p)=>string,
 *           value?:(p)=>string, favourites?:number[] }} env
 */
export function listRows(node, env) {
  const { level, getParam, param } = env;
  const label = env.label ?? ((p) => p.name);
  const value = env.value ?? ((p) => String(getParam(p.id) ?? ''));
  const favourites = new Set(env.favourites ?? []);
  const out = [];
  // rows under a group header are indented one level in the source data; the header already groups
  // them, so they line up with it and only nesting under another row counts as indent (DT-32)
  let underHeader = false;
  for (const item of node.items ?? []) {
    if (item.status === 'header') {
      out.push({ kind: 'header', label: item.label });
      underHeader = true;
      continue;
    }
    if (item.pid == null) {
      out.push({ kind: 'planned', label: item.label, indent: item.indent ?? 0 });
      continue;
    }
    const p = param(item.pid);
    if (!p || !canReadParam(p, level)) continue;
    if (p.cond && !evalCondition(parseCondition(p.cond), getParam)) continue;
    const action = p.control === 'action';
    const live = READ_ONLY_CONTROLS.has(p.control);
    const need = writeLevel(p);
    const readOnly = !action && (live || need == null);
    const locked = !action && !readOnly && !canWriteParam(p, level);
    const current = getParam(p.id);
    const changed =
      !action && !readOnly && p.default != null && String(current) !== String(p.default);
    out.push({
      kind: 'row',
      pid: p.id,
      label: label(p),
      value: action ? '' : value(p),
      indent: Math.max(0, (item.indent ?? 0) - (underHeader ? 1 : 0)),
      locked,
      readOnly,
      action,
      live,
      changed,
      favourite: favourites.has(p.id),
      help: true, // every parameter has a help text (placeholder until PID delivers them, docx §7.1)
      needLevel: locked ? need : null,
      param: p,
    });
  }
  // the last visible row of each card has no divider
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i].kind === 'row') {
      out[i].last = true;
      break;
    }
  }
  return out;
}

/** Parameter ids that decide which rows of this node are visible. */
export function conditionIds(node, param) {
  const ids = new Set();
  for (const item of node.items ?? []) {
    const p = item.pid != null ? param(item.pid) : null;
    if (p?.cond) for (const id of conditionRefs(parseCondition(p.cond))) ids.add(Number(id));
  }
  return ids;
}

/** Simulator commands behind the runtime action parameters (docx §7.2 Action). */
const COMMANDS = { Run: 'Run', Pause: 'Pause', Online: 'Online', Offline: 'Offline' };
/** Actions that move the machine confirm first (P2-10): start trigger, run, manual feed, tests. */
const CONFIRM_ACTIONS = new Set([2, 6, 7, 800, 803, 804, 805, 806, 807, 808]);

export function render(ctx, { arg }, nodeOverride = null) {
  const node = nodeOverride ?? ctx.node(arg);
  const env = () => ({
    level: ctx.level,
    getParam: ctx.store.getParam,
    param: ctx.param,
    label: (p) => paramLabel(ctx, p),
    value: (p) => formatParamValue(ctx, p),
    favourites: ctx.favourites(),
  });
  const condIds = conditionIds(node, ctx.param);
  const pidsOnScreen = new Set((node.items ?? []).map((i) => i.pid).filter((x) => x != null));

  const rowHtml = (r) =>
    r.kind === 'header'
      ? renderGroupHeader(r.label)
      : r.kind === 'planned'
        ? `<div class="flex items-center gap-3 px-4 min-h-touch-row text-muted"><span class="text-body truncate">${esc(r.label)}</span><span class="t-caption text-faint">${esc(ctx.t('list.planned'))}</span></div>`
        : renderParamRow(r);
  // Favourites (DT-25): one card per parameter, with the screen it lives on; no star (all are)
  const favRow = (r) => {
    // every screen the parameter appears on (Label Length: "Stop · Label"), coloured by the first
    const homes = (r.param.screens ?? []).map((id) => ctx.node(id)).filter(Boolean);
    const context = homes.length
      ? {
          label: homes.map((n) => ctx.t(`screen.${n.id}`)).join(' · '),
          branch: homes[0].branch ?? 'settings',
        }
      : null;
    return `<div class="card-border"><div class="py-1">${renderParamRow({ ...r, favourite: false, last: true, context })}</div></div>`;
  };

  const draw = () => {
    const rows = listRows(node, env());
    const links = (node.links ?? [])
      .map((l) => ctx.node(l.to))
      .filter((n) => n && ctx.canOpen(n))
      .map(
        (n) =>
          `<button type="button" class="pressable w-full text-left flex items-center gap-3 px-4 min-h-touch-row" data-action="goto" data-id="${esc(n.id)}">
            <span class="text-label text-muted">${esc(ctx.t('list.seeAlso'))}</span>
            <span class="text-body font-semibold flex-1 truncate text-branch-${esc(n.branch)}">${esc(ctx.t(`screen.${n.id}`))}</span>
            ${'<svg class="icon shrink-0 text-faint" width="22" height="22" aria-hidden="true"><use href="#icon-chevron"></use></svg>'}
          </button>`,
      )
      .join('');
    return `
      <div class="param-list flex-1 min-h-0 scroll-y p-4 flex flex-col gap-4" data-list="${esc(node.id)}" data-rows="${rows.filter((r) => r.kind === 'row').length}">
        ${
          rows.length && node.kind === 'favourites'
            ? `<div class="flex flex-col gap-3" data-rows-host>${rows
                .filter((r) => r.kind === 'row')
                .map(favRow)
                .join('')}</div>`
            : rows.length
              ? `<div class="card-border"><div class="py-1" data-rows-host>${rows.map(rowHtml).join('')}</div></div>`
              : `<div class="flex-1 grid place-items-center text-center text-muted text-body p-6" data-list-empty>${esc(ctx.t(node.emptyKey ?? 'list.empty'))}</div>`
        }
        ${links ? `<div class="card-border"><div class="py-1">${links}</div></div>` : ''}
      </div>`;
  };

  ctx.shell.setScreen({
    title: ctx.t(`screen.${node.id}`),
    back: true,
    branch: node.branch,
    html: draw(),
    mount(el) {
      const redraw = () => {
        const top = el.querySelector('.param-list')?.scrollTop ?? 0;
        el.innerHTML = draw();
        const list = el.querySelector('.param-list');
        if (list) list.scrollTop = top;
      };
      const dispose = onAction(el, {
        edit: (btn) => {
          const p = ctx.param(btn.dataset.pid);
          if (p) openEditor(ctx, p, btn);
        },
        locked: (btn) => ctx.toast.reject(ctx.t('toast.needsLevel', { n: btn.dataset.needLevel })),
        run: async (btn) => {
          const p = ctx.param(btn.dataset.pid);
          if (!p) return;
          if (CONFIRM_ACTIONS.has(p.id)) {
            const go = await ctx.modal.confirm({
              title: paramLabel(ctx, p),
              body: `<p>${esc(ctx.t('action.confirmMove'))}</p>`,
              okLabel: ctx.t('action.start'),
            });
            if (!go) return;
          }
          const ok =
            p.name === 'Alarm_Reset'
              ? (ctx.sim.resetAlarm(), true)
              : COMMANDS[p.name]
                ? ctx.sim.command(COMMANDS[p.name])
                : true; // the remaining actions have no simulator behaviour yet (P2-10)
          if (ok) ctx.toast.ok(paramLabel(ctx, p));
          else ctx.toast.reject(ctx.t('toast.rejected'));
        },
        goto: (btn) => ctx.goScreen(btn.dataset.id),
        help: (btn) => {
          const p = ctx.param(btn.dataset.helpFor);
          if (p) openHelp(ctx, p);
        },
      });
      const unsubs = [
        ctx.store.subscribe((s) => s.session.level, redraw),
        ctx.store.subscribe((s) => s.favourites, redraw),
        ctx.store.onAnyParam((id) => {
          const pid = Number(id);
          if (condIds.has(pid)) return redraw(); // rows appear or disappear
          if (!pidsOnScreen.has(pid)) return;
          const row = el.querySelector(`[data-row="${pid}"]`);
          const p = ctx.param(pid);
          if (!row || !p) return;
          // value in place; the changed-from-default marker needs the row's markup → redraw it
          const model = listRows(node, env()).find((r) => r.kind === 'row' && r.pid === pid);
          if (!model) return redraw();
          const wasChanged = row.dataset.changed === 'true';
          if (wasChanged !== !!model.changed) return redraw();
          const v = row.querySelector('[data-value]');
          if (v) v.textContent = model.value;
        }),
      ];
      return () => {
        dispose();
        unsubs.forEach((u) => u());
      };
    },
  });
}
