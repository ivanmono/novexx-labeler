/**
 * Menu tile (docx §5.4 "Menu tile", §6.1 colour code): icon in the branch colour, label on up to
 * two lines, optional sub-line. States default · pressed (`.pressable`) · disabled (option not
 * installed, docx §5.4). A tile that opens a screen from another place in the tree (docx §6.2
 * linked paths) carries the target's home branch colour and names the other entry point, so the
 * same screen never looks like two.
 *
 * Figma component set `MenuTile · State=default|disabled × Link=no|yes`.
 */
import { icon } from './Icon.js';
import { esc, cx } from '../html.js';

/**
 * @param {{ id:string, title:string, subtitle?:string|null, icon:string, branch:string,
 *           disabled?:boolean, link?:string|null }} tile
 */
export function renderMenuTile(tile) {
  const { id, title, subtitle, icon: iconName, branch, disabled = false, link = null } = tile;
  return `<button type="button" class="${cx('menu-tile card-border card-border--surface pressable text-left min-h-[120px]')}" data-action="open" data-id="${esc(id)}" ${disabled ? 'aria-disabled="true"' : ''} data-cmp="MenuTile" data-cmp-props="State=${disabled ? 'disabled' : 'default'},Link=${link ? 'yes' : 'no'}">
      <div class="p-3 min-h-[118px] flex flex-col gap-2">
        <span class="flex items-center justify-between">
          ${icon(iconName || 'tbd', { size: 32, class: `text-branch-${esc(branch || 'settings')} shrink-0` })}
          ${link ? icon('chevron', { size: 18, class: 'text-faint -rotate-90' }) : ''}
        </span>
        <span class="flex flex-col gap-0.5 min-w-0">
          <span class="block text-body-lg font-semibold leading-tight line-clamp-2 break-words">${esc(title).replace(/\//g, '/\u200B')}</span>
          ${subtitle ? `<span class="block text-label text-muted truncate">${esc(subtitle)}</span>` : ''}
        </span>
      </div>
    </button>`;
}
