/**
 * USB / internal-storage file browser (docx §8.9 "path bar, folder rows, file rows, one level up";
 * "files that are not machine backups are greyed out or filtered"; §8.10 "same file browser
 * component, filtered to firmware files"; plan P3-01). Shared by Load/Store Backup (P3-11) and
 * FW-Update (P3-12).
 *
 * Built from the shared pieces: a path bar, ListRow rows (up and folders: nav; files: select with
 * size / date meta; foreign files disabled), the end-of-list marker, and the "no USB drive" empty
 * state (a placeholder, never an error dialog).
 *
 * Figma: `PathBar`; the rows are ListRow variants.
 */
import { icon } from './Icon.js';
import { renderListRow, renderListEnd } from './ListRow.js';
import { renderPlaceholder } from './Placeholder.js';
import { t } from '../../core/i18n.js';
import { esc, onAction } from '../html.js';

/** Path bar: storage icon and the folders from the root, last one emphasised. */
export function renderPathBar(path = []) {
  const parts = path
    .map(
      (p, i) =>
        `<span class="${i === path.length - 1 ? 'text-text font-semibold' : 'text-muted'}">${esc(p)}</span>`,
    )
    .join('<span class="text-faint" aria-hidden="true">›</span>');
  return `<div class="path-bar card-border" data-cmp="PathBar" data-cmp-props="State=default"><div class="flex items-center gap-3 px-4 h-touch-row">
      ${icon('folderopen', { size: 28, class: 'text-chrome shrink-0' })}
      <span class="flex-1 min-w-0 flex items-center gap-2 text-body truncate" data-path>${parts}</span>
    </div></div>`;
}

/**
 * @typedef {{ type:'folder'|'file', name:string, size?:string, date?:string, allowed?:boolean }} Entry
 * @param {{ path:string[], entries:Entry[]|null, selected?:string|null, usb?:boolean }} o
 *   `entries` null = still reading; `usb` false = no drive plugged in.
 */
export function renderFileBrowser({ path, entries, selected = null, usb = true }) {
  if (!usb) {
    return renderPlaceholder({
      kind: 'empty',
      icon: 'files',
      title: t('files.noUsb'),
      text: t('files.noUsbHint'),
    });
  }
  if (entries == null) return `${renderPathBar(path)}${renderPlaceholder({ kind: 'loading' })}`;
  const sorted = [...entries].sort((a, b) =>
    a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'folder' ? -1 : 1,
  );
  const rows = [];
  if (path.length > 1)
    rows.push({ kind: 'nav', title: t('files.up'), icon: 'back', action: 'up', id: '..' });
  for (const e of sorted) {
    if (e.type === 'folder') {
      rows.push({
        kind: 'nav',
        title: e.name,
        meta: t('files.folder'),
        icon: 'files',
        action: 'open',
        id: e.name,
      });
    } else {
      rows.push({
        kind: 'select',
        title: e.name,
        meta: [e.size, e.date].filter(Boolean).join(' · '),
        icon: 'recipe',
        action: 'pick',
        id: e.name,
        state: e.allowed === false ? 'disabled' : e.name === selected ? 'selected' : 'default',
      });
    }
  }
  const list = rows.length
    ? `<div class="card-border"><div class="py-1">${rows.map((r, i) => renderListRow({ ...r, last: i === rows.length - 1 })).join('')}</div></div>${renderListEnd()}`
    : renderPlaceholder({ kind: 'empty', icon: 'files', title: t('files.emptyFolder') });
  return `<div class="file-browser flex flex-col gap-3" data-file-browser>${renderPathBar(path)}${list}</div>`;
}

/**
 * Wire taps: `onUp()`, `onOpen(name)` for folders, `onPick(name)` for allowed files.
 * Disabled rows (foreign files) are greyed out and ignore taps (`onAction` skips `aria-disabled`).
 */
export function mountFileBrowser(host, { onUp, onOpen, onPick }) {
  return onAction(host, {
    up: () => onUp?.(),
    open: (btn) => onOpen?.(btn.dataset.id),
    pick: (btn) => onPick?.(btn.dataset.id),
  });
}
