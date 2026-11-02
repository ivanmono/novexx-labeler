/**
 * Paging control (docx §3.2 six tiles per page, §5.4 "Paging control"): previous / next arrows
 * and one dot per page. Positions first · middle · last disable the arrow that has nowhere to go.
 *
 * Figma component set `Pager · Position=first|middle|last`.
 */
import { icon } from './Icon.js';
import { t } from '../../core/i18n.js';
import { esc, cx } from '../html.js';

export function renderPager({ page, pages }) {
  if (pages <= 1) return '';
  const position = page === 0 ? 'first' : page === pages - 1 ? 'last' : 'middle';
  const arrow = (action, disabled, cls) =>
    `<button type="button" class="pressable size-touch-row grid place-items-center rounded-md text-chrome" data-action="${action}" ${disabled ? 'aria-disabled="true"' : ''} aria-label="${esc(t(`pager.${action}`))}">${icon('chevron', { size: 24, class: cls })}</button>`;
  const dots = Array.from(
    { length: pages },
    (_, i) =>
      `<span class="${cx('size-2.5 rounded-pill', i === page ? 'bg-brand' : 'bg-line')}" aria-hidden="true"></span>`,
  ).join('');
  return `<div class="pager flex items-center justify-center gap-4" role="navigation" aria-label="${esc(t('pager.label', { n: page + 1, m: pages }))}" data-cmp="Pager" data-cmp-props="Position=${position}">
      ${arrow('prev', page === 0, 'rotate-180')}
      <span class="flex items-center gap-2">${dots}</span>
      ${arrow('next', page === pages - 1, '')}
    </div>`;
}
