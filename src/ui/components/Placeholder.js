/**
 * Screen placeholders (docx §5.4 "Screen placeholders: nothing stored yet, data loading, data could
 * not be read"; §8 "each screen also has to be designed for the moments when it has nothing to show —
 * no format stored yet, the USB drive not plugged in, the log still empty, data being read"; §8.9
 * "no USB drive is an empty state, not an error dialog"; plan P3-01).
 *
 *   - empty:   icon, what is missing, how to get it (optional action)
 *   - loading: spinner and "Reading data…" (static ring when the system asks for reduced motion)
 *   - error:   alarm icon, what failed, a retry action
 *
 * Figma: `Placeholder · Kind=empty|loading|error`.
 */
import { icon } from './Icon.js';
import { renderButton } from './Button.js';
import { t } from '../../core/i18n.js';
import { esc, cx } from '../html.js';

/**
 * @param {{ kind?:'empty'|'loading'|'error', icon?:string, title?:string, text?:string,
 *           action?:{ label:string, action:string, tone?:string }|null }} o
 */
export function renderPlaceholder(o = {}) {
  const { kind = 'empty', icon: iconName = 'files', title, text = '', action = null } = o;
  const heading =
    title ??
    t(kind === 'loading' ? 'list.loading' : kind === 'error' ? 'list.readError' : 'list.empty');
  const act =
    action ??
    (kind === 'error' ? { label: t('action.retry'), action: 'retry', tone: 'secondary' } : null);
  const mark =
    kind === 'loading'
      ? '<span class="placeholder__spinner" aria-hidden="true"></span>'
      : `<span class="${cx('grid place-items-center size-24 rounded-pill', kind === 'error' ? 'bg-status-error/15 text-status-error-ink' : 'bg-surface-2 text-chrome')}">${icon(kind === 'error' ? 'alarm' : iconName, { size: 48 })}</span>`;
  return `
    <div class="placeholder flex flex-col items-center justify-center text-center gap-4 p-6" role="status" data-placeholder="${kind}" data-cmp="Placeholder" data-cmp-props="Kind=${kind}">
      ${mark}
      <div class="flex flex-col gap-1 max-w-[360px]">
        <h2 class="text-body-lg font-bold">${esc(heading)}</h2>
        ${text ? `<p class="text-body text-muted">${esc(text)}</p>` : ''}
      </div>
      ${act ? `<div class="w-full max-w-[320px] grid">${renderButton({ label: act.label, action: act.action, tone: act.tone ?? 'primary' })}</div>` : ''}
    </div>`;
}
