/**
 * Progress / result view for long operations (docx §5.4 "Progress / result: running, success,
 * failure"; §8.9 backup, §8.10 FW-Update "own view with a progress bar, a success state and a
 * 'restart machine' state", "failure with what the user should do next"; plan P3-01).
 *
 *   - running: title, phase text, bar with percentage, optional warning ("do not remove the USB
 *     drive"). The screen hides Back while this shows (the caller's job: `ctx.shell` without back).
 *   - success: result line (e.g. the new firmware version) and the follow-up actions.
 *   - failure: what went wrong, a numbered "what to do next" list and the follow-up actions.
 *
 * Figma: `ProgressResult · State=running|success|failure`.
 */
import { icon } from './Icon.js';
import { renderProgressBar } from '../screens/StartupScreen.js';
import { renderButton } from './Button.js';
import { t } from '../../core/i18n.js';
import { esc, cx } from '../html.js';

/**
 * @param {{ state:'running'|'success'|'failure', title:string, phase?:string, value?:number,
 *           message?:string, warning?:string, steps?:string[],
 *           actions?:{ label:string, action:string, tone?:'primary'|'secondary'|'danger' }[] }} o
 */
export function renderProgressResult(o) {
  const {
    state,
    title,
    phase = '',
    value = 0,
    message = '',
    warning = '',
    steps = [],
    actions = [],
  } = o;
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  const badge =
    state === 'running'
      ? ''
      : `<span class="${cx('grid place-items-center size-20 rounded-pill', state === 'success' ? 'bg-status-run/20 text-status-run-ink' : 'bg-status-error/20 text-status-error-ink')}">${icon(state === 'success' ? 'check' : 'alarm', { size: 44 })}</span>`;
  const body =
    state === 'running'
      ? `<div class="w-full flex flex-col gap-2">
          <div class="flex items-baseline justify-between gap-3"><span class="text-body text-muted truncate" data-phase>${esc(phase)}</span><span class="t-param text-body-lg" data-pct>${pct} %</span></div>
          ${renderProgressBar({ value: pct / 100 })}
        </div>
        ${warning ? `<div class="w-full flex items-start gap-2 text-left text-label font-semibold text-status-warning-ink">${icon('alarm', { size: 24, class: 'shrink-0' })}<span>${esc(warning)}</span></div>` : ''}`
      : `${message ? `<p class="text-body text-text">${esc(message)}</p>` : ''}
        ${
          state === 'failure' && steps.length
            ? `<div class="w-full flex flex-col gap-2 text-left"><span class="t-caption text-muted">${esc(t('progress.nextSteps'))}</span><ol class="flex flex-col gap-1 list-decimal pl-6 text-body">${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>`
            : ''
        }`;
  const buttons = actions.length
    ? `<div class="w-full grid gap-3 ${actions.length > 1 ? 'grid-cols-2' : ''}">${actions.map((a) => renderButton({ label: a.label, action: a.action, tone: a.tone ?? 'secondary' })).join('')}</div>`
    : '';
  return `
    <div class="progress-result card-border card-border--strong w-full" data-progress="${state}" aria-live="polite" data-cmp="ProgressResult" data-cmp-props="State=${state}">
      <div class="flex flex-col items-center text-center gap-5 p-6">
        ${badge}
        <h2 class="text-title font-bold">${esc(title)}</h2>
        ${body}
        ${buttons}
      </div>
    </div>`;
}

/** Update a running view in place (no re-render, so the bar animates). */
export function updateProgress(root, { value, phase }) {
  const pct = Math.max(0, Math.min(100, Math.round((value ?? 0) * 100)));
  const bar = root.querySelector('[data-bar]');
  if (bar) bar.style.width = `${pct}%`;
  const p = root.querySelector('[data-pct]');
  if (p) p.textContent = `${pct} %`;
  if (phase != null) {
    const ph = root.querySelector('[data-phase]');
    if (ph) ph.textContent = phase;
  }
}
