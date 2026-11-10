/**
 * Primary / secondary / danger button (docx §5.4 touch targets: 60 px high). Figma component set
 * `Button · Tone=secondary|primary|danger × Icon=yes|no`; the label is an override. Dialog buttons
 * inside the Modal keep their own markup (they belong to that set).
 */
import { icon } from './Icon.js';
import { esc, cx } from '../html.js';

const TONE = {
  secondary: 'bg-surface-2',
  primary: 'bg-brand text-on-brand',
  danger: 'bg-status-error text-white',
};

export function renderButton({
  label,
  action,
  tone = 'secondary',
  icon: iconName = null,
  iconStroke = null, // e.g. 3 for the bold confirm check (DT-65)
  extra = '',
}) {
  return `<button type="button" class="${cx('pressable h-touch rounded-md text-body font-semibold flex items-center justify-center gap-2', TONE[tone] ?? TONE.secondary, extra)}" data-action="${esc(action)}" data-cmp="Button" data-cmp-props="Tone=${tone},Icon=${iconName ? 'yes' : 'no'}">${iconName ? icon(iconName, { size: 24, ...(iconStroke ? { stroke: iconStroke } : {}) }) : ''}<span>${esc(label)}</span></button>`;
}
