/**
 * Help pop-up (docx §5.4 "Parameter info", §7.1, plan P2-11): opens over the list, which stays
 * visible behind the overlay; title up to 40 characters, body scrolls past 600; one tap on OK
 * returns. The pop-up is also where a parameter is marked as a favourite (plan P2-12), so the
 * row itself keeps a single action: edit.
 */
import { helpFor } from '../../core/help.js';
import { renderButton } from './Button.js';
import { paramLabel } from '../format.js';
import { esc, onAction } from '../html.js';

export function renderHelpBody(ctx, param, { favourite }) {
  const { body, placeholder } = helpFor(param, paramLabel(ctx, param));
  return `
    <div class="help flex flex-col gap-3" data-help="${param.id}">
      <p class="text-body whitespace-pre-line" data-help-body>${esc(body)}</p>
      ${placeholder ? `<p class="t-caption text-faint">${esc(ctx.t('help.placeholder'))}</p>` : ''}
      <div data-fav-host>${renderButton({
        label: ctx.t(favourite ? 'favourites.remove' : 'favourites.add'),
        action: 'toggleFavourite',
        tone: 'secondary',
      })}</div>
    </div>`;
}

export function openHelp(ctx, param) {
  const { title } = helpFor(param, paramLabel(ctx, param));
  return ctx.modal.help({
    title,
    body: renderHelpBody(ctx, param, { favourite: ctx.isFavourite(param.id) }),
    mount(body) {
      // the body scrolls past ~600 characters (docx §7.1): cap it at 45 % of the device height
      body.style.maxHeight = `${Math.round((ctx.shell.root?.clientHeight ?? 800) * 0.45)}px`;
      return onAction(body, {
        toggleFavourite: () => {
          ctx.toggleFavourite(param.id);
          body.querySelector('[data-fav-host]').innerHTML = renderButton({
            label: ctx.t(ctx.isFavourite(param.id) ? 'favourites.remove' : 'favourites.add'),
            action: 'toggleFavourite',
            tone: 'secondary',
          });
        },
      });
    },
  });
}
