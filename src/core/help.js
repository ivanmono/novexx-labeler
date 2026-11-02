/**
 * Parameter help texts (docx §7.1: title up to 40 characters, body up to 600, longer bodies
 * scroll). PID has not delivered the texts yet, so every parameter gets a placeholder: its facts
 * (range, default, access levels) followed by filler whose length varies per parameter, so the
 * short, the full and the overlong case all exist in the prototype.
 */
import { t, fmtNumber } from './i18n.js';

const FILLER =
  'This text stands in for the help PID will deliver. It explains what the parameter does, ' +
  'when it applies and what to check before changing it. Lines wrap, the body scrolls when it ' +
  'runs past the pop-up. ';

/** Deterministic target length per parameter: 120 … 720 characters. */
export function placeholderLength(pid) {
  return 120 + ((Number(pid) * 37) % 601);
}

/** Title (≤ 40 characters) and body for a parameter. */
export function helpFor(param, label) {
  const title = label.length > 40 ? `${label.slice(0, 39)}…` : label;
  const facts = [];
  if (param.min != null && param.max != null)
    facts.push(
      t('help.range', {
        min: fmtNumber(param.min),
        max: fmtNumber(param.max),
        unit: param.unit ?? '',
      }).trim(),
    );
  if (param.default != null && param.control !== 'action')
    facts.push(t('help.default', { v: String(param.default) }));
  if (typeof param.accessRead === 'number')
    facts.push(
      t('help.access', {
        r: param.accessRead,
        w: typeof param.accessWrite === 'number' ? param.accessWrite : '–',
      }),
    );
  const head = facts.join(' · ');
  const target = placeholderLength(param.id);
  let body = `${head}\n\n`;
  while (body.length < target) body += FILLER;
  body = body.slice(0, Math.max(target, head.length + 2)).replace(/\s+\S*$/, '.');
  return { title, body, placeholder: true };
}
