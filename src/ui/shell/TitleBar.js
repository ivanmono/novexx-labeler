/**
 * Title bar (docx §5.4): title with optional back control, long titles truncated.
 * The branch colour on the bar's left edge identifies the main-menu branch a screen belongs to
 * (docx §6.1, DT-24), which also makes a cross-linked screen look like one screen, not two.
 */
import { icon } from '../components/Icon.js';
import { t } from '../../core/i18n.js';
import { esc, cx } from '../html.js';

export function renderTitleBar({ title, back = true, branch = null, subtitle = null, right = '' }) {
  return `
  <header class="${cx('title-bar h-title shrink-0 flex items-center gap-2 px-3 border-b border-line-soft', branch && `border-l-[6px] border-l-branch-${esc(branch)}`)}" data-cmp="TitleBar" data-cmp-props="Back=${back ? 'yes' : 'no'},Subtitle=${subtitle ? 'yes' : 'no'},Branch=${esc(branch ?? 'none')}">
    ${back ? `<button type="button" class="pressable h-title w-touch -ml-3 grid place-items-center rounded-md text-chrome" data-action="back" aria-label="${esc(t('nav.back'))}">${icon('back', { size: 32 })}</button>` : '<span class="w-2"></span>'}
    <div class="min-w-0 flex-1">
      <h1 class="title-bar__title text-title font-bold truncate leading-tight">${esc(title)}</h1>
      ${subtitle ? `<div class="text-label text-muted truncate">${esc(subtitle)}</div>` : ''}
    </div>
    <div class="${cx('title-bar__right flex items-center gap-1 shrink-0')}">${right}</div>
  </header>`;
}
