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
  extra = '',
}) {
  return `<button type="button" class="${cx('pressable h-touch rounded-md text-body font-semibold flex items-center justify-center gap-2', TONE[tone] ?? TONE.secondary, extra)}" data-action="${esc(action)}" data-cmp="Button" data-cmp-props="Tone=${tone},Icon=${iconName ? 'yes' : 'no'}">${iconName ? icon(iconName, { size: 24 }) : ''}<span>${esc(label)}</span></button>`;
}
