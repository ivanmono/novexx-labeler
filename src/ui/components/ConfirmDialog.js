/**
 * The one confirmation pattern (docx §5.4 "Confirmation dialog: normal, destructive", §8 "destructive
 * actions follow one shared confirmation pattern", plan P3-01). Every machine-changing or destructive
 * action asks through here, so they all look and behave the same:
 *
 *   - normal: the Modal in its confirm kind, brand OK button
 *   - destructive: red OK button and the "cannot be undone" line (Modal · Destructive=yes)
 *   - whenStopped: refused with a toast while the machine is running, the dialog does not open
 *     (Select / Load Format, Load Backup, FW-Update, docx §8.1, §8.9, §8.10)
 *
 * The Figma counterpart is the Modal set (Kind=confirm × Destructive); no set of its own.
 */
import { esc } from '../html.js';

/**
 * @param {object} ctx
 * @param {{ title:string, body?:string, text?:string, okLabel?:string, cancelLabel?:string,
 *           destructive?:boolean, whenStopped?:boolean }} opts
 *   `body` is HTML (escape it yourself); `text` is plain text and is escaped here.
 * @returns {Promise<boolean>} true when confirmed
 */
export async function confirmAction(ctx, opts) {
  const {
    title,
    body,
    text,
    okLabel,
    cancelLabel,
    destructive = false,
    whenStopped = false,
  } = opts;
  if (whenStopped && ctx.store.get('machine')?.state === 'run') {
    ctx.toast.reject(ctx.t('toast.machineRunning'));
    return false;
  }
  return ctx.modal.confirm({
    title,
    body: body ?? (text ? `<p>${esc(text)}</p>` : ''),
    okLabel,
    cancelLabel,
    destructive,
  });
}
